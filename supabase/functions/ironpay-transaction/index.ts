import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IRONPAY_API_URL = 'https://api.ironpayapp.com.br/api/public/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IRONPAY_API_TOKEN = Deno.env.get('IRONPAY_API_TOKEN');
    if (!IRONPAY_API_TOKEN) {
      throw new Error('IRONPAY_API_TOKEN não configurado');
    }

    const STORE_BASE_URL =
      Deno.env.get('STORE_BASE_URL') ||
      req.headers.get('origin') ||
      'https://bellavia.com.br';

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const IRONPAY_WEBHOOK_SECRET = Deno.env.get('IRONPAY_WEBHOOK_SECRET');
    const defaultPostbackUrl = SUPABASE_URL
      ? `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/ironpay-webhook${IRONPAY_WEBHOOK_SECRET ? `?token=${encodeURIComponent(IRONPAY_WEBHOOK_SECRET)}` : ''}`
      : undefined;

    const body = await req.json();
    const { action } = body;

    console.log('IronPay transaction action:', action);

    // Create a new transaction
    if (action === 'create_transaction') {
      const { 
        cart, 
        customer, 
        payment_method, 
        card, 
        installments = 1,
        offer_hash
      } = body;

      // Basic validation
      if (!Array.isArray(cart) || cart.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Carrinho vazio' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate total amount in cents
      const totalAmount = cart.reduce((sum: number, item: any) => {
        return sum + (item.price * item.quantity);
      }, 0);
      const amountInCents = Math.round(totalAmount * 100);

      // Format phone number (remove non-numeric)
      const phoneClean = customer.phone.replace(/\D/g, '');

      // Format document (remove non-numeric)
      const documentClean = customer.document?.replace(/\D/g, '') || '';

      const normalize = (value: string) => (value || '').trim().toLowerCase();

      const fetchProductsWithOffers = async () => {
        const response = await fetch(
          `${IRONPAY_API_URL}/products?api_token=${IRONPAY_API_TOKEN}`,
          { method: 'GET', headers: { 'Accept': 'application/json' } }
        );
        const data = await response.json();
        if (!response.ok || data?.success === false) {
          throw new Error(data?.message || 'Erro ao listar produtos no IronPay');
        }
        return Array.isArray(data?.data) ? data.data : [];
      };

      const createProductAndOffer = async (item: any) => {
        const priceInCents = Math.round(item.price * 100);
        const sale_page = `${STORE_BASE_URL.replace(/\/$/, '')}/produto/${item.id}`;

        const productPayload = {
          title: item.name,
          cover: item.image_url || '',
          sale_page,
          payment_type: 1,
          product_type: 'fisico',
          delivery_type: 2,
          id_category: 1,
          amount: priceInCents,
        };

        const createResponse = await fetch(
          `${IRONPAY_API_URL}/products?api_token=${IRONPAY_API_TOKEN}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(productPayload),
          }
        );

        const createData = await createResponse.json();
        if (!createResponse.ok || createData?.success === false || !createData?.data?.hash) {
          throw new Error(createData?.message || `Erro ao criar produto no IronPay: ${JSON.stringify(createData)}`);
        }

        const productHash = createData.data.hash;

        const offerPayload = {
          title: `${item.name} - Oferta Principal`,
          cover: item.image_url || '',
          amount: priceInCents,
        };

        const offerResponse = await fetch(
          `${IRONPAY_API_URL}/products/${productHash}/offers?api_token=${IRONPAY_API_TOKEN}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(offerPayload),
          }
        );

        const offerData = await offerResponse.json();
        const offerHash = offerData?.data?.hash || offerData?.data?.offer_hash;
        if (!offerResponse.ok || offerData?.success === false || !offerHash) {
          throw new Error(offerData?.message || `Erro ao criar oferta no IronPay: ${JSON.stringify(offerData)}`);
        }

        return { productHash, offerHash };
      };

      const resolveIronPayHashes = async (item: any, products: any[]) => {
        if (item?.product_hash && item?.offer_hash) {
          return { productHash: item.product_hash, offerHash: item.offer_hash };
        }

        const desiredSalePage = `${STORE_BASE_URL.replace(/\/$/, '')}/produto/${item.id}`;

        const bySalePage = products.find((p: any) =>
          typeof p?.sale_page === 'string' && normalize(p.sale_page) === normalize(desiredSalePage)
        );
        const byTitle = products.find((p: any) => normalize(p?.title || '') === normalize(item.name));
        const match = bySalePage || byTitle;

        const productHash = match?.hash;
        const offerHash = match?.offers?.[0]?.hash;

        if (productHash && offerHash) {
          return { productHash, offerHash };
        }

        return await createProductAndOffer(item);
      };

      const productsCache = await fetchProductsWithOffers();
      const resolvedById = new Map<string, { productHash: string; offerHash: string }>();

      // Build cart items for IronPay (usando hashes reais do IronPay)
      const cartItems = await Promise.all(
        cart.map(async (item: any) => {
          const cacheKey = String(item.id);
          let resolved = resolvedById.get(cacheKey);
          if (!resolved) {
            resolved = await resolveIronPayHashes(item, productsCache);
            resolvedById.set(cacheKey, resolved);
          }

          return {
            product_hash: resolved.productHash,
            title: item.name,
            cover: item.image_url || null,
            price: Math.round(item.price * 100),
            quantity: item.quantity,
            operation_type: 1,
            tangible: true,
            _offer_hash: resolved.offerHash,
          };
        })
      );

      // IronPay enforces a minimum unit price per product
      const MIN_ITEM_PRICE_CENTS = 500; // R$ 5,00
      const invalidItems = cartItems.filter((i: any) => (i?.price ?? 0) < MIN_ITEM_PRICE_CENTS);
      if (invalidItems.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `O preço mínimo por produto no checkout é R$ 5,00. Ajuste o preço de: ${invalidItems
              .map((i: any) => i.title)
              .join(', ')}.`,
            errors: {
              price: ['O preço mínimo para o produto é de R$ 5,00'],
              items: invalidItems.map((i: any) => ({ title: i.title, price: i.price })),
            },
            status: 422,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }


      // Build transaction payload
      const envOfferHash = Deno.env.get('IRONPAY_OFFER_HASH');
      const firstOfferHash = (cartItems as any[])?.[0]?._offer_hash;

      const transactionPayload: any = {
        amount: amountInCents,
        offer_hash: offer_hash || envOfferHash || firstOfferHash || '',
        payment_method: payment_method,
        customer: {
          name: customer.name,
          email: customer.email,
          phone_number: phoneClean,
          document: documentClean,
          street_name: customer.street_name || '',
          number: customer.number || '',
          complement: customer.complement || '',
          neighborhood: customer.neighborhood || '',
          city: customer.city || '',
          state: customer.state || '',
          zip_code: customer.zip_code?.replace(/\D/g, '') || '',
        },
        cart: (cartItems as any[]).map(({ _offer_hash, ...rest }) => rest),
        expire_in_days: 1,
        transaction_origin: 'api',
        installments: installments, // Required by IronPay for all payment methods
      };

      if (defaultPostbackUrl) {
        transactionPayload.postback_url = defaultPostbackUrl;
      }

      // Add card data if credit card payment
      if (payment_method === 'credit_card' && card) {
        transactionPayload.card = {
          number: card.number.replace(/\s/g, ''),
          holder_name: card.holder_name,
          exp_month: parseInt(card.exp_month),
          exp_year: parseInt(card.exp_year),
          cvv: card.cvv,
        };
      }

      console.log('Creating transaction in IronPay:', JSON.stringify(transactionPayload, null, 2));

      const response = await fetch(
        `${IRONPAY_API_URL}/transactions?api_token=${IRONPAY_API_TOKEN}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(transactionPayload),
        }
      );

      const data = await response.json();
      console.log('IronPay transaction response:', JSON.stringify(data, null, 2));

      // Avoid returning non-2xx to the frontend; surface IronPay errors in JSON
      if (!response.ok || data?.success === false) {
        return new Response(
          JSON.stringify({
            ...(typeof data === 'object' && data ? data : { message: String(data) }),
            success: false,
            status: (data as any)?.status ?? response.status,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If successful, save order to our database
      if (data.success) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Prepare order items
        const orderItems = cart.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          size: item.size || '',
          color: item.color || '',
          quantity: item.quantity,
        }));

        // Build address string
        const addressParts = [
          customer.street_name,
          customer.number,
          customer.complement,
          customer.neighborhood,
          customer.city,
          customer.state,
          customer.zip_code
        ].filter(Boolean);
        const fullAddress = addressParts.join(', ') || customer.address || '';

        // Create order in our database
        const ironpayTxHash = data.data?.hash || data.data?.transaction_hash || null;
        const ironpayStatus = data.data?.status || data.data?.payment_status || null;
        const ironpayExpiresAt = data.data?.expires_at || null;

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: phoneClean,
            customer_address: fullAddress,
            items: orderItems,
            total: totalAmount,
            pix_code: data.data?.pix_code || data.data?.hash || null,
            ironpay_transaction_hash: ironpayTxHash,
            ironpay_payment_method: payment_method || null,
            ironpay_payment_status: ironpayStatus,
            ironpay_expires_at: ironpayExpiresAt,
            ironpay_raw: data,
            status: data.data?.status === 'paid' ? 'paid' : 'pending',
          })
          .select()
          .single();

        if (orderError) {
          console.error('Error saving order to database:', orderError);
        } else {
          console.log('Order saved to database:', order.id);
        }
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get transaction status
    if (action === 'get_transaction') {
      const { hash } = body;

      const response = await fetch(
        `${IRONPAY_API_URL}/transactions/${hash}?api_token=${IRONPAY_API_TOKEN}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }
      );

      const data = await response.json();
      console.log('IronPay get transaction response:', data);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refund transaction
    if (action === 'refund_transaction') {
      const { hash, amount } = body;

      const response = await fetch(
        `${IRONPAY_API_URL}/transactions/${hash}/refund?api_token=${IRONPAY_API_TOKEN}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ amount }),
        }
      );

      const data = await response.json();
      console.log('IronPay refund response:', data);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // List products to get offer hashes
    if (action === 'get_offers') {
      const response = await fetch(
        `${IRONPAY_API_URL}/products?api_token=${IRONPAY_API_TOKEN}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }
      );

      const data = await response.json();
      console.log('IronPay products response:', data);

      // Extract offer hashes
      const offers: Record<string, string> = {};
      if (data.success && data.data) {
        for (const product of data.data) {
          if (product.offers && product.offers.length > 0) {
            offers[product.title] = product.offers[0].hash;
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, offers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('IronPay transaction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    // Return 200 so the frontend doesn't receive "Edge Function returned a non-2xx status code"
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
