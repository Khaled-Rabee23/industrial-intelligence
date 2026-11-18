# Industrial Intelligence — Local UNIDO CIP backend

Arabic-first website with a small Node.js backend. The browser no longer calls UNIDO directly: it calls the same-origin `/api/cip` endpoint, and the local server makes the upstream requests.

## Included countries
- Saudi Arabia (SAU)
- Egypt (EGY)
- Türkiye (TUR)
- Indonesia (IDN)
- Malaysia (MYS)

The server obtains the dataset ID, UNIDO country codes, and available periods from the live CIP metadata endpoint. It requests only `cip` and `cipRank` for each country. It does not contain mock scores or fallback values. Sector-specific food, textile, and desalination scores remain unavailable because they are not supplied by the overall CIP dataset.

## Requirements
- Node.js 20 or newer
- Internet access from the computer running the server

No npm packages are required.

## Run on Windows
1. Extract this folder.
2. Open it in VS Code.
3. Open Terminal → New Terminal.
4. Run:

   ```powershell
   npm start
   ```

5. Open `http://127.0.0.1:8787` in your browser. Do not open `index.html` using `file://`.

Health check: `http://127.0.0.1:8787/api/health`
Live CIP endpoint: `http://127.0.0.1:8787/api/cip`
Force a fresh fetch (ignores the 15-minute in-memory cache): `http://127.0.0.1:8787/api/cip?refresh=1`

## Important: local vs public
This configuration binds to `127.0.0.1`, so it is accessible only on the same computer. The page content is intended to be public, but this local development server is **not** an internet-public deployment. When you are ready to publish the website, deploy the backend to a real hosting service and configure the frontend to use that backend. Do not expose this development server directly to the internet.

## CORS and upstream limitations
Serving the page and `/api/cip` from the same local origin avoids the browser-to-UNIDO CORS preflight that blocked the original frontend. This does **not** bypass UNIDO's Cloudflare or server-side access controls. UNIDO documents that ordinary HTTP clients may receive HTTP 403 from Cloudflare-protected endpoints. If the local Node server receives 403, the application reports it; it does not attempt to evade the protection. Contact UNIDO or use its official download/approved access route instead.

The server only forwards fixed requests to the two official UNIDO CIP endpoints, for five hard-coded allowed ISO3 countries and two fixed variables. It is not an arbitrary URL proxy. It caches successful API assembly for 15 minutes to avoid repeatedly hitting UNIDO during page navigation/reload.

## Source documentation
- UNIDO API: https://stat.unido.org/unido-statistics-portal-api
- UNIDO Swagger: https://stat.unido.org/portal/swagger-ui/index.html


## Diagnose the UNIDO response structure
Open `http://127.0.0.1:8787/api/cip/debug?country=SAU` to send one real request for Saudi Arabia and inspect the upstream status, response shape, and up to 50 KB of raw response. You can substitute `EGY`, `TUR`, `IDN`, or `MYS`. This diagnostic endpoint is for local debugging only; do not expose it publicly because it returns raw upstream data.
