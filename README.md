# Industrial Intelligence

Arabic-first Industrial Intelligence website with a lightweight Node.js backend that retrieves Competitive Industrial Performance (CIP) data from the UNIDO Statistics Portal.

> **Project status:** Local development prototype. The backend listens on `127.0.0.1` and is not publicly accessible over the internet.

## Features

- Arabic-first website interface.
- Live UNIDO CIP score and official CIP rank retrieval for the five configured countries.
- Country overview, ranking, and country comparison views.
- Same-origin backend endpoint (`/api/cip`) so the browser does not call the UNIDO API directly.
- In-memory cache with a 15-minute lifetime.
- No fabricated or fallback CIP scores. If UNIDO does not return an observation, the application reports it as unavailable.

## Countries currently configured

| Country | ISO3 code |
|---|---|
| Saudi Arabia | `SAU` |
| Egypt | `EGY` |
| Türkiye | `TUR` |
| Indonesia | `IDN` |
| Malaysia | `MYS` |

The country list is currently configured in `server.mjs` and `script.js`.

## Data and methodology notes

The backend requests the following variables from UNIDO's **Competitive Industrial Performance (CIP)** dataset:

- `cip` — the overall CIP index value.
- `cipRank` — the rank supplied by UNIDO.

The backend reads the latest returned observation for each variable and country. The API response uses `p` for the period, `c` for the variable code, and `v` for the observation value.

**CIP is an overall industrial competitiveness index. It is not a sector-specific score.** Do not interpret the overall CIP score as a measure of food manufacturing, textiles, or water desalination performance. Those sectors require their own datasets and a separately documented methodology.

Missing observations are not treated as zero. A missing score or rank must remain unavailable rather than being invented or inferred.

## Requirements

- Node.js **20 or newer**.
- An internet connection on the computer running the backend, so it can reach the UNIDO Statistics Portal.
- A modern web browser.

No third-party npm packages are required.

## Run on Windows

### Option 1 — Start script

1. Extract the project folder.
2. Open the extracted `industrial-intelligence-local-backend` folder.
3. Double-click `start.bat`.
4. Wait for the terminal to display the server address.
5. Open [http://127.0.0.1:8787](http://127.0.0.1:8787) in your browser.

Keep the terminal window open while using the website. Closing it stops the server.

### Option 2 — Terminal

Open a terminal in the project folder and run:

```bash
npm start
```

Then open [http://127.0.0.1:8787](http://127.0.0.1:8787).

## Run on macOS or Linux

Open a terminal in the project folder and run:

```bash
node --version
npm start
```

Node.js 20 or newer is required. Then open [http://127.0.0.1:8787](http://127.0.0.1:8787).

## API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Confirms that the local backend is running. |
| `GET /api/cip` | Retrieves the configured countries' CIP scores and ranks. |
| `GET /api/cip?refresh=1` | Forces a new upstream request instead of using the in-memory cache. |
| `GET /api/cip/debug?country=SAU` | Makes a diagnostic request for one supported country and returns upstream response details. |

Supported `country` values for the diagnostic endpoint are `SAU`, `EGY`, `TUR`, `IDN`, and `MYS`.

The debug endpoint exposes raw upstream response data. **Use it only on the local development server; do not publish or expose it on a public deployment.**

## Project structure

```text
industrial-intelligence-local-backend/
├── index.html      # Website structure and content
├── style.css       # Website styling and responsive layout
├── script.js       # Frontend behavior and CIP data rendering
├── server.mjs      # Local web server and UNIDO API integration
├── package.json    # Project metadata and start scripts
├── start.bat       # Windows start helper
└── README.md       # Project documentation
```

## Troubleshooting

### `node` or `npm` is not recognized

Install Node.js 20 or newer, close and reopen the terminal, and check:

```bash
node --version
npm --version
```

### The website does not load

- Confirm the server terminal is still running.
- Open `http://127.0.0.1:8787` rather than opening `index.html` directly with `file://`.
- Check whether another application is already using port `8787`. If necessary, set a different `PORT` environment variable before starting the server.

### CIP data does not load

1. Open `http://127.0.0.1:8787/api/health` and confirm the local service responds.
2. Open `http://127.0.0.1:8787/api/cip?refresh=1` to inspect the latest API result and bypass the local cache.
3. If a country reports an error, inspect its diagnostic response, for example `http://127.0.0.1:8787/api/cip/debug?country=SAU`.
4. Check the internet connection and whether the UNIDO service is available.

A successful local server response does not guarantee that UNIDO will accept every upstream request. UNIDO or its upstream protection layer may return an HTTP error, including `403`. This project does not attempt to bypass upstream access controls. If access is blocked, use UNIDO's official access or data-download process.

### Browser CORS errors

Run the website through the Node.js server at `http://127.0.0.1:8787`. Do not open the HTML file directly. The frontend calls the local same-origin API; the Node.js backend then makes the request to UNIDO.

## Local development is not public hosting

The default host is `127.0.0.1`, which limits access to the computer running the server. This is suitable for local development and testing only.

To publish the website, deploy the frontend and backend to an appropriate hosting environment, configure the frontend to call the deployed backend, and add production controls such as HTTPS, request limits, monitoring, and appropriate access restrictions. Do not expose this development server or its raw diagnostic endpoint directly to the internet.

## Official UNIDO references

- [UNIDO Statistics Portal API documentation](https://stat.unido.org/unido-statistics-portal-api)
- [UNIDO Statistics Portal Swagger UI](https://stat.unido.org/portal/swagger-ui/index.html)

## Flags

The current country labels in the frontend use Unicode flag emoji. No local flag image files are included in this project package. If the interface is later updated to use image-based flags, add the image assets to the project and update this section to document their source and licensing.
