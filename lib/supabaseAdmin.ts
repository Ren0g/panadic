// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';
// Ako imaš generički tip Database, možeš dodati <Database> kao generički tip
// import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ⚠️ SERVICE ROLE ključ koristimo isključivo u server okruženju (API routeovi).
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false
    }
  }
);
