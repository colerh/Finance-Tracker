const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET':    process.env.PLAID_SECRET,
      },
    },
  })
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { access_token, cursor } = JSON.parse(event.body || '{}');
    if (!access_token) {
      return { statusCode: 400, body: JSON.stringify({ error: 'access_token required' }) };
    }

    const added    = [];
    const modified = [];
    const removed  = [];
    let   nextCursor = cursor || '';
    let   hasMore    = true;
    let   accounts   = [];

    while (hasMore) {
      const resp = await plaidClient.transactionsSync({
        access_token,
        cursor:  nextCursor,
        options: { include_personal_finance_category: true },
      });
      added.push(...resp.data.added);
      modified.push(...resp.data.modified);
      removed.push(...resp.data.removed);
      nextCursor = resp.data.next_cursor;
      hasMore    = resp.data.has_more;
      if (resp.data.accounts?.length) accounts = resp.data.accounts;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ added, modified, removed, next_cursor: nextCursor, accounts }),
    };
  } catch (err) {
    const plaidErr = err.response?.data;
    console.error('transactions sync:', plaidErr?.error_code || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: plaidErr?.error_code || 'PLAID_ERROR' }),
    };
  }
};
