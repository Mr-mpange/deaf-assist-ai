-- Add admin policies for user_roles table to allow admins to manage user roles

-- Allow admins to insert user roles
CREATE POLICY "Admins can insert user roles" ON public.user_roles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Allow admins to update user roles
CREATE POLICY "Admins can update user roles" ON public.user_roles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Allow admins to delete user roles
CREATE POLICY "Admins can delete user roles" ON public.user_roles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Add admin policies for profiles table

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile" ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Allow admins to delete any profile
CREATE POLICY "Admins can delete any profile" ON public.profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Create RPC function for admin user updates (bypasses RLS)
CREATE OR REPLACE FUNCTION admin_update_user_profile(
  target_user_id UUID,
  new_name TEXT,
  new_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
  result JSON;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin';
  
  IF current_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Update profile
  UPDATE public.profiles 
  SET name = new_name 
  WHERE user_id = target_user_id;
  
  -- Delete existing roles
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id;
  
  -- Insert new role
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (target_user_id, new_role::app_role);
  
  result := json_build_object('success', true, 'message', 'User updated successfully');
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  result := json_build_object('success', false, 'error', SQLERRM);
  RETURN result;
END;
$$;