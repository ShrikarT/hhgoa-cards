/**
 * GET /c/:id  ->  rewritten by vercel.json to /api/c?id=:id
 *
 * Renders the unfurl page for a graded card. This is the piece that makes a
 * tweet show a full-bleed image: X reads twitter:card=summary_large_image and
 * og:image from HTML, never from the intent URL.
 *
 * No database. Metadata comes from the JSON sidecar written by /api/card.
 */
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async function handler(req, res) {
  const id = String((req.query && req.query.id) || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16);
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const base = String(process.env.PUBLIC_BASE || (proto + '://' + req.headers.host)).replace(/\/$/, '');
  const cdn = base;

  if (!id) {
    res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><meta charset="utf-8"><title>Card not found</title>');
  }

  let meta = {};
  try {
    const r = await fetch(cdn + '/i/' + id + '.json', { cache: 'no-store' });
    if (r.ok) meta = await r.json();
  } catch (e) {
    // fall through with empty metadata - the image still unfurls
  }

  const img = cdn + '/i/' + id + '.png';
  const name = meta.n || 'A BUILDER';
  const cls = meta.c || 'HH GOA CLASS OF 2026';
  const tier = meta.t || 'GRADED';
  const craft = meta.k || '';
  const serial = meta.s || '';

  const title = name + ' - ' + tier + ' - Hacker House Goa 2026';
  const desc =
    cls + (craft ? ' \u00B7 ' + craft : '') + (serial ? ' \u00B7 ' + serial : '') +
    ' \u00B7 Graded MINT 10 by the HHG Grading Bureau. Mint your own card. #FrameInGoa';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="theme-color" content="#05341C" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="HHG Grading Bureau" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${esc(base + '/c/' + id)}" />
<meta property="og:image" content="${esc(img)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="1950" />
<meta property="og:image:alt" content="${esc(name + ' graded builder card')}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(img)}" />

<style>
  :root{ --ink:#06301A; --g900:#05341C; --g700:#0F7A41; --yel:#F7DE18; --cream:#FFFDF4; }
  *{ box-sizing:border-box; }
  body{ margin:0; min-height:100vh; display:grid; place-items:center; padding:32px 18px;
    background:radial-gradient(120% 80% at 50% 0%, var(--g700), var(--g900));
    color:var(--cream); font-family:"Trebuchet MS",system-ui,sans-serif; text-align:center; }
  .wrap{ display:grid; gap:20px; justify-items:center; max-width:520px; }
  img{ width:min(84vw,430px); height:auto; border-radius:18px;
    box-shadow:0 30px 70px -18px rgba(0,0,0,.75); }
  h1{ margin:0; font-size:clamp(22px,5vw,34px); font-weight:900; letter-spacing:-.03em; }
  p{ margin:0; opacity:.82; font-size:14px; letter-spacing:.05em; }
  .cert{ font-family:ui-monospace,Consolas,monospace; font-size:11px; letter-spacing:.2em;
    color:var(--yel); }
  a.btn{ display:inline-block; text-decoration:none; background:var(--yel); color:var(--ink);
    font-weight:800; font-size:14px; padding:14px 24px; border-radius:14px;
    border:3px solid var(--ink); box-shadow:0 6px 0 var(--ink); }
</style>
</head>
<body>
  <main class="wrap">
    <img src="${esc(img)}" alt="${esc(name)} graded builder card" width="1200" height="1950" />
    <h1>${esc(name)}</h1>
    <p>${esc(cls)}</p>
    <p class="cert">${esc(tier)}${craft ? ' \u00B7 ' + esc(craft) : ''}${serial ? ' \u00B7 ' + esc(serial) : ''}</p>
    <a class="btn" href="${esc(base)}/">MINT YOUR OWN CARD \u2192</a>
    <p class="cert">#FRAMEINGOA</p>
  </main>
</body>
</html>`);
}
