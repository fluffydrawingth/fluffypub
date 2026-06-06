const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('theme').select('config').eq('id', 1).single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data?.config || {});
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
};
