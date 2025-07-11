
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
    const { report_type, parameters, send_email = false } = await req.json()

    // Validate required fields
    if (!report_type || !parameters) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: report_type and parameters are required' }),
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

    let reportData = null
    let error = null

    // Generate different reports based on report_type
    switch (report_type) {
      case 'consumption':
        // Generate consumption report
        const { meter_id, start_date, end_date } = parameters

        if (!meter_id || !start_date || !end_date) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters for consumption report: meter_id, start_date, and end_date are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if user has access to this meter
        const { data: meterData, error: meterError } = await supabaseClient
          .from('meters')
          .select('*')
          .eq('id', meter_id)
          .eq('user_id', user.id)
          .single()

        // For admins, allow access to any meter
        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const isAdmin = profileData?.role === 'admin'

        if ((meterError || !meterData) && !isAdmin) {
          return new Response(
            JSON.stringify({ error: 'You do not have access to this meter', details: meterError }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get meter readings for the period
        const { data: readings, error: readingsError } = await supabaseClient
          .from('meter_readings')
          .select('*')
          .eq('meter_id', meter_id)
          .gte('reading_date', start_date)
          .lte('reading_date', end_date)
          .order('reading_date', { ascending: true })

        if (readingsError) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch meter readings', details: readingsError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Calculate daily consumption
        const dailyConsumption = []
        let previousReading = null

        for (const reading of readings) {
          if (previousReading) {
            const consumption = reading.reading - previousReading.reading
            const date = new Date(reading.reading_date).toISOString().split('T')[0]
            
            dailyConsumption.push({
              date,
              consumption,
              reading: reading.reading,
              previous_reading: previousReading.reading
            })
          }
          previousReading = reading
        }

        // Get meter details
        const { data: meter } = await supabaseClient
          .from('meters')
          .select('*')
          .eq('id', meter_id)
          .single()

        reportData = {
          meter,
          period: { start_date, end_date },
          readings: readings.length,
          daily_consumption: dailyConsumption,
          total_consumption: dailyConsumption.reduce((sum, item) => sum + item.consumption, 0),
          average_daily_consumption: dailyConsumption.length > 0 
            ? dailyConsumption.reduce((sum, item) => sum + item.consumption, 0) / dailyConsumption.length 
            : 0
        }
        break

      case 'billing':
        // Generate billing report
        const { user_id, billing_period_start, billing_period_end } = parameters

        if (!billing_period_start || !billing_period_end) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters for billing report: billing_period_start and billing_period_end are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // For admins, allow specifying a different user_id
        const targetUserId = isAdmin && user_id ? user_id : user.id

        // Get bills for the period
        const { data: bills, error: billsError } = await supabaseClient
          .from('bills')
          .select(`
            *,
            meters:meter_id (
              meter_number,
              meter_type,
              user_id,
              premises_id,
              tariff_rate
            )
          `)
          .gte('billing_period_start', billing_period_start)
          .lte('billing_period_end', billing_period_end)
          .filter('meters.user_id', 'eq', targetUserId)
          .order('created_at', { ascending: false })

        if (billsError) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch bills', details: billsError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get transactions for these bills
        const billIds = bills.map(bill => bill.id)
        
        const { data: transactions, error: transactionsError } = await supabaseClient
          .from('transactions')
          .select('*')
          .in('bill_id', billIds)
          .order('transaction_date', { ascending: false })

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError)
        }

        // Calculate totals
        const totalBilled = bills.reduce((sum, bill) => sum + bill.total_amount, 0)
        const totalPaid = transactions 
          ? transactions
              .filter(t => t.status === 'completed')
              .reduce((sum, t) => sum + t.amount, 0)
          : 0
        const totalOutstanding = totalBilled - totalPaid

        reportData = {
          period: { billing_period_start, billing_period_end },
          bills,
          transactions: transactions || [],
          total_billed: totalBilled,
          total_paid: totalPaid,
          total_outstanding: totalOutstanding
        }
        break

      case 'transactions':
        // Generate transactions report
        const { transaction_type, start_date: txStartDate, end_date: txEndDate } = parameters

        if (!txStartDate || !txEndDate) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters for transactions report: start_date and end_date are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Build query
        let query = supabaseClient
          .from('transactions')
          .select(`
            *,
            meters:meter_id (
              meter_number,
              meter_type
            ),
            bills:bill_id (
              bill_number
            )
          `)
          .eq('user_id', user.id)
          .gte('transaction_date', txStartDate)
          .lte('transaction_date', txEndDate)
          .order('transaction_date', { ascending: false })

        // Add transaction type filter if provided
        if (transaction_type) {
          query = query.eq('transaction_type', transaction_type)
        }

        const { data: txData, error: txError } = await query

        if (txError) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch transactions', details: txError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Calculate totals by transaction type
        const totals = {
          recharge: 0,
          payment: 0,
          refund: 0
        }

        txData.forEach(tx => {
          if (tx.status === 'completed' && tx.transaction_type in totals) {
            totals[tx.transaction_type] += tx.amount
          }
        })

        reportData = {
          period: { start_date: txStartDate, end_date: txEndDate },
          transactions: txData,
          totals,
          count: txData.length
        }
        break

      default:
        return new Response(
          JSON.stringify({ error: `Unsupported report type: ${report_type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Record the report generation in the database
    const { data: reportRecord, error: reportError } = await supabaseClient
      .from('reports')
      .insert({
        user_id: user.id,
        report_type,
        parameters
      })
      .select()

    if (reportError) {
      console.error('Error recording report:', reportError)
    }

    // If send_email is true, we would send an email with the report
    // This would require integration with an email service
    if (send_email) {
      // In a real implementation, this would send an email with the report data
      console.log('Email would be sent with report data')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${report_type} report generated successfully`, 
        report: reportData,
        report_id: reportRecord ? reportRecord[0].id : null
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