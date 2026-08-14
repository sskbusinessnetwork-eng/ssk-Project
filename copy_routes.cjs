const fs = require('fs');

const boilerplate = `import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const supabaseUrl = process.env.SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey as string);
const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY as string);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}
`;

function writeEndpoint(filePath, logic, isGet = false) {
  const methodCheck = isGet 
    ? `if (req.method === 'OPTIONS') return res.status(200).end();\n  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });`
    : `if (req.method === 'OPTIONS') return res.status(200).end();\n  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });`;
    
  const content = `${boilerplate}\nexport default async function handler(req: any, res: any) {\n  setCorsHeaders(res);\n  ${methodCheck}\n\n  ${logic}\n}\n`;
  
  const dir = filePath.split('/').slice(0, -1).join('/');
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
}

const serverCode = fs.readFileSync('server.ts', 'utf-8');

// I will just manually execute each endpoint porting.
