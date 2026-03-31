import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 8787;

app.use(cors({ origin: true }));
app.use(express.json());

async function sendResendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || 'VOID <onboarding@resend.dev>';
  if (!key) {
    const err = new Error('RESEND_API_KEY is not set');
    err.status = 500;
    throw err;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to: [to], subject, html })
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || 'Resend error');
    err.status = 502;
    throw err;
  }
}

app.post('/api/subscribe', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }

  const owner = process.env.OWNER_EMAIL || 'jabari2breezy@gmail.com';

  try {
    await sendResendEmail({
      to: email,
      subject: 'VOID — Thank you for joining',
      html: `<p style="font-family:system-ui,sans-serif;line-height:1.6">Thank you for joining VOID. Welcome to the void community.</p>`
    });
    await sendResendEmail({
      to: owner,
      subject: `VOID — New joiner: ${email}`,
      html: `<p style="font-family:system-ui,sans-serif;line-height:1.6"><strong>${email}</strong> has joined the void community.</p>`
    });
    return res.json({ ok: true });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ ok: false, error: e.message || 'Send failed' });
  }
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`VOID server: http://localhost:${PORT}`);
});
