// lib/supabaseAdmin.ts

// Za potrebe trenutnih admin API routeova (uređivanje susreta)
// dovoljno nam je koristiti postojeći Supabase client s anon ključem.
// Ne trebamo zaseban service-role ključ na serveru.

import { supabase } from "@/lib/supabaseClient";

export const supabaseAdmin = supabase;
