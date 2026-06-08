const PLAID_BASE = `https://${process.env.PLAID_ENV || 'sandbox'}.plaid.com`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { public_token } = JSON.parse(event.body || '{}');
    if (!public_token) return { statusCode: 400, body: JSON.stringify({ error: 'public_token required' }) };
    const res = await fetch(`${PLAID_BASE}/item/public_token/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET':    process.env.PLAID_SECRET,
      },
      body: JSON.stringify({ public_token }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return { statusCode: 200, body: JSON.stringify({ access_token: data.access_token }) };
  } catch (err) {
    console.error('exchange_token:', err.error_code || err);
    return { statusCode: 500, body: JSON.stringify({ error: err.error_code || 'PLAID_ERROR' }) };
  }
};
