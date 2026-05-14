ALTER TABLE public.submissions RENAME COLUMN code7 TO code6;
ALTER TABLE public.submissions ALTER COLUMN qr_path DROP NOT NULL;