
import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.from('empresas').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Columns in "empresas":', Object.keys(data[0] || {}));
  }
}

checkSchema();
