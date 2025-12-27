/**
 * Patient Portal Helper Functions
 * Functions for fetching patient portal data and managing uploads
 */

import { getSupabaseClient } from './supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PatientPortalData {
  link_id: string;
  patient_id: string;
  linked_at: string;
  lead_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  treatment_type: string | null;
  lead_created_at: string;
  lead_status: string | null;
  lead_source: string | null;
}

export interface PatientFile {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  metadata: {
    size?: number;
    mimetype?: string;
  };
}

const BUCKET_NAME = 'patient_uploads';

/**
 * Get patient portal data (linked lead info)
 * Returns null if patient has no linked lead
 */
export async function getPatientPortalData(): Promise<PatientPortalData | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('Not authenticated');
  }

  // Query using the view (RLS will filter to only this patient's data)
  const { data, error } = await supabase
    .from('patient_portal_data')
    .select('*')
    .single();

  if (error) {
    // If no rows found, patient has no linked lead yet
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data as PatientPortalData;
}

/**
 * Get list of uploaded files for the current patient
 */
export async function getPatientFiles(): Promise<PatientFile[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('Not authenticated');
  }

  const userId = session.session.user.id;
  const folderPath = `patient/${userId}/`;

  // List files in patient's folder
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    // If folder doesn't exist yet, return empty array
    if (error.message.includes('not found')) {
      return [];
    }
    throw error;
  }

  // Transform to our format
  return (data || []).map((file) => ({
    name: file.name,
    id: file.id,
    created_at: file.created_at || '',
    updated_at: file.updated_at || file.created_at || '',
    metadata: file.metadata || {},
  }));
}

/**
 * Upload a file to patient's folder
 * Returns the public URL (or signed URL if bucket is private)
 */
export async function uploadPatientFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('Not authenticated');
  }

  const userId = session.session.user.id;
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `patient/${userId}/${timestamp}_${sanitizedName}`;

  // Upload file with progress tracking
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false, // Don't overwrite existing files
    });

  if (error) {
    throw error;
  }

  if (!data?.path) {
    throw new Error('Upload succeeded but no path returned');
  }

  // Get public URL (if bucket is public) or create signed URL (if private)
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  const publicUrl = urlData.publicUrl;

  // If bucket is private, generate a signed URL (valid for 1 hour)
  let signedUrl = publicUrl;
  try {
    const { data: signedData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 3600);
    if (signedData?.signedUrl) {
      signedUrl = signedData.signedUrl;
    }
  } catch (e) {
    // If signed URL fails, use public URL
    console.warn('Failed to create signed URL, using public URL:', e);
  }

  return {
    path: data.path,
    publicUrl: signedUrl,
  };
}

/**
 * Delete a patient file
 */
export async function deletePatientFile(filePath: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('Not authenticated');
  }

  // Verify file path belongs to current user (security check)
  const userId = session.session.user.id;
  if (!filePath.startsWith(`patient/${userId}/`)) {
    throw new Error('Unauthorized: File path does not belong to current user');
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    throw error;
  }
}

/**
 * Get download URL for a file (signed if bucket is private)
 */
export async function getPatientFileUrl(filePath: string): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('Not authenticated');
  }

  // Verify file path belongs to current user (security check)
  const userId = session.session.user.id;
  if (!filePath.startsWith(`patient/${userId}/`)) {
    throw new Error('Unauthorized: File path does not belong to current user');
  }

  // Try to get signed URL first (for private buckets)
  const { data: signedData } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  // Fallback to public URL
  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}

