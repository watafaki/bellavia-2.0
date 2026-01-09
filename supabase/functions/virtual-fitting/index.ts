import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userImage, clothingImage, clothingName, selectedSize, userHeight, userBodyDescription } = await req.json();
    
    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!AI_GATEWAY_API_KEY) {
      throw new Error("AI_GATEWAY_API_KEY/LOVABLE_API_KEY não configurado");
    }

    const AI_GATEWAY_URL =
      Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";

    console.log("Virtual fitting request received:", { clothingName, selectedSize, userHeight });

    // Size descriptions for the AI to understand fit
    const sizeDescriptions: Record<string, string> = {
      'PP': 'extra small (very tight fit)',
      'P': 'small (fitted)',
      'M': 'medium (regular fit)',
      'G': 'large (loose fit)',
      'GG': 'extra large (very loose, oversized fit)',
      'XGG': 'double extra large (extremely loose, very oversized)',
    };

    const sizeDescription = sizeDescriptions[selectedSize] || 'regular fit';
    
    // Height context for better fitting simulation
    const heightContext = userHeight 
      ? `The person is approximately ${userHeight}cm tall.` 
      : '';

    const prompt = `You are a fashion AI assistant. Generate a realistic image of a person wearing clothes.

TASK: Create a photorealistic image that shows the person from the user's photo wearing the clothing item.

IMPORTANT REQUIREMENTS:
1. Keep the person's face, body type, and skin tone EXACTLY as in their photo
2. The clothing is size ${selectedSize} (${sizeDescription})
3. The clothing item is: ${clothingName}
4. Show realistic fabric draping and fit based on the size selected
5. If the size is larger than typical for the person's body, show the clothes fitting loosely/oversized
6. If the size is smaller than typical, show the clothes fitting tightly
7. Maintain professional fashion photography style
8. Full body shot showing the complete outfit
9. Natural lighting and clean background
${heightContext ? `10. ${heightContext} Adjust the clothing proportions accordingly.` : ''}

User description: ${userBodyDescription || 'Person from the uploaded photo'}${userHeight ? `, height: ${userHeight}cm` : ''}

Generate a high-quality, photorealistic result showing how this specific clothing item would look on this person.`;

    console.log("Sending request to AI gateway with image generation model");

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: userImage
                }
              },
              {
                type: "image_url",
                image_url: {
                  url: clothingImage
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response received, checking for generated image");

    // Extract the generated image - check multiple possible locations
    let generatedImage = null;
    
    // Check for inline image in content
    if (data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      // Check if content contains base64 image
      if (typeof content === 'string' && content.includes('data:image')) {
        const match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (match) {
          generatedImage = match[0];
        }
      }
    }

    // Check for images array
    if (!generatedImage && data.choices?.[0]?.message?.images?.[0]) {
      const img = data.choices[0].message.images[0];
      generatedImage = img.image_url?.url || img.url || img;
    }

    // Check for inline_data in parts
    if (!generatedImage && data.choices?.[0]?.message?.parts) {
      for (const part of data.choices[0].message.parts) {
        if (part.inline_data?.data) {
          generatedImage = `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`;
          break;
        }
      }
    }

    const textResponse = data.choices?.[0]?.message?.content;
    console.log("Text response:", typeof textResponse === 'string' ? textResponse.substring(0, 100) : 'No text');

    if (!generatedImage) {
      console.error("No image found in response:", JSON.stringify(data, null, 2).substring(0, 500));
      throw new Error("Não foi possível gerar a imagem. Tente novamente.");
    }

    console.log("Successfully extracted generated image");

    return new Response(JSON.stringify({ 
      generatedImage,
      description: typeof textResponse === 'string' ? textResponse : 'Imagem gerada com sucesso'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Virtual fitting error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar imagem";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
