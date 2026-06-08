/*
 * Local dev server — mirrors the Netlify Functions API exactly.
 * Run:  node server.js  →  http://localhost:3000
 * Needs: .env with PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV=sandbox
 * Sandbox test credentials: user_good / pass_good
 */
require('dotenv').config();
const express = require('express');
const path    = require('path');
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require('plaid');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
        'PLAID-SECRET':    process.env.PLAID_SECRET    || '',
      },
    },
  })
);

app.post('/api/create_link_token', async (req, res) => {
  try {
    const r = await plaidClient.linkTokenCreate({
      user:          { client_user_id: 'budget-app-user-001' },
      client_name:   'Budget Tracker',
      products:      [Products.Transactions],
      country_codes: [CountryCode.Us],
      language:      'en',
    });
    res.json({ link_token: r.data.link_token });
  } catch (err) {
    const e = err.response?.data;
    console.error('create_link_token:', e?.error_code || err.message);
    res.status(500).json({ error: e?.error_code || 'PLAID_ERROR' });
  }
});

app.post('/api/exchange_token', async (req, res) => {
  try {
    const { public_token } = req.body;
    if (!public_token) return res.status(400).json({ error: 'public_token required' });
    const r = await plaidClient.itemPublicTokenExchange({ public_token });
    res.json({ access_token: r.data.access_token });
  } catch (err) {
    const e = err.response?.data;
    console.error('exchange_token:', e?.error_code || err.message);
    res.status(500).json({ error: e?.error_code || 'PLAID_ERROR' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { access_token, cursor } = req.body;
    if (!access_token) return res.status(400).json({ error: 'access_token required' });

    const added = [], modified = [], removed = [];
    let nextCursor = cursor || '';
    let hasMore    = true;

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
    }

    res.json({ added, modified, removed, next_cursor: nextCursor });
  } catch (err) {
    const e = err.response?.data;
    console.error('transactions:', e?.error_code || err.message);
    res.status(500).json({ error: e?.error_code || 'PLAID_ERROR' });
  }
});

app.listen(3000, '127.0.0.1', () =>
  console.log('Budget Tracker → http://localhost:3000')
);
