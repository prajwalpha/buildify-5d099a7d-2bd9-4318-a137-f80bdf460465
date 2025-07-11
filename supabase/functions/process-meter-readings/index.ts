
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

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the request body
    const { meter_id, reading, reading_date, is_manual = false, notes = '' } = await req.json()

    // Validate required fields
    if (!meter_id || reading === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: meter_id and reading are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if meter exists
    const { data: meterData, error: meterError } = await supabaseClient
      .from('meters')
      .select('*')
      .eq('id', meter_id)
      .single()

    if (meterError || !meterData) {
      return new Response(
        JSON.stringify({ error: 'Meter not found', details: meterError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert the new reading
    // Note: The consumption calculation and balance update will be handled by database triggers
    const { data, error } = await supabaseClient
      .from('meter_readings')
      .insert({
        meter_id,
        reading,
        reading_date: reading_date || new Date().toISOString(),
        is_manual,
        notes
      })
      .select()

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to process meter reading', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the updated meter data after triggers have run
    const { data: updatedMeter, error: updateError } = await supabaseClient
      .from('meters')
      .select('*')
      .eq('id', meter_id)
      .single()

    if (updateError) {
      console.error('Error fetching updated meter data:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Meter reading processed successfully', 
        reading: data[0],
        meter: updatedMeter || meterData
      }),
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