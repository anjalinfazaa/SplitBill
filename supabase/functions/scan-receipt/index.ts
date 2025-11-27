import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized', items: [] }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { image } = await req.json();
    
    if (!image || typeof image !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid image data', items: [] }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all items with prices from this receipt. Return ONLY a valid JSON array with objects containing: name (string), price (number in IDR), quantity (number, default 1). No markdown, no explanation, just the JSON array.',
              },
              {
                type: 'image_url',
                image_url: { url: image },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    interface ReceiptItem {
      name: string;
      price: number;
      quantity: number;
    }
    
    let items: ReceiptItem[] = [];
    try {
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
      
      // Validate each item
      items = Array.isArray(parsed) ? parsed
        .filter(item => 
          item &&
          typeof item === 'object' &&
          typeof item.name === 'string' &&
          item.name.trim().length > 0 &&
          item.name.length <= 100 &&
          typeof item.price === 'number' &&
          item.price > 0 &&
          item.price <= 999999999 &&
          typeof item.quantity === 'number' &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= 9999
        )
        .map(item => ({
          name: item.name.trim().slice(0, 100),
          price: item.price,
          quantity: item.quantity
        })) : [];
    } catch {
      items = [];
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, items: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
