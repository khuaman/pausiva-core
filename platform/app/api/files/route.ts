import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/utils/supabase/service';
import { getAuthenticatedUser, isDoctor, hasFullAccess } from '../auth-helpers';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const category = searchParams.get('category'); // 'paraclinic' or 'plan'

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

    const supabase = getServiceSupabaseClient();

    // Verify appointment exists and user has access
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, patient_id, doctor_id')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    // Staff has full access - skip checks
    if (!hasFullAccess(authUser)) {
      if (isDoctor(authUser)) {
        // Doctors can only access files for appointments where they are assigned
        if (appointment.doctor_id !== authUser.id) {
          return NextResponse.json(
            { error: 'Forbidden. You can only access files for your own appointments.' },
            { status: 403 }
          );
        }
      } else {
        // Patients can only see their own files
        if (appointment.patient_id !== authUser.id) {
          return NextResponse.json(
            { error: 'Forbidden. You can only access your own files.' },
            { status: 403 }
          );
        }
      }
    }

    // Get bucket name from environment variable
    const bucketId = process.env.SUPABASE_BUCKET_ID;
    if (!bucketId) {
      return NextResponse.json({
        data: [],
        meta: {
          appointmentId,
          category,
          count: 0,
        },
      });
    }

    // Try to verify bucket exists by listing root folder
    const { error: bucketCheckError } = await supabase.storage
      .from(bucketId)
      .list('', { limit: 1 });

    if (bucketCheckError) {
      console.error('Bucket check error:', bucketCheckError);
      // If bucket doesn't exist, return empty array
      const errorMessage = bucketCheckError.message || String(bucketCheckError);
      if (
        errorMessage.includes('not found') ||
        errorMessage.includes('Bucket not found')
      ) {
        return NextResponse.json({
          data: [],
          meta: {
            appointmentId,
            category,
            count: 0,
          },
        });
      }
    }

    // List files in the category folder for this appointment
    const folderPath = `${category === 'paraclinic' ? 'paraclinics' : 'plans'}/${appointmentId}`;
    
    const { data: files, error: listError } = await supabase.storage
      .from(bucketId)
      .list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (listError) {
      console.error('List files error:', listError);
      // If folder doesn't exist, return empty array (this is normal)
      const errorMessage = listError.message || String(listError);
      if (
        errorMessage.includes('not found') ||
        errorMessage.includes('Bucket not found')
      ) {
        return NextResponse.json({
          data: [],
          meta: {
            appointmentId,
            category,
            count: 0,
          },
        });
      }
      return NextResponse.json(
        { error: `Failed to list files: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Generate signed URLs for each file (works with private buckets)
    const filesWithUrls = await Promise.all(
      (files || []).map(async (file) => {
        const filePath = `${folderPath}/${file.name}`;
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(bucketId)
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (signedUrlError) {
          console.error('Error creating signed URL for', filePath, signedUrlError);
          // If bucket doesn't exist, skip this file
          const errorMessage = signedUrlError.message || String(signedUrlError);
          if (
            errorMessage.includes('not found') ||
            errorMessage.includes('Bucket not found')
          ) {
            return null;
          }
          // Fallback to public URL if signed URL fails for other reasons
          const { data: urlData } = supabase.storage
            .from(bucketId)
            .getPublicUrl(filePath);
          
          return {
            name: file.name,
            path: filePath,
            url: urlData.publicUrl,
            size: file.metadata?.size || null,
            createdAt: file.created_at,
            updatedAt: file.updated_at,
          };
        }

        return {
          name: file.name,
          path: filePath,
          url: signedUrlData.signedUrl,
          size: file.metadata?.size || null,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
        };
      })
    );

    // Filter out null values (files that couldn't be accessed)
    const validFiles = filesWithUrls.filter((file): file is NonNullable<typeof file> => file !== null);

    return NextResponse.json({
      data: validFiles,
      meta: {
        appointmentId,
        category,
        count: validFiles.length,
      },
    });
  } catch (error) {
    console.error('[api/files] Error listing files', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error listing files.' },
      { status: 500 }
    );
  }
}

