// api/debug.js
// Temporary debug endpoint - DELETE after fixing

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = req.query.key || '6RZN5-ZPS4T-LMPJN-B5ZCV';

  try {
    const payhipRes = await fetch(
      `https://payhip.com/api/v2/license/verify?license_key=${encodeURIComponent(key)}`,
      {
        method: 'GET',
        headers: { 'product-secret-key': process.env.PAYHIP_SECRET_KEY },
      }
    );

    const text = await payhipRes.text();

    return res.status(200).json({
      status: payhipRes.status,
      payhip_secret_set: !!process.env.PAYHIP_SECRET_KEY,
      raw_response: text,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
