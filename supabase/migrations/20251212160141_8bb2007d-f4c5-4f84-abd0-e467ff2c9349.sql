-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles: users can see their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Products table: Admin-only write policies
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Orders table: Admin-only update policy
CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Store settings: Admin-only write policies
CREATE POLICY "Admins can insert store settings"
ON public.store_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update store settings"
ON public.store_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create function to validate and create orders server-side
CREATE OR REPLACE FUNCTION public.create_validated_order(
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_items JSONB,
    p_pix_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_total NUMERIC := 0;
    v_item JSONB;
    v_product RECORD;
BEGIN
    -- Validate inputs
    IF p_customer_name IS NULL OR LENGTH(TRIM(p_customer_name)) < 2 THEN
        RAISE EXCEPTION 'Invalid customer name';
    END IF;
    
    IF p_customer_email IS NULL OR p_customer_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email address';
    END IF;
    
    IF p_customer_phone IS NULL OR LENGTH(TRIM(p_customer_phone)) < 8 THEN
        RAISE EXCEPTION 'Invalid phone number';
    END IF;
    
    IF p_customer_address IS NULL OR LENGTH(TRIM(p_customer_address)) < 10 THEN
        RAISE EXCEPTION 'Invalid address';
    END IF;
    
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item';
    END IF;
    
    -- Validate each item and calculate total from actual product prices
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT id, price, stock, active INTO v_product
        FROM public.products
        WHERE id = (v_item->>'id')::UUID;
        
        IF v_product IS NULL THEN
            RAISE EXCEPTION 'Product not found: %', v_item->>'id';
        END IF;
        
        IF NOT v_product.active THEN
            RAISE EXCEPTION 'Product is not available: %', v_item->>'id';
        END IF;
        
        IF (v_item->>'quantity')::INTEGER < 1 OR (v_item->>'quantity')::INTEGER > 100 THEN
            RAISE EXCEPTION 'Invalid quantity for product: %', v_item->>'id';
        END IF;
        
        -- Calculate total using actual database price (not client-provided)
        v_total := v_total + (v_product.price * (v_item->>'quantity')::INTEGER);
    END LOOP;
    
    -- Insert order with validated data
    INSERT INTO public.orders (
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        items,
        total,
        pix_code
    ) VALUES (
        TRIM(p_customer_name),
        LOWER(TRIM(p_customer_email)),
        TRIM(p_customer_phone),
        TRIM(p_customer_address),
        p_items,
        v_total,
        p_pix_code
    )
    RETURNING id INTO v_order_id;
    
    RETURN v_order_id;
END;
$$;

-- Drop the old admin_users table (we'll use Supabase Auth instead)
DROP TABLE IF EXISTS public.admin_users;