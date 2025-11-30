import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/utils/supabase/service';
import { getAuthenticatedUser, isDoctor, hasFullAccess } from '../auth-helpers';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

    // Only doctors and staff can upload files
    if (!isDoctor(authUser) && !hasFullAccess(authUser)) {
      return NextResponse.json(
        { error: 'Forbidden. Only doctors and staff can upload files.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const appointmentId = formData.get('appointmentId') as string | null;
    const category = formData.get('category') as string | null; // 'paraclinic' or 'plan'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'appointmentId is required' },
        { status: 400 }
      );
    }

    if (!category || !['paraclinic', 'plan'].includes(category)) {
      return NextResponse.json(
        { error: 'category must be either "paraclinic" or "plan"' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Verify appointment exists and doctor has access
    if (isDoctor(authUser)) {
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('id, doctor_id')
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      if (appointment.doctor_id !== authUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You can only upload files for your own appointments.' },
          { status: 403 }
        );
      }
    }

    // Generate unique file name
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'bin';
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${appointmentId}_${category}_${timestamp}_${sanitizedFileName}`;
    const filePath = `${category}s/${appointmentId}/${uniqueFileName}`;

    // Get bucket name from environment variable
    const bucketId = process.env.SUPABASE_BUCKET_ID;
    if (!bucketId) {
      return NextResponse.json(
        { error: 'Storage bucket not configured. Please set SUPABASE_BUCKET_ID environment variable.' },
        { status: 500 }
      );
    }

    // Convert File to ArrayBuffer, then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketId)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketId)
      .getPublicUrl(filePath);

    return NextResponse.json({
      data: {
        fileName: uniqueFileName,
        fileUrl: urlData.publicUrl,
        filePath: filePath,
        fileSize: file.size,
        fileType: file.type,
        appointmentId,
        category,
      },
      meta: {
        action: 'uploaded',
        uploadedBy: authUser.id,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[api/upload] Error uploading file', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error uploading file.' },
      { status: 500 }
    );
  }
}

