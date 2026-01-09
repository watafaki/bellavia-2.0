import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IRONPAY_API_URL = 'https://api.ironpayapp.com.br/api/public/v1';

// Map Bellavia categories to IronPay category IDs
const categoryMap: Record<string, number> = {
  'camisetas': 1,
  'camisas': 1,
  'polos': 1,
  'regatas': 1,
  'moletons': 1,
  'outros': 1,
};

const normalize = (value: string) => (value || '').trim().toLowerCase();

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

    const { action, product } = await req.json();
    console.log('IronPay sync action:', action, 'product:', product?.name);

    const salePage = `${STORE_BASE_URL.replace(/\/$/, '')}/produto/${product?.id}`;

    const listProducts = async () => {
      const listResponse = await fetch(
        `${IRONPAY_API_URL}/products?api_token=${IRONPAY_API_TOKEN}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }
      );

      const listData = await listResponse.json();
      if (!listResponse.ok || listData?.success === false) {
        throw new Error(listData?.message || `Erro ao listar produtos no IronPay: ${JSON.stringify(listData)}`);
      }

      return Array.isArray(listData?.data) ? listData.data : [];
    };

    const resolveExistingProduct = async () => {
      if (product?.ironpay_product_hash) {
        return product.ironpay_product_hash as string;
      }

      const products = await listProducts();
      const bySalePage = products.find((p: any) =>
        typeof p?.sale_page === 'string' && normalize(p.sale_page) === normalize(salePage)
      );
      const byTitle = products.find((p: any) => normalize(p?.title || '') === normalize(product?.name || ''));
      return (bySalePage || byTitle)?.hash as string | undefined;
    };

    const createOffer = async (productHash: string, priceInCents: number) => {
      const offerPayload = {
        title: `${product.name} - Oferta Principal`,
        cover: product.image_url || '',
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
      if (!offerResponse.ok || offerData?.success === false) {
        throw new Error(offerData?.message || `Erro ao criar oferta no IronPay: ${JSON.stringify(offerData)}`);
      }

      const offerHash = offerData?.data?.hash || offerData?.data?.offer_hash;
      if (!offerHash) {
        throw new Error(`Resposta inválida ao criar oferta no IronPay: ${JSON.stringify(offerData)}`);
      }

      return { offerData, offerHash };
    };

    const createProductWithOffer = async () => {
      const priceInCents = Math.round(product.price * 100);

      const productPayload = {
        title: product.name,
        cover: product.image_url || '',
        sale_page: salePage,
        payment_type: 1,
        product_type: 'fisico',
        delivery_type: 2,
        id_category: categoryMap[product.category] || 1,
        amount: priceInCents,
      };

      console.log('Creating product in IronPay:', productPayload);

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
      console.log('IronPay create product response:', createData);

      if (!createResponse.ok || createData?.success === false) {
        throw new Error(createData?.message || `Erro ao criar produto no IronPay: ${JSON.stringify(createData)}`);
      }

      const productHash = createData?.data?.hash;
      if (!productHash) {
        throw new Error(`Resposta inválida ao criar produto no IronPay: ${JSON.stringify(createData)}`);
      }

      console.log('Creating offer in IronPay for product:', productHash);
      const { offerData, offerHash } = await createOffer(productHash, priceInCents);
      console.log('IronPay create offer response:', offerData);

      return { createData, offerData, productHash, offerHash };
    };

    // Create product in IronPay
    if (action === 'create_product') {
      const { createData, offerData, productHash, offerHash } = await createProductWithOffer();

      return new Response(
        JSON.stringify({
          success: true,
          product: createData.data,
          offer: offerData.success ? offerData.data : null,
          ironpay_product_hash: productHash,
          ironpay_offer_hash: offerHash,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update product in IronPay
    if (action === 'update_product') {
      console.log('Update product requested:', product.name);

      const priceInCents = Math.round(product.price * 100);
      const productHash = await resolveExistingProduct();

      if (!productHash) {
        console.log('No existing product found in IronPay, falling back to create_product');
        const { createData, offerData, productHash: newProductHash, offerHash } = await createProductWithOffer();

        return new Response(
          JSON.stringify({
            success: true,
            product: createData.data,
            offer: offerData.success ? offerData.data : null,
            ironpay_product_hash: newProductHash,
            ironpay_offer_hash: offerHash,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updatePayload = {
        title: product.name,
        cover: product.image_url || '',
        sale_page: salePage,
        id_category: categoryMap[product.category] || 1,
        amount: priceInCents,
      };

      const updateResponse = await fetch(
        `${IRONPAY_API_URL}/products/${productHash}?api_token=${IRONPAY_API_TOKEN}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        }
      );

      const updateData = await updateResponse.json();
      console.log('IronPay update product response:', updateData);

      if (!updateResponse.ok || updateData?.success === false) {
        console.log('IronPay update failed, falling back to create_product');
        const { createData, offerData, productHash: newProductHash, offerHash } = await createProductWithOffer();

        return new Response(
          JSON.stringify({
            success: true,
            product: createData.data,
            offer: offerData.success ? offerData.data : null,
            ironpay_product_hash: newProductHash,
            ironpay_offer_hash: offerHash,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { offerData, offerHash } = await createOffer(productHash, priceInCents);
      console.log('IronPay create offer (update) response:', offerData);

      return new Response(
        JSON.stringify({
          success: true,
          product: updateData?.data || { hash: productHash },
          offer: offerData?.data || null,
          ironpay_product_hash: productHash,
          ironpay_offer_hash: offerHash,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete product from IronPay
    if (action === 'delete_product') {
      console.log('Delete product requested:', product.name);
      
      // Try to find and delete the product
      const listResponse = await fetch(
        `${IRONPAY_API_URL}/products?api_token=${IRONPAY_API_TOKEN}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }
      );
      
      const listData = await listResponse.json();
      
      if (listData.success && listData.data) {
        const existingProduct = listData.data.find((p: any) => 
          p.title === product.name || p.title.includes(product.name)
        );
        
        if (existingProduct) {
          console.log('Found product to delete in IronPay:', existingProduct.hash);
          // Attempt to delete (if IronPay supports it)
          // For now we just log it
          return new Response(
            JSON.stringify({ success: true, message: 'Produto encontrado para exclusão', product: existingProduct }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Exclusão registrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // List products
    if (action === 'list_products') {
      const response = await fetch(
        `${IRONPAY_API_URL}/products?api_token=${IRONPAY_API_TOKEN}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }
      );

      const data = await response.json();
      console.log('IronPay list products response:', data);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('IronPay sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
