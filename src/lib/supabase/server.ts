/**
 * Server-Side Supabase Client (Service Role / Server Context)
 * File: src/lib/supabase/server.ts
 * 
 * NEVER import this file in client-side components ('use client').
 * Used exclusively inside Next.js API Routes (server runtime) to securely
 * interact with PostgreSQL without exposing service keys to the browser.
 */

import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

// Prioritize SUPABASE_SERVICE_ROLE_KEY for server operations, fallback to anon key for dev
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isServerSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!serviceRoleKey &&
    !supabaseUrl.includes('your-project')
  );
};

export const getSupabaseServer = () => {
  if (!isServerSupabaseConfigured()) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
