-- Remove the dangerous INSERT policy that allows users to set their own role
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;

-- Update profiles table to require authentication for reads
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);