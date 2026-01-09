import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados");
    }

    const secret = Deno.env.get("IRONPAY_WEBHOOK_SECRET");
    if (secret) {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (token !== secret) {
        return new Response(JSON.stringify({ success: false, error: "Token inválido" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();

    const transactionHash =
      payload?.transaction_hash ||
      payload?.hash ||
      payload?.data?.transaction_hash ||
      payload?.data?.hash ||
      null;

    const status = payload?.status || payload?.payment_status || payload?.data?.status || payload?.data?.payment_status || null;

    if (!transactionHash) {
      return new Response(JSON.stringify({ success: false, error: "transaction_hash ausente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const updateData: any = {
      ironpay_transaction_hash: transactionHash,
      ironpay_payment_status: status,
      ironpay_raw: payload,
    };

    if (status === "paid") {
      updateData.status = "paid";
      updateData.payment_confirmed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("ironpay_transaction_hash", transactionHash);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("ironpay-webhook error:", error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
