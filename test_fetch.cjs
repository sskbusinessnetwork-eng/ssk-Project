const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseClient.ts', 'utf-8');
const urlMatch = content.match(/VITE_SUPABASE_URL\s*\|\|\s*'([^']+)'/);
const anonMatch = content.match(/VITE_SUPABASE_ANON_KEY\s*\|\|\s*'([^']+)'/);
if(urlMatch && anonMatch) {
  const supabase = createClient(urlMatch[1], anonMatch[1]);
  supabase.from('thank_you_slips').select('*').limit(3).then(({data, error}) => {
    console.log(data);
  });
}
