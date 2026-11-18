import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const META_URL = 'https://stat.unido.org/portal/dataset/getDataset/CIP';
const DATA_URL = 'https://stat.unido.org/portal/dataset/getDataWithoutActivities';
const COUNTRIES = [
  { name: 'السعودية', iso3: 'SAU', flag: '🇸🇦' },
  { name: 'مصر', iso3: 'EGY', flag: '🇪🇬' },
  { name: 'تركيا', iso3: 'TUR', flag: '🇹🇷' },
  { name: 'إندونيسيا', iso3: 'IDN', flag: '🇮🇩' },
  { name: 'ماليزيا', iso3: 'MYS', flag: '🇲🇾' }
];
const VARIABLES = ['cip', 'cipRank'];
const CACHE_MS = 15 * 60 * 1000;
let cache = { at: 0, value: null };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon'
};

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}


async function fetchRaw(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json, text/plain, */*', 'User-Agent': 'Industrial-Intelligence-CIP-Research/1.0', ...(options.headers || {}) }, signal: AbortSignal.timeout(25000) });
  return { status: response.status, ok: response.ok, contentType: response.headers.get('content-type'), text: await response.text() };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'Industrial-Intelligence-CIP-Research/1.0',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(25000)
  });
  const text = await response.text();
  if (!response.ok) {
    const detail = text.slice(0, 500).replace(/\s+/g, ' ');
    throw new Error(`UNIDO returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  try { return JSON.parse(text); }
  catch { throw new Error(`UNIDO returned a non-JSON response: ${text.slice(0, 250)}`); }
}

function latestObservation(payload, wantedCode) {
  // Current UNIDO CIP response schema: { data: [{ p: "2024", c: "cip", v: 0.1 }, ...], ym: [], vm: [] }
  // p = period/year, c = indicator code, v = observation value.
  const observations = Array.isArray(payload?.data) ? payload.data : [];
  const matches = observations
    .filter(item => String(item?.c ?? '').toLowerCase() === wantedCode.toLowerCase())
    .map(item => {
      const yearMatch = String(item?.p ?? '').match(/\d{4}/);
      const value = Number(item?.v);
      return yearMatch && item?.v !== null && item?.v !== '' && Number.isFinite(value)
        ? { year: Number(yearMatch[0]), value }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.year - a.year);
  return matches[0] || null;
}

async function loadCip({ force = false } = {}) {
  if (!force && cache.value && Date.now() - cache.at < CACHE_MS) return cache.value;
  const metadata = await fetchJson(META_URL);
  const datasetId = metadata?.id ?? metadata?.datasetId ?? metadata?.databaseId;
  if (datasetId == null) throw new Error('UNIDO metadata response did not contain a dataset ID.');
  if (!Array.isArray(metadata.countries)) throw new Error('UNIDO metadata response did not contain a countries array.');
  const periods = Array.isArray(metadata.periods) ? metadata.periods.slice(-10).map(String) : [];
  const results = await Promise.all(COUNTRIES.map(async country => {
    const metaCountry = metadata.countries.find(item => String(item.iso3 || '').toUpperCase() === country.iso3);
    if (!metaCountry?.c) return { ...country, error: 'Country code was not found in UNIDO metadata.' };
    try {
      const payload = await fetchJson(DATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId, countryCode: metaCountry.c, fullPrecision: true, variableCodes: VARIABLES, periods })
      });
      const score = latestObservation(payload, 'cip');
      const rank = latestObservation(payload, 'cipRank');
      if (!score) return { ...country, unidoCode: metaCountry.c, error: 'The UNIDO response contained no parsable CIP observation.', diagnostic: 'Data request succeeded, but the response structure did not match the current observation parser.' };
      return { ...country, unidoCode: metaCountry.c, score, rank };
    } catch (error) {
      return { ...country, unidoCode: metaCountry.c, error: error.message };
    }
  }));
  const value = {
    source: 'UNIDO Statistics Portal — Competitive Industrial Performance (CIP)',
    datasetId,
    availablePeriods: periods,
    fetchedAt: new Date().toISOString(),
    countries: results
  };
  cache = { at: Date.now(), value };
  return value;
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) return send(res, 403, 'Forbidden');
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return send(res, 404, 'Not found');
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { send(res, 404, 'Not found'); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { ok: true, service: 'industrial-intelligence-local-api', upstream: 'UNIDO CIP' });
  }
  if (req.method === 'GET' && url.pathname === '/api/cip/debug') {
    try {
      const iso3 = String(url.searchParams.get('country') || 'SAU').toUpperCase();
      const country = COUNTRIES.find(item => item.iso3 === iso3);
      if (!country) return send(res, 400, { error: 'Unsupported country. Use SAU, EGY, TUR, IDN, or MYS.' });
      const metadata = await fetchJson(META_URL);
      const datasetId = metadata?.id ?? metadata?.datasetId ?? metadata?.databaseId;
      const metaCountry = metadata?.countries?.find(item => String(item.iso3 || '').toUpperCase() === iso3);
      if (datasetId == null || !metaCountry?.c) return send(res, 502, { error: 'Could not resolve dataset or country code from UNIDO metadata.' });
      const periods = Array.isArray(metadata.periods) ? metadata.periods.slice(-10).map(String) : [];
      const upstream = await fetchRaw(DATA_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datasetId, countryCode: metaCountry.c, fullPrecision: true, variableCodes: VARIABLES, periods }) });
      let parsed = null; try { parsed = JSON.parse(upstream.text); } catch {}
      const shape = parsed && typeof parsed === 'object' ? { topLevelType: Array.isArray(parsed) ? 'array' : 'object', topLevelKeys: Array.isArray(parsed) ? null : Object.keys(parsed), firstItem: Array.isArray(parsed) ? parsed[0] : undefined } : { topLevelType: typeof parsed };
      return send(res, 200, { country: { iso3, name: country.name, unidoCode: metaCountry.c }, datasetId, requestedVariables: VARIABLES, requestedPeriods: periods, upstreamStatus: upstream.status, upstreamOk: upstream.ok, contentType: upstream.contentType, responseShape: shape, rawResponse: upstream.text.slice(0, 50000), truncated: upstream.text.length > 50000, rawLength: upstream.text.length }, { 'Cache-Control': 'no-store' });
    } catch (error) { return send(res, 502, { error: 'UNIDO debug request failed.', detail: error.message }); }
  }
  if (req.method === 'GET' && url.pathname === '/api/cip') {
    try {
      const data = await loadCip({ force: url.searchParams.get('refresh') === '1' });
      return send(res, 200, data, { 'Cache-Control': 'no-store' });
    } catch (error) {
      console.error('[UNIDO CIP]', error);
      return send(res, 502, { error: 'Unable to retrieve CIP metadata from UNIDO.', detail: error.message, fetchedAt: new Date().toISOString() });
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Industrial Intelligence running at http://${HOST}:${PORT}`);
  console.log('Local API: /api/health and /api/cip');
});
