const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require('plaid');

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
    const response = await plaidClient.linkTokenCreate({
      user:          { client_user_id: 'budget-app-user-001' },
      client_name:   'Budget Tracker',
      products:      [Products.Transactions],
      country_codes: [CountryCode.Us],
      language:      'en',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ link_token: response.data.link_token }),
    };
  } catch (err) {
    const plaidErr = err.response?.data;
    console.error('create_link_token:', plaidErr?.error_code || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: plaidErr?.error_code || 'PLAID_ERROR' }),
    };
  }
};
