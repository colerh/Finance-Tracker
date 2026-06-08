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
    const { public_token } = JSON.parse(event.body || '{}');
    if (!public_token) {
      return { statusCode: 400, body: JSON.stringify({ error: 'public_token required' }) };
    }

    const response = await plaidClient.itemPublicTokenExchange({ public_token });

    return {
      statusCode: 200,
      body: JSON.stringify({ access_token: response.data.access_token }),
    };
  } catch (err) {
    const plaidErr = err.response?.data;
    console.error('exchange_token:', plaidErr?.error_code || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: plaidErr?.error_code || 'PLAID_ERROR' }),
    };
  }
};
