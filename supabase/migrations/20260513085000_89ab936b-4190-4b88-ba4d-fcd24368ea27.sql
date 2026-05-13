
-- Submissions table
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code6 text NOT NULL UNIQUE,
  full_name text NOT NULL,
  username1 text NOT NULL,
  username2 text NOT NULL,
  photo_path text NOT NULL,
  qr_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
-- No policies: only service-role (server functions) may access. RLS denies all client access.

-- Storage buckets (public so verification page and QR <img> tags load directly)
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('qrcodes', 'qrcodes', true);

-- Storage policies: only service role can write; anyone can read (public buckets).
CREATE POLICY "Public read photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Public read qrcodes" ON storage.objects FOR SELECT USING (bucket_id = 'qrcodes');
