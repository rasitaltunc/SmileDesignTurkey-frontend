// Supabase Edge Function: Secure Admin Leads Reader
// 
// This function allows admins to read leads from Supabase using a token.
// It uses Service Role key server-side (never exposed to client).
//
// Deployment:
// 1. Install Supabase CLI: npm install -g supabase
// 2. Login: supabase login
// 3. Link project: supabase link --project-ref your-project-ref
// 4. Deploy: supabase functions deploy admin-leads
//
// Environment variables (set in Supabase Dashboard > Edge Functions > admin-leads):
// - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (from Dashboard > Settings > API)
// - ADMIN_TOKEN: Your admin token (same as VITE_ADMIN_TOKEN, but server-side)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get admin token from query params or Authorization header
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get('token');
    const authHeader = req.headers.get('Authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const providedToken = tokenFromQuery || tokenFromHeader;

    // Get expected token from environment
    const expectedToken = Deno.env.get('ADMIN_TOKEN');
    
    // Verify token
    if (!expectedToken || !providedToken || providedToken !== expectedToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Supabase service role key (server-side only)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL');
    
    if (!serviceRoleKey || !supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch leads (limit 1000, newest first)
    const limit = parseInt(url.searchParams.get('limit') || '1000', 10);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 1000));

    if (error) {
      console.error('[Admin Leads] Supabase error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch leads', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Transform to match frontend Lead type
    const leads = (data || []).map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      source: row.source,
      name: row.name || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      treatment: row.treatment || undefined,
      message: row.message || undefined,
      timeline: row.timeline || undefined,
      lang: row.lang || undefined,
      pageUrl: row.page_url,
      utmSource: row.utm_source || undefined,
      utmCampaign: row.utm_campaign || undefined,
      utmMedium: row.utm_medium || undefined,
      referrer: row.referrer || undefined,
      device: row.device || undefined,
    }));

    return new Response(
      JSON.stringify({ leads, count: leads.length }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[Admin Leads] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

