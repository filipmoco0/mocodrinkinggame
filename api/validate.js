// api/validate.js
// Validates license key directly against Payhip API + device fingerprinting via Supabase

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { key, fingerprint } = req.body;

    if (!key) return res.status(400).json({ valid: false, error: 'No key provided' });

    const cleanKey = key.toUpperCase().trim();

    // Step 1 — Verify key with Payhip API
    const payhipRes = await fetch(
      `https://payhip.com/api/v2/license/verify?license_key=${encodeURIComponent(cleanKey)}`,
      {
        headers: {
          'product-secret-key': process.env.PAYHIP_SECRET_KEY,
        },
      }
    );

    const payhipData = await payhipRes.json();

    // If Payhip says key is invalid or disabled
    if (!payhipData?.enabled) {
      return res.status(200).json({ valid: false, error: 'Key not found' });
    }

    // Step 2 — Check fingerprint in Supabase
    const sbRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/license_keys?key=eq.${encodeURIComponent(cleanKey)}&select=*`,
      {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    const rows = await sbRes.json();

    if (!rows.length) {
      // First time this key is used — save fingerprint
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/license_keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          key: cleanKey,
          fingerprint,
          used: true,
          used_at: new Date().toISOString(),
        }),
      });
      return res.status(200).json({ valid: true });
    }

    const row = rows[0];

    // Key exists — check fingerprint matches
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
