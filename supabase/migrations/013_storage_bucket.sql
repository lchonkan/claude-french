-- Migration 013: Audio storage bucket for pronunciation recordings
--
-- Creates a private Supabase Storage bucket for audio files with:
-- - 50 MB file size limit
-- - Restricted MIME types (WAV, WebM, MP4, MPEG audio)
-- - RLS policies ensuring users can only access their own audio folder

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  false,
  52428800,
  ARRAY['audio/wav', 'audio/webm', 'audio/mp4', 'audio/mpeg']
);

-- Users can upload audio into their own folder (user_id/...)
CREATE POLICY "Users can upload own audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read audio from their own folder
CREATE POLICY "Users can read own audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own audio files
CREATE POLICY "Users can delete own audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
