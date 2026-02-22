import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gsqwurrlqfjzbgpgjqae.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzcXd1cnJscWZqemJncGdqcWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Njc0MjcsImV4cCI6MjA4NzM0MzQyN30.hsGaAkN2QbUk1Ij8npAOipfcjSFB6wdgPUYZ24_nQdk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
