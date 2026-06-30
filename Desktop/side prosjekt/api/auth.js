// api/auth.js — Server-side kontolagring (sannhetskilden for innlogging).
//
// Erstatter den gamle «brukere kun i localStorage»-modellen. Alle kontoer ligger nå
// i Supabase-tabellen public.accounts (se supabase/migrations/0003_accounts.sql),
// med global unik e-post. Det fikser:
//   • samme e-post kan ikke registreres flere ganger (DB-unikhet, ikke per nettleser)
//   • kontoer overlever på tvers av enheter/nettlesere
//   • «glemt passord» finner kontoen ekte
//   • aktivering virker på tvers av enheter
//
// Passord hashes med scrypt (salt:hash) og forlater ALDRI serveren. Aktiverings- og
// tilbakestillings-tokens sendes kun via e-post (server-side) — aldri tilbake til
// nettleseren — så ingen kan ta over en konto ved å lese API-svaret.
//
// Ett samlet endepunkt (?action=…) for å holde oss under Vercels 12-funksjoners-grense.

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { Resend } = require('resend');
const { activationHtml, resetHtml } = require('./send-email');

const CANONICAL_URL = 'https://www.soundcoredevelopment.com';

// ── Validering (speiler reglene i js/auth.js register) ──────────────────────
const USERNAME_RE = /^[a-zA-Z0-9_]+$/;
const SPECIAL_RE  = /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?~`]/;

function validateRegister({ username, password, email }) {
  if (!username || username.length < 3) return 'Brukernavn må være minst 3 tegn';
  if (!USERNAME_RE.test(username))      return 'Brukernavn kan bare ha bokstaver, tall og _';
  if (!password || password.length < 6) return 'Passord må være minst 6 tegn';
  if (!SPECIAL_RE.test(password))       return 'Passord må inneholde minst ett spesialtegn (f.eks. !@#$%)';
  if (!email || !email.includes('@'))   return 'Ugyldig e-postadresse';
  return null;
}
function validatePassword(password) {
  if (!password || password.length < 6) return 'Passord må være minst 6 tegn';
  if (!SPECIAL_RE.test(password))       return 'Passord må inneholde minst ett spesialtegn (f.eks. !@#$%)';
  return null;
}

// ── Passord-hashing (scrypt, innebygd i Node — ingen ekstra avhengighet) ────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  let test;
  try { test = crypto.scryptSync(password, salt, 64).toString('hex'); }
  catch { return false; }
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function newToken(len = 40) { return crypto.randomBytes(len).toString('hex'); }

// Sant når feilen betyr at accounts-tabellen ikke finnes ennå (migrasjon ikke kjørt).
function tableMissing(error) {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205'
    || /does not exist|schema cache|find the table/i.test(error.message || '');
}

// Kun trygge, offentlige felt går tilbake til nettleseren (aldri passord/tokens).
function publicUser(row) {
  if (!row) return null;
  return {
    username:    row.username,
    displayName: row.display_name || row.username,
    email:       row.email,
    role:        row.role || 'lytter',
    activated:   !!row.activated,
    createdAt:   row.created_at || Date.now(),
  };
}

// ── Server-side e-postutsending (gjenbruker malene fra send-email.js) ───────
async function sendAccountEmail(type, toEmail, toName, token) {
  if (!process.env.RESEND_API_KEY) return { error: 'E-post er ikke konfigurert på serveren' };
  const siteUrl   = (process.env.SITE_URL || CANONICAL_URL).replace(/\/$/, '');
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Sound Core <onboarding@resend.dev>';
  const resend    = new Resend(process.env.RESEND_API_KEY);

  let subject, html;
  if (type === 'activation') {
    subject = `Aktiver Sound Core-kontoen din, ${toName}!`;
    html    = activationHtml(toName, `${siteUrl}/#/activate/${token}`, siteUrl);
  } else {
    subject = 'Tilbakestill passordet ditt på Sound Core';
    html    = resetHtml(toName, `${siteUrl}/#/reset/${token}`);
  }
  try {
    // Resend v6 kaster ikke ved API-feil — returnerer { data, error }.
    const { data, error } = await resend.emails.send({ from: fromEmail, to: toEmail, subject, html });
    if (error) return { error: error.message || 'Resend kunne ikke sende e-posten' };
    return { success: true, id: data?.id };
  } catch (e) {
    return { error: e?.message || 'Kunne ikke sende e-post' };
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────
async function register(db, body) {
  const username    = String(body.username || '').trim();
  const email       = String(body.email || '').toLowerCase().trim();
  const displayName = String(body.displayName || '').trim() || username;
  const password    = body.password || '';
  const role        = body.role || 'lytter';

  const err = validateRegister({ username, password, email });
  if (err) return { status: 400, body: { error: err } };

  // Eksplisitte forhåndssjekker gir presise feilmeldinger (i tillegg til DB-unikhet).
  const { data: byName } = await db.from('accounts').select('username').eq('username', username).maybeSingle();
  if (byName) return { status: 409, body: { error: 'Brukernavn er tatt' } };

  const { data: byEmail } = await db.from('accounts').select('username').ilike('email', email).maybeSingle();
  if (byEmail) return { status: 409, body: { error: 'E-postadressen er allerede i bruk' } };

  const activationToken = newToken();
  const row = {
    username,
    email,
    password_hash:    hashPassword(password),
    display_name:     displayName,
    role,
    activated:        false,
    activation_token: activationToken,
    created_at:       Date.now(),
  };

  const { data, error } = await db.from('accounts').insert(row).select().single();
  if (error) {
    // Unik-constraint kan slå til ved samtidige registreringer.
    if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) {
      return { status: 409, body: { error: 'Brukernavn eller e-post er allerede i bruk' } };
    }
    return { status: 500, body: { error: 'Kunne ikke opprette konto' } };
  }

  // Send aktiverings-e-post server-side. Tokenet returneres ALDRI til klienten.
  const mail = await sendAccountEmail('activation', email, displayName, activationToken);
  return {
    status: 201,
    body: {
      success: true,
      needsActivation: true,
      user: publicUser(data),
      emailSent: !!mail.success,
      emailError: mail.error || null,
    },
  };
}

