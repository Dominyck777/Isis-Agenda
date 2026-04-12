import { createClient } from '@supabase/supabase-js';

// Usando o URL e a Key do projeto de pagamento correto (.envdev)
const supabaseUrl = "https://guildthlqkfubbqoybys.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aWxkdGhscWtmdWJicW95YnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NTY2NjksImV4cCI6MjA4MTMzMjY2OX0.9--rqgkuDVLiwhU93RLV1YwEYVW6aRe9Qf5Mh80aVCg";

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis de ambiente do Supabase Control (.envdev) estão ausentes.');
}

export const supabaseControl = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});
