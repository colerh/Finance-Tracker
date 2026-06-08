const PLAID_BASE = `https://${process.env.PLAID_ENV || 'sandbox'}.plaid.com`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const res = await fetch(`${PLAID_BASE}/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET':    process.env.PLAID_SECRET,
      },
      body: JSON.stringify({
        user:          { client_user_id: 'budget-app-user-001' },
        client_name:   'Budget Tracker',
        products:      ['transactions'],
        country_codes: ['US'],
        language:      'en',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return { statusCode: 200, body: JSON.stringify({ link_token: data.link_token }) };
  } catch (err) {
    console.error('create_link_token:', err.error_code || err);
    return { statusCode: 500, body: JSON.stringify({ error: err.error_code || 'PLAID_ERROR' }) };
  }
};
