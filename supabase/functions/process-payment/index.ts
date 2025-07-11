
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
    const { 
      transaction_type, 
      meter_id, 
      bill_id, 
      amount, 
      payment_method, 
      payment_reference,
      notes
    } = await req.json()

    // Validate required fields
    if (!transaction_type || !amount || !payment_method) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: transaction_type, amount, and payment_method are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate transaction type
    if (!['recharge', 'payment', 'refund'].includes(transaction_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid transaction_type. Must be one of: recharge, payment, refund' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For recharge, meter_id is required
    if (transaction_type === 'recharge' && !meter_id) {
      return new Response(
        JSON.stringify({ error: 'meter_id is required for recharge transactions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For payment, bill_id is required
    if (transaction_type === 'payment' && !bill_id) {
      return new Response(
        JSON.stringify({ error: 'bill_id is required for payment transactions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user from the auth context
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', details: userError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate meter ownership if meter_id is provided
    if (meter_id) {
      const { data: meter, error: meterError } = await supabaseClient
        .from('meters')
        .select('*')
        .eq('id', meter_id)
        .single()

      if (meterError || !meter) {
        return new Response(
          JSON.stringify({ error: 'Meter not found', details: meterError }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user owns the meter or is an admin
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const isAdmin = profile?.role === 'admin'

      if (meter.user_id !== user.id && !isAdmin) {
        return new Response(
          JSON.stringify({ error: 'You do not have permission to perform transactions for this meter' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate bill ownership if bill_id is provided
    if (bill_id) {
      const { data: bill, error: billError } = await supabaseClient
        .from('bills')
        .select('*, meters:meter_id(user_id)')
        .eq('id', bill_id)
        .single()

      if (billError || !bill) {
        return new Response(
          JSON.stringify({ error: 'Bill not found', details: billError }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user owns the bill or is an admin
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const isAdmin = profile?.role === 'admin'

      if (bill.meters.user_id !== user.id && !isAdmin) {
        return new Response(
          JSON.stringify({ error: 'You do not have permission to pay this bill' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generate a unique transaction number
    const transactionNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // In a real implementation, this would integrate with a payment gateway
    // For this example, we'll simulate a successful payment
    const paymentStatus = 'completed'

    // Create the transaction
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        transaction_number: transactionNumber,
        user_id: user.id,
        meter_id,
        bill_id,
        transaction_type,
        amount,
        payment_method,
        payment_reference,
        status: paymentStatus,
        transaction_date: new Date().toISOString(),
        notes
      })
      .select()

    if (transactionError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction', details: transactionError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a notification for the user
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        meter_id,
        title: `${transaction_type.charAt(0).toUpperCase() + transaction_type.slice(1)} Successful`,
        message: `Your ${transaction_type} of ${amount.toFixed(2)} was processed successfully. Transaction ID: ${transactionNumber}`,
        notification_type: 'info'
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${transaction_type} processed successfully`, 
        transaction: transaction[0]
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