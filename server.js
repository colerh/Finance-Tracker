/*
 * Local development alternative to Netlify Functions.
 * Run: node server.js  →  http://localhost:3000
 *
 * Requires a .env file with PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV
 * Sandbox test credentials: user_good / pass_good
 */
require('dotenv').config();
const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const PLAID_BASE  = `https://${process.env.PLAID_ENV || 'sandbox'}.plaid.com`;
const PLAID_CREDS = {
  'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
  'PLAID-SECRET':    process.env.PLAID_SECRET    || '',
};

async function plaidPost(endpoint, body) {
  const res  = await fetch(`${PLAID_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...PLAID_CREDS },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) { const err = new Error(data.error_message || 'Plaid error'); err.plaid = data; throw err; }
  return data;
}

app.post('/api/create_link_token', async (req, res) => {
  try {
    const data = await plaidPost('/link/token/create', {
      user: { client_user_id: 'budget-app-user-001' },
      client_name: 'Budget Tracker', products: ['transactions'],
      country_codes: ['US'], language: 'en',
    });
    res.json({ link_token: data.link_token });
  } catch (err) { res.status(500).json({ error: err.plaid?.error_code || err.message }); }
});

app.post('/api/exchange_token', async (req, res) => {
  try {
    const { public_token } = req.body;
    if (!public_token) return res.status(400).json({ error: 'public_token required' });
    const data = await plaidPost('/item/public_token/exchange', { public_token });
    res.json({ access_token: data.access_token });
  } catch (err) { res.status(500).json({ error: err.plaid?.error_code || err.message }); }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'access_token required' });
    const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1);
    const fmt = d => d.toISOString().split('T')[0];
    const data = await plaidPost('/transactions/get', {
      access_token, start_date: fmt(start), end_date: fmt(now),
      options: { count: 500, include_personal_finance_category: true },
    });
    res.json({ transactions: data.transactions, accounts: data.accounts });
  } catch (err) { res.status(500).json({ error: err.plaid?.error_code || err.message }); }
});

app.listen(3000, '127.0.0.1', () => console.log('Budget Tracker → http://localhost:3000'));
