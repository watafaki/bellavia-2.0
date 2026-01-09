-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');

-- Create enum for product category
CREATE TYPE public.product_category AS ENUM ('camisetas', 'camisas', 'polos', 'regatas', 'moletons', 'outros');

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category product_category NOT NULL DEFAULT 'camisetas',
  image_url TEXT,
  sizes TEXT[] DEFAULT '{"P", "M", "G", "GG"}',
  colors TEXT[] DEFAULT '{}',
  stock INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  pix_code TEXT,
  payment_confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_users table for admin authentication
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create store_settings table for customization
CREATE TABLE public.store_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Products are publicly readable
CREATE POLICY "Products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (active = true);

-- Orders are publicly insertable (for customers placing orders)
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Orders are viewable by email (for tracking)
CREATE POLICY "Orders viewable by customer email" 
ON public.orders 
FOR SELECT 
USING (true);

-- Store settings are publicly readable
CREATE POLICY "Store settings are viewable by everyone" 
ON public.store_settings 
FOR SELECT 
USING (true);

-- Insert default admin user (password: 103060qwe - hashed)
INSERT INTO public.admin_users (email, password_hash, name) 
VALUES ('topzao@admin.bellavia', '$2a$10$rQfE1qXLqJ5ZP7QbTpT5zOK4JbOz6fHqCqWLqvvqfqZqZqZqZqZqZ', 'Admin Bellavia');

-- Insert default PIX key setting
INSERT INTO public.store_settings (key, value) VALUES ('pix_key', '99981563369');
INSERT INTO public.store_settings (key, value) VALUES ('store_name', 'Bellavia');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);

-- Storage policies for product images
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'products');

CREATE POLICY "Anyone can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'products');