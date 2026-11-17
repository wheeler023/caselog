// Builds the installable phone app (wheeler023.github.io/caselog) from the same screens the Google page uses.
// Usage: node build.js <script.gs> <API url> <outdir>
const fs = require('fs'), vm = require('vm');
const [src, API, out] = process.argv.slice(2);
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(src, 'utf8') + ';this.H = WD_HTML; this.APP = CONFIG.APP_URL;', ctx);
let h = ctx.H;
const head = `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0B1033"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="robots" content="noindex, nofollow"><title>Case Log</title>
<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png?v=2">`;
if (!h.includes('<base target="_top">')) throw new Error('head marker missing');
h = h.replace('<base target="_top">', '<base target="_top">' + head);
const shim = `<div id="splash"><img src="icon-192.png" alt=""><div id="splashMsg"></div></div>
<style>#splash{position:fixed;inset:0;z-index:9999;background:#161718;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#CAD1E6;font:15px/1.45 -apple-system,Roboto,sans-serif;text-align:center;padding:24px}
#splash img{width:96px;height:96px;border-radius:50%}#splash a,#splash button{color:#fff;font:inherit;font-weight:700;border:1.5px solid #fff;border-radius:10px;padding:10px 16px;background:transparent;text-decoration:none;margin-top:6px}</style>
<script>
// Phone-app plumbing: every call the screens make to Google goes to the case-log script over HTTPS with this phone's key.
window.__PHONE = true;
var API = ${JSON.stringify(API)}, GOOGLE_APP = ${JSON.stringify(ctx.APP)}, KEY = 'caselog_key', SAVED = 'caselog_last';
function takePairing() { var m = location.hash.match(/pair=([a-f0-9]{48,})/); if (!m) return false; try { localStorage.removeItem(SAVED); localStorage.setItem(KEY, m[1]); } catch (e) {} history.replaceState(null, '', location.pathname); return true; }
takePairing();
window.addEventListener('hashchange', function () { if (takePairing()) location.reload(); });
function apiKey() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
var QUIPS = ['Loading a dope-ass app…', 'Decompressing your schedule…', 'Fusing the data…', 'Checking neuromonitoring signals…', 'Placing screws in the spreadsheet…', 'Confirming level on fluoro…'];
function quip() { return QUIPS[Math.floor(Math.random() * QUIPS.length)]; }
document.getElementById('splashMsg').textContent = quip();
function splash(html) { document.getElementById('splashMsg').innerHTML = html; document.getElementById('splash').style.display = 'flex'; }
function needPairing() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(SAVED); } catch (e) {}
  if (window.__STARTED) return location.reload();
  splash('This phone isn’t set up yet.<br>Paste the setup link you were sent:' +
    '<input id="pairIn" placeholder="https://wheeler023.github.io/caselog/#pair=…" style="width:100%;max-width:340px;margin-top:6px;padding:10px;border-radius:10px;border:1.5px solid #555C6B;background:transparent;color:#fff;font:13px monospace">' +
    '<div><button onclick="pastePair()">Paste</button> <button onclick="usePair()">Use link</button></div>' +
    '<div style="font-size:13px;color:#828A9A;margin-top:8px">Dr. Wheeler: open your Case Log in Google and tap <b>Set up phone app</b>.</div>');
}
function usePair() {
  var v = (document.getElementById('pairIn').value || '').trim(), m = v.match(/pair=([a-f0-9]{48,})/);
  if (!m) { document.getElementById('pairIn').style.borderColor = '#EE614F'; return; }
  try { localStorage.removeItem(SAVED); localStorage.setItem(KEY, m[1]); } catch (e) {}
  boot();
}
function pastePair() {
  if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) { document.getElementById('pairIn').value = t; usePair(); }, function () { document.getElementById('pairIn').focus(); });
  else document.getElementById('pairIn').focus();
}
function callApi(fn, args) {
  return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ k: apiKey(), fn: fn, args: args }) })
    .then(function (r) { return r.json(); })
    .then(function (j) { if (j.error === 'not paired') { needPairing(); throw new Error('This phone isn’t set up.'); } if (j.error) throw new Error(j.error); return j.ok; });
}
function runner(ok, fail) {
  return new Proxy({}, { get: function (_, name) {
    if (name === 'withSuccessHandler') return function (f) { return runner(f, fail); };
    if (name === 'withFailureHandler') return function (f) { return runner(ok, f); };
    return function () { var a = [].slice.call(arguments); callApi(name, a).then(function (r) { if (ok) ok(r); }, function (e) { if (fail) fail(e); else console.warn(e); }); };
  } });
}
window.google = { script: { get run() { return runner(); } } };
// The last opening screen is kept on this phone so the app opens at once; fresh data replaces it a moment later.
function localDay() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function loadSaved() {
  try {
    var o = JSON.parse(localStorage.getItem(SAVED) || 'null');
    if (!o || o.k !== apiKey() || !o.init) return null;
    var init = o.init, t = localDay();
    if (init.today !== t) { if (init.today.slice(0, 7) !== t.slice(0, 7)) init.month = null; init.today = t; init.first = null; }
    return init;
  } catch (e) { return null; }
}
function save(init) { try { localStorage.setItem(SAVED, JSON.stringify({ k: apiKey(), init: init })); } catch (e) {} }
function start(init) {
  window.__INIT = init; window.__STARTED = true;
  (0, eval)(document.getElementById('appjs').textContent);
  document.getElementById('splash').style.display = 'none';
}
function freshen(f) {   // drop the fresh opening data into the screens already showing
  if (f.role !== window.__INIT.role) return location.reload();
  try { if (f.month) storeMonth(f.month); if (f.todo) drawTodo(f.todo); if (f.first) show(f.first); drawWeek(day); } catch (e) { console.warn(e); }
}
function boot() {
  if (!apiKey()) return needPairing();
  var saved = loadSaved();
  if (saved) start(saved); else splash(quip());
  callApi('init', []).then(function (init) {
    init.icon = 'icon-192.png'; save(init);
    if (window.__STARTED) freshen(init); else start(init);
  }).catch(function (e) {
    if (!window.__STARTED && apiKey()) splash('Couldn’t reach your case log (' + e.message + ').<br><button onclick="boot()">Try again</button>');
  });
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
</script>`;
const marker = '<script>\nvar INIT = __INIT__;';
if (!h.includes(marker)) throw new Error('script marker missing');
h = h.replace(marker, shim + '\n<script type="text/plain" id="appjs">\nvar INIT = window.__INIT;');
h = h.replace('</body>', '<script>boot();</script></body>');
if (!h.includes('<script>boot();</script>')) throw new Error('body end missing');
fs.writeFileSync(out + '/index.html', h);
console.log('built', h.length);
