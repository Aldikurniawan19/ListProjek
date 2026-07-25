import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://sqhiewfgvsudhfhfrmrg.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_C0ErrJOY4BOv4lYV9BmDew_zVqZO5Rn';

export const supabase = createClient(supabaseUrl, supabaseKey);
