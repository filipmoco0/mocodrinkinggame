// api/validate.js
// Called by the frontend when a user enters their license key

export default async function handler(req, res) {
  // Allow CORS for frontend fetch
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { key } = req.body;

    if (!key) return res.status(400).json({ valid: false, error: 'No key provided' });

    const cleanKey = key.toUpperCase().trim();

    // Look up key in Supabase
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/license_keys?key=eq.${encodeURIComponent(cleanKey)}&select=*`,
      {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    const rows = await response.json();

    if (!rows.length) {
      return res.status(200).json({ valid: false, error: 'Key not found' });
    }

    const row = rows[0];

    if (row.used) {
      return res.status(200).json({ valid: false, error: 'Key already used' });
    }

    // Mark key as used
    await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/license_keys?key=eq.${encodeURIComponent(cleanKey)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ used: true, used_at: new Date().toISOString() }),
      }
    );

    return res.status(200).json({ valid: true });

  } catch (err) {
    console.error('Validate error:', err);
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
}
