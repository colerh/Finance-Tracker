const PLAID_BASE = `https://${process.env.PLAID_ENV || 'sandbox'}.plaid.com`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { access_token, cursor } = JSON.parse(event.body || '{}');
    if (!access_token) return { statusCode: 400, body: JSON.stringify({ error: 'access_token required' }) };

    let added = [], modified = [], removed = [], next_cursor = cursor || null, accounts = [];
    let has_more = true;

    while (has_more) {
      const reqBody = {
        access_token,
        options: { include_personal_finance_category: true },
      };
      if (next_cursor) reqBody.cursor = next_cursor;

      const res = await fetch(`${PLAID_BASE}/transactions/sync`, {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET':    process.env.PLAID_SECRET,
        },
        body: JSON.stringify(reqBody),
      });
      const data = await res.json();
      if (!res.ok) throw data;

      added.push(...(data.added || []));
      modified.push(...(data.modified || []));
      removed.push(...(data.removed || []));
      next_cursor = data.next_cursor;
      has_more = data.has_more;
      if (!accounts.length && data.accounts) accounts = data.accounts;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ added, modified, removed, next_cursor, accounts }),
    };
  } catch (err) {
    console.error('transactions:', err.error_code || err);
    return { statusCode: 500, body: JSON.stringify({ error: err.error_code || 'PLAID_ERROR' }) };
  }
};
