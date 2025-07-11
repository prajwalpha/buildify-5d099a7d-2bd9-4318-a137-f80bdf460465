
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
    const { meter_ids, billing_period_start, billing_period_end, due_date } = await req.json()

    // Validate required fields
    if (!meter_ids || !billing_period_start || !billing_period_end || !due_date) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: meter_ids, billing_period_start, billing_period_end, and due_date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure meter_ids is an array
    const meterIdsArray = Array.isArray(meter_ids) ? meter_ids : [meter_ids]

    // Get postpaid meters
    const { data: meters, error: metersError } = await supabaseClient
      .from('meters')
      .select('*')
      .in('id', meterIdsArray)
      .eq('billing_type', 'postpaid')

    if (metersError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meters', details: metersError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!meters || meters.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid postpaid meters found for the provided IDs' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const generatedBills = []
    const errors = []

    // Process each meter
    for (const meter of meters) {
      try {
        // Get readings for the billing period
        const { data: readings, error: readingsError } = await supabaseClient
          .from('meter_readings')
          .select('*')
          .eq('meter_id', meter.id)
          .gte('reading_date', billing_period_start)
          .lte('reading_date', billing_period_end)
          .order('reading_date', { ascending: true })

        if (readingsError) {
          errors.push({ meter_id: meter.id, error: 'Failed to fetch readings', details: readingsError })
          continue
        }

        if (!readings || readings.length === 0) {
          errors.push({ meter_id: meter.id, error: 'No readings found for the billing period' })
          continue
        }

        // Get the first and last readings for the period
        const firstReading = readings[0]
        const lastReading = readings[readings.length - 1]

        // Calculate consumption
        const consumption = lastReading.reading - firstReading.reading

        // Calculate amount
        const amount = consumption * meter.tariff_rate
        const taxRate = 0.05 // 5% tax
        const taxAmount = amount * taxRate
        const totalAmount = amount + taxAmount

        // Generate a unique bill number
        const billNumber = `BILL-${meter.meter_number}-${new Date().getTime()}`

        // Create the bill
        const { data: bill, error: billError } = await supabaseClient
          .from('bills')
          .insert({
            meter_id: meter.id,
            bill_number: billNumber,
            billing_period_start,
            billing_period_end,
            previous_reading: firstReading.reading,
            current_reading: lastReading.reading,
            consumption,
            rate: meter.tariff_rate,
            amount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            due_date,
            status: 'pending'
          })
          .select()

        if (billError) {
          errors.push({ meter_id: meter.id, error: 'Failed to create bill', details: billError })
          continue
        }

        // Create a notification for the user
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: meter.user_id,
            meter_id: meter.id,
            title: 'New Bill Generated',
            message: `A new bill (${billNumber}) has been generated for your ${meter.meter_type} meter. Amount: ${totalAmount.toFixed(2)}. Due date: ${due_date}`,
            notification_type: 'info'
          })

        generatedBills.push(bill[0])
      } catch (error) {
        errors.push({ meter_id: meter.id, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${generatedBills.length} bills`, 
        bills: generatedBills,
        errors: errors.length > 0 ? errors : undefined
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