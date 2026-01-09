-- Remove the insecure public upload policy
DROP POLICY IF EXISTS "Anyone can upload product images" ON storage.objects;

-- Create admin-only upload policy for product images
CREATE POLICY "Only admins can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create admin-only update policy for product images
CREATE POLICY "Only admins can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' 
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'products' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create admin-only delete policy for product images
CREATE POLICY "Only admins can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' 
  AND public.has_role(auth.uid(), 'admin')
);