-- Add IronPay integration fields

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS ironpay_product_hash TEXT,
ADD COLUMN IF NOT EXISTS ironpay_offer_hash TEXT,
ADD COLUMN IF NOT EXISTS ironpay_last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ironpay_last_sync_status TEXT,
ADD COLUMN IF NOT EXISTS ironpay_last_sync_error TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS ironpay_transaction_hash TEXT,
ADD COLUMN IF NOT EXISTS ironpay_payment_method TEXT,
ADD COLUMN IF NOT EXISTS ironpay_payment_status TEXT,
ADD COLUMN IF NOT EXISTS ironpay_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ironpay_raw JSONB;
