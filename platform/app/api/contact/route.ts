import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/utils/supabase/service';
import { getAuthenticatedUser, hasFullAccess } from '../auth-helpers';

const EXTERNAL_API_URL = 'https://key-legal-tahr.ngrok-free.app/api/send-message';
const EXTERNAL_API_KEY = '1234567890';

type ContactRequestBody = {
  patientId?: string;
  phone?: string;
  message?: string;
};

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Only staff can send contact messages
    if (!hasFullAccess(authUser)) {
      return NextResponse.json(
        { error: 'Forbidden. Only staff can send contact messages.' },
        { status: 403 }
      );
    }

    let payload: ContactRequestBody;
    try {
      payload = (await request.json()) as ContactRequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { patientId, phone, message } = payload;

    if (!patientId || !phone || !message) {
      return NextResponse.json(
        { error: 'patientId, phone, and message are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Fetch the most recent appointment for this patient
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, scheduled_at, status, type')
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: false })
      .limit(1);

    if (appointmentError) {
      console.error('[api/contact] Error fetching appointments:', appointmentError);
      return NextResponse.json(
        { error: 'Error fetching appointment data' },
        { status: 500 }
      );
    }

    const mostRecentAppointment = appointments?.[0];
    const appointmentId = mostRecentAppointment?.id || 'no_appointment';
    const scheduledAt = mostRecentAppointment?.scheduled_at || new Date().toISOString();

    // Clean phone number (remove any non-digit characters except +)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Send message to external API
    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': EXTERNAL_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: message,
        message_type: 'text',
        metadata: {
          source: 'daily_checkup',
          reference_id: appointmentId,
          triggered_by: authUser.email || authUser.id,
          scheduled_at: scheduledAt,
        },
      }),
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error('[api/contact] External API error:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to send message',
          details: errorText 
        },
        { status: 500 }
      );
    }

    const result = await externalResponse.json();

    return NextResponse.json({
      success: true,
      data: {
        messageStatus: result,
        appointment: mostRecentAppointment,
      },
    });
  } catch (error) {
    console.error('[api/contact] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error sending contact message' },
      { status: 500 }
    );
  }
}

