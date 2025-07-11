
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.com/manual/examples/supabase-functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get API key from environment variables
    const apiKey = Deno.env.get('COINGECKO_API_KEY')
    
    // Fetch cryptocurrency data from CoinGecko API
    const url = apiKey 
      ? `https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&x_cg_pro_api_key=${apiKey}`
      : 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }
    
    const data = await response.json()
    
    // Update cryptocurrency data in the database
    for (const coin of data) {
      const { error } = await supabaseClient
        .from('cryptocurrencies')
        .upsert({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          current_price: coin.current_price,
          market_cap: coin.market_cap,
          volume_24h: coin.total_volume,
          price_change_24h: coin.price_change_percentage_24h,
          last_updated: new Date().toISOString(),
          logo_url: coin.image
        }, { onConflict: 'symbol' })
      
      if (error) {
        console.error(`Error updating ${coin.symbol}:`, error)
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Cryptocurrency data updated successfully', count: data.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})