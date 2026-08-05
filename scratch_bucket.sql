INSERT INTO storage.buckets (id, name, public) VALUES ('marketing_assets', 'marketing_assets', true) ON CONFLICT DO NOTHING;
CREATE POLICY "marketing_assets_public_insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'marketing_assets');
CREATE POLICY "marketing_assets_public_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'marketing_assets');
