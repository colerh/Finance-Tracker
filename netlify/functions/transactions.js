const PLAID_BASE = `https://${process.env.PLAID_ENV || 'sandbox'}.plaid.com`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { access_token } = JSON.parse(event.body || '{}');
    if (!access_token) return { statusCode: 400, body: JSON.stringify({ error: 'access_token required' }) };
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const fmt   = d => d.toISOString().split('T')[0];
    const res = await fetch(`${PLAID_BASE}/transactions/get`, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET':    process.env.PLAID_SECRET,
      },
      body: JSON.stringify({
        access_token,
        start_date: fmt(start),
        end_date:   fmt(now),
        options: { count: 500, include_personal_finance_category: true },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return { statusCode: 200, body: JSON.stringify({ transactions: data.transactions, accounts: data.accounts }) };
  } catch (err) {
    console.error('transactions:', err.error_code || err);
    return { statusCode: 500, body: JSON.stringify({ error: err.error_code || 'PLAID_ERROR' }) };
  }
};
