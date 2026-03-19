// api/validate.js
// Validates license key with device fingerprinting.
// First use: saves fingerprint tied to key.
// Repeat use: only works if fingerprint matches (same device).

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { key, fingerprint } = req.body;

    if (!key) return res.status(400).json({ valid: false, error: 'No key provided' });
    if (!fingerprint) return res.status(400).json({ valid: false, error: 'No fingerprint provided' });

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

    // Key has no fingerprint yet — first time use, register this device
    if (!row.fingerprint) {
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
          body: JSON.stringify({
            fingerprint,
            used: true,
            used_at: new Date().toISOString(),
          }),
        }
      );
      return res.status(200).json({ valid: true });
    }

    // Key has a fingerprint — check if it matches
    if (row.fingerprint === fingerprint) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(200).json({
        valid: false,
        error: 'This key is registered to a different device.',
      });
    }

  } catch (err) {
    console.error('Validate error:', err);
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
}
