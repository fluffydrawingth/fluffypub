module.exports = async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const r = await fetch(`${url}/rest/v1/theme?select=*`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const data = await r.json();
    res.status(200).json({
      url: url ? url.slice(0,40) : 'MISSING',
      key: key ? key.slice(0,15)+'...' : 'MISSING',
      status: r.status,
      data
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};