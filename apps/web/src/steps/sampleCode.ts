// A deliberately flawed sample so the check can be tried without one's own code.
// The UI labels it as a sample; the check itself still runs for real on it.
export const SAMPLE_CODE = `=== server.js ===
const express = require('express');
const db = require('./db');

const GEMINI_API_KEY = "AIzaSyD-sample-key-1234567890";
const app = express();
app.use(express.json());

app.post('/members', async (req, res) => {
  await db.query("INSERT INTO members (name, phone) VALUES ('" + req.body.name + "', '" + req.body.phone + "')");
  res.json({ ok: true });
});

app.get('/members/:id', async (req, res) => {
  try {
    const member = await db.query('SELECT * FROM members WHERE id = ' + req.params.id);
    res.json(member);
  } catch (e) {}
});

app.post('/remind', async (req, res) => {
  const unpaid = await db.query('SELECT * FROM members WHERE paid = 0');
  for (const m of unpaid) await sendSms(m.phone, '회비를 내주세요');
  res.json({ sent: unpaid.length });
});

app.listen(3000);
`;
