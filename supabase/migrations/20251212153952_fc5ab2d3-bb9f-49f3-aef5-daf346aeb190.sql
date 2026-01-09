-- Admin users table should not be publicly accessible (admin-only)
CREATE POLICY "Admin users not publicly accessible" 
ON public.admin_users 
FOR SELECT 
USING (false);