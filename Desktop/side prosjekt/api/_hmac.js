// Delt HMAC-token-helper for marketplace-autentisering (upload/download).
// Signerer kortlevde tokens som beviser et (formål, subjekt)-krav, verifisert
// server-side med MARKETPLACE_TOKEN_SECRET. Trenger ingen DB/sesjon.
//
// Underscore-prefiks => Vercel behandler fila som delt kode, ikke et endepunkt.
//
// Bruk:
//   const { sign, verify } = require('./_hmac');
//   const token = sign({ purpose: 'download', productId, username }, 3600);
//   const claim = verify(token);            // null hvis ugyldig/utløpt
//   if (!claim || claim.purpose !== 'download' || claim.username !== username) deny();
const crypto = require('crypto');

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}
function secret() {
  var s = process.env.MARKETPLACE_TOKEN_SECRET;
  if (!s) throw new Error('MARKETPLACE_TOKEN_SECRET er ikke satt på serveren');
  return s;
}
function hmac(data) {
  return b64url(crypto.createHmac('sha256', secret()).update(data).digest());
}

// Signer en payload til en token som utløper om ttlSeconds (standard 1 time).
function sign(payload, ttlSeconds) {
  var body = Object.assign({}, payload, {
    exp: Math.floor(Date.now() / 1000) + (ttlSeconds || 3600),
  });
  var data = b64url(JSON.stringify(body));
  return data + '.' + hmac(data);
}

// Verifiser en token. Returnerer payloaden hvis gyldig + ikke utløpt, ellers null.
function verify(token) {
  if (typeof token !== 'string' || token.indexOf('.') < 0) return null;
  var parts = token.split('.');
  if (parts.length !== 2) return null;
  var data = parts[0], mac = parts[1];
  var expected = hmac(data);
  var a = Buffer.from(mac), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;  // konstant-tid
  var body;
  try { body = JSON.parse(b64urlDecode(data).toString('utf8')); } catch (e) { return null; }
  if (!body || typeof body.exp !== 'number' || body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}

module.exports = { sign, verify };
