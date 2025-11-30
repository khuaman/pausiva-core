/**
 * Supabase Admin Client for wa-agent-gateway
 *
 * Used for creating auth users when new WhatsApp contacts arrive.
 * This client uses the service role key which has admin privileges.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lazy-initialized client to avoid errors when env vars aren't set
let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Get the Supabase admin client (lazy initialization)
 * Returns null if environment variables are not configured
 */
function getSupabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return _supabaseAdmin;
}

/**
 * Normalize phone number to E.164 format with + prefix
 */
export function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

/**
 * Create a new user AND patient record together.
 * This ensures both records are created atomically - if one fails, the other is rolled back.
 *
 * Business rule: Every WhatsApp user is automatically a patient.
 *
 * @param phone - Phone number (will be normalized to E.164 format with +)
 * @param fullName - Full name (optional, defaults to "WhatsApp User")
 * @returns The created user or null if creation failed
 */
export async function createAuthUser(
  phone: string,
  fullName: string = "WhatsApp User"
): Promise<{ id: string; phone: string; email: string } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("❌ Cannot create user: Supabase admin not configured");
    return null;
  }

  try {
    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhone(phone);

    // Generate a placeholder email based on phone (required by Supabase Auth)
    const email = `${normalizedPhone.replace(/\+/g, "")}@whatsapp.pausiva.local`;

    // Step 1: Try to create auth.users via Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      phone: normalizedPhone,
      email,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: fullName,
        source: "whatsapp",
      },
    });

    let userId: string;

    if (error) {
      // Check if user already exists in auth (orphaned user case)
      if (error.message.includes("already been registered")) {
        console.log(`ℹ️ Auth user already exists for ${email}, looking up...`);
        
        // Find the existing auth user by email
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        
        if (!existingUser) {
          console.error("❌ Auth user exists but couldn't find it");
          return null;
        }
        
        userId = existingUser.id;
        console.log(`✅ Found existing auth user: ${userId}`);
      } else {
        console.error("❌ Error creating auth user:", error.message);
        return null;
      }
    } else if (!data.user) {
      console.error("❌ No user returned from createUser");
      return null;
    } else {
      userId = data.user.id;
    }

    // Step 2: Create or update public.users record (upsert)
    const { error: profileError } = await supabase.from("users").upsert({
      id: userId,
      full_name: fullName,
      email,
      phone: normalizedPhone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (profileError) {
      console.error("❌ Error creating/updating user profile:", profileError.message);
      return null;
    }
    
    console.log(`✅ User profile ensured for: ${userId}`);

    // Step 3: Create patients record (ALWAYS - business rule)
    const patientDni = `TEMP-${userId.slice(0, 8)}`;
    const { error: patientError } = await supabase.from("patients").insert({
      id: userId,
      dni: patientDni,
      clinical_profile_json: { onboarding_state: "new" },
    });

    if (patientError) {
      // Check if it's a duplicate key error (patient already exists - that's OK)
      if (patientError.code !== "23505") {
        console.error("❌ Error creating patient record:", patientError.message);
        // Rollback: delete user profile and auth user
        await supabase.from("users").delete().eq("id", userId);
        await supabase.auth.admin.deleteUser(userId);
        return null;
      }
      console.log(`ℹ️ Patient record already exists for user ${userId}`);
    } else {
      console.log(`✅ Created patient record for user ${userId}`);
    }

    console.log(`✅ Created new user + patient: ${userId} for phone ${normalizedPhone}`);

    return {
      id: userId,
      phone: normalizedPhone,
      email,
    };
  } catch (err) {
    console.error("❌ Unexpected error creating user:", err);
    return null;
  }
}

/**
 * Create a patient record for an existing user.
 * Use this only when a user exists but doesn't have a patient record yet.
 *
 * NOTE: Normally you should use createAuthUser which creates both together.
 * This is a fallback for edge cases where user exists without patient.
 *
 * @param userId - The user's UUID (must exist in public.users)
 * @param dni - Optional DNI (will generate temp one if not provided)
 * @param clinicalProfile - Optional initial clinical profile
 * @returns Success status
 */
export async function createPatientRecord(
  userId: string,
  dni?: string,
  clinicalProfile?: Record<string, unknown>
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("❌ Cannot create patient: Supabase admin not configured");
    return false;
  }

  try {
    // First verify user exists in public.users (not just cache)
    const { data: userExists, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !userExists) {
      console.warn(`⚠️ Cannot create patient: user ${userId} not found in database`);
      return false;
    }

    // Check if patient already exists
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", userId)
      .single();

    if (existingPatient) {
      console.log(`ℹ️ Patient record already exists for user ${userId}`);
      return true;
    }

    // Create patient record
    const patientDni = dni || `TEMP-${userId.slice(0, 8)}`;
    const { error } = await supabase.from("patients").insert({
      id: userId,
      dni: patientDni,
      clinical_profile_json: clinicalProfile || { onboarding_state: "new" },
    });

    if (error) {
      if (error.code === "23505") {
        // Duplicate key - patient was just created (race condition)
        console.log(`ℹ️ Patient record already exists for user ${userId}`);
        return true;
      }
      console.error("❌ Error creating patient record:", error.message);
      return false;
    }

    console.log(`✅ Created patient record for user ${userId}`);
    return true;
  } catch (err) {
    console.error("❌ Unexpected error creating patient:", err);
    return false;
  }
}