async function login(db, body) {
  const id   = String(body.usernameOrEmail || body.username || '').trim();
  const pass = body.password || '';
  if (!id || !pass) return { status: 400, body: { error: 'Mangler brukernavn/e-post eller passord' } };

  // Slå opp på brukernavn ELLER e-post.
  let { data: row } = await db.from('accounts').select('*').eq('username', id).maybeSingle();
  if (!row) ({ data: row } = await db.from('accounts').select('*').ilike('email', id.toLowerCase()).maybeSingle());

  if (!row)                              return { status: 401, body: { error: 'Bruker finnes ikke' } };
  if (!verifyPassword(pass, row.password_hash)) return { status: 401, body: { error: 'Feil passord' } };
  if (!row.activated) return { status: 403, body: { error: 'Konto ikke aktivert. Sjekk e-posten din.', notActivated: true } };

  return { status: 200, body: { success: true, user: publicUser(row) } };
}

async function activate(db, body) {
  const token = String(body.token || '').trim();
  if (!token) return { status: 400, body: { error: 'Mangler token' } };

  const { data: row } = await db.from('accounts').select('*').eq('activation_token', token).maybeSingle();
  if (!row) return { status: 400, body: { error: 'Ugyldig eller utløpt aktiveringslenke' } };

  const { data, error } = await db.from('accounts')
    .update({ activated: true, activation_token: null })
    .eq('username', row.username).select().single();
  if (error) return { status: 500, body: { error: 'Kunne ikke aktivere kontoen' } };

  return { status: 200, body: { success: true, user: publicUser(data) } };
}

async function forgot(db, body) {
  const email = String(body.email || '').toLowerCase().trim();
  // Avslører ALDRI om e-posten finnes (hindrer kontooppramsing). Sender e-post
  // kun hvis kontoen finnes, men svarer alltid generisk «success».
  if (email && email.includes('@')) {
    const { data: row } = await db.from('accounts').select('*').ilike('email', email).maybeSingle();
    if (row) {
      const token = newToken();
      await db.from('accounts')
        .update({ reset_token: token, reset_expiry: Date.now() + 3600_000 })
        .eq('username', row.username);
      await sendAccountEmail('reset', row.email, row.display_name || row.username, token);
    }
  }
  return { status: 200, body: { success: true } };
}

async function reset(db, body) {
  const token = String(body.token || '').trim();
  const pass  = body.password || '';
  const err = validatePassword(pass);
  if (err) return { status: 400, body: { error: err } };
  if (!token) return { status: 400, body: { error: 'Ugyldig eller utløpt lenke' } };

  const { data: row } = await db.from('accounts').select('*').eq('reset_token', token).maybeSingle();
  if (!row) return { status: 400, body: { error: 'Ugyldig eller utløpt lenke' } };
  if (!row.reset_expiry || Date.now() > Number(row.reset_expiry)) {
    return { status: 400, body: { error: 'Lenken har utløpt. Be om ny.' } };
  }

  const { error } = await db.from('accounts')
    .update({ password_hash: hashPassword(pass), reset_token: null, reset_expiry: null })
    .eq('username', row.username);
  if (error) return { status: 500, body: { error: 'Kunne ikke oppdatere passordet' } };

  return { status: 200, body: { success: true } };
}

async function resend(db, body) {
  const id = String(body.usernameOrEmail || body.username || body.email || '').trim();
  if (!id) return { status: 400, body: { error: 'Mangler brukernavn eller e-post' } };

  let { data: row } = await db.from('accounts').select('*').eq('username', id).maybeSingle();
  if (!row) ({ data: row } = await db.from('accounts').select('*').ilike('email', id.toLowerCase()).maybeSingle());

  // Generisk svar (ikke avslør eksistens). Gjør jobben kun hvis konto finnes + uaktivert.
  if (row && !row.activated) {
    let token = row.activation_token;
    if (!token) {
      token = newToken();
      await db.from('accounts').update({ activation_token: token }).eq('username', row.username);
    }
    const mail = await sendAccountEmail('activation', row.email, row.display_name || row.username, token);
    return { status: 200, body: { success: true, emailSent: !!mail.success, emailError: mail.error || null } };
  }
  return { status: 200, body: { success: true } };
}

const ACTIONS = { register, login, activate, forgot, reset, resend };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    // 503 → klienten faller pent tilbake til lokal modus (utvikling/ikke konfigurert).
    return res.status(503).json({ error: 'Kontolagring er ikke konfigurert på serveren' });
  }

  const action = String((req.query && req.query.action) || (req.body && req.body.action) || '').trim();
  const handler = ACTIONS[action];
  if (!handler) return res.status(400).json({ error: 'Ukjent eller manglende action' });

  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Provisjonerings-sjekk: er accounts-tabellen opprettet? Hvis IKKE (migrasjonen
    // 0003 er ikke kjørt ennå), svar 503 → klienten faller trygt tilbake til den
    // gamle lokale modusen, så live-siden oppfører seg akkurat som før i stedet for
    // å bryte innloggingen. Når migrasjonen kjøres, flipper den automatisk over til
    // server-kontoer uten ny deploy. (Logges server-side så vi vet at den mangler.)
    const probe = await db.from('accounts').select('username').limit(1);
    if (tableMissing(probe.error)) {
      console.warn('accounts-tabellen finnes ikke ennå — kjør supabase/migrations/0003_accounts.sql. Faller tilbake til lokal modus.');
      return res.status(503).json({ error: 'Kontolagring ikke provisjonert', notProvisioned: true });
    }

    const body = req.body || {};
    const { status, body: out } = await handler(db, body);
    return res.status(status).json(out);
  } catch (e) {
    console.error('auth-feil:', e);
    return res.status(500).json({ error: 'Serverfeil i innlogging' });
  }
};

// Eksponert for testing (tools/test-auth-server.js) — påvirker ikke produksjon.
module.exports._helpers = {
  validateRegister, validatePassword, hashPassword, verifyPassword, newToken, publicUser, ACTIONS,
};
