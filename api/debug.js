// api/debug.js - temporary debug endpoint
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = '6RZN5-ZPS4T-LMPJN-B5ZCV';
  const fingerprint = 'testfp123';

  try {
    // Step 1 - Payhip check
    const payhipRes = await fetch(
      `https://payhip.com/api/v2/license/verify?license_key=${encodeURIComponent(key)}`,
      { headers: { 'product-secret-key': process.env.PAYHIP_SECRET_KEY } }
    );
    const payhipData = await payhipRes.json();
    const payhipOk = payhipData?.data?.enabled;

    // Step 2 - Supabase read
    const sbReadRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/license_keys?key=eq.${encodeURIComponent(key)}&select=*`,
      {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
      }
    );
    const sbReadData = await sbReadRes.json();

    // Step 3 - Supabase insert
    const sbInsertRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/license_keys`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ key, fingerprint, used: true, used_at: new Date().toISOString() }),
      }
    );
    const sbInsertStatus = sbInsertRes.status;
    const sbInsertText = await sbInsertRes.text();

    return res.status(200).json({
      payhip_ok: payhipOk,
      supabase_read_status: sbReadRes.status,
      supabase_rows: sbReadData,
      supabase_insert_status: sbInsertStatus,
      supabase_insert_response: sbInsertText,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
