// api/webhook.js
// Receives Payhip webhook when someone buys, saves their license key to Supabase

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { license_key, product_id, buyer_email } = req.body;

    if (!license_key) {
      return res.status(400).json({ error: 'No license key provided' });
    }

    // Save key to Supabase
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/license_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        key: license_key.toUpperCase().trim(),
        email: buyer_email || null,
        product_id: product_id || null,
        used: false,
        created_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase error:', err);
      return res.status(500).json({ error: 'Failed to save key' });
    }

    console.log(`✔ Key saved: ${license_key}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
