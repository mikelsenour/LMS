const SUPABASE_URL = 'https://ueqwcqhobbiatdkpmmuu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mpbLnaWpxHXSpEEsNReZdw_yUGqHX25';

// "db" is how every other file will talk to Supabase
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);