module.exports = async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Test connection directly
  try {
    const response = await fetch(`${url}/rest/v1/theme?select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.status(200).json({
      url_prefix: url ? url.substring(0, 30) + '...' : 'MISSING',
      key_prefix: key ? key.substring(0, 20) + '...' : 'MISSING',
      key_format: key ? (key.startsWith('eyJ') ? 'legacy_jwt' : 'new_format') : 'MISSING',
      response_status: response.status,
      data: data
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
