// One-shot probe: reads WHOP_API_KEY from .dev.vars via Vite-style injection.
// No secrets are logged — only status and a truncated, redacted body snippet.
import fs from 'node:fs';
const devVars = fs.readFileSync('.dev.vars', 'utf8');
const match = devVars.match(/WHOP_API_KEY=([^.\r\n]+)/);
const apiKey = match ? match[1].trim() : (process.env.WHOP_API_KEY ?? null);
if (!apiKey) { console.error('NO_KEY'); process.exit(1); }
const requestId = `est_probe_${Date.now()}`;
const payload = {
  account_id: 'biz_wHs7ScZ5eHIZrH', product_id: 'prod_UxTHDvkWPVf68',
  metadata: { request_id: requestId, name: 'Probe', source: 'test' },
  referrer: 'https://summitaa.whop.site/'
};
console.log('REQUEST_ID=', requestId, 'KEY_PRESENT=', !!apiKey, 'KEY_LEN=', apiKey.length);
try {
  const res = await fetch('https://api.whop.com/api/v1/leads', {
    method: 'POST', headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json', accept: 'application/json',
      'Idempotency-Key': `lead-${requestId}`
    }, body: JSON.stringify(payload)
  });
  const text = await res.text();
  console.log('STATUS=', res.status, 'BODY_START=', text.slice(0, 500).replace(/[A-Za-z0-9_-]{20,}/g, '[redacted]'));
} catch (e) { console.error('FETCH_ERR=', e.message); }
