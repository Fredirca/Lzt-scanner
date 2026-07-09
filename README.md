# Wrota LZT Checker

A GitHub Pages-ready static web app for private on-demand LZT Fortnite review checks.

## Files to upload to GitHub Pages

Upload these to the root of your repo:

- `index.html`
- `styles.css`
- `app.js`
- `.nojekyll`
- `404.html`
- `README.md`

Do not upload the ZIP itself.

## How it works

- Paste your LZT API key each visit.
- Click **Test key**.
- Click **Scan now**.
- Cases are saved in your browser localStorage.
- Export saved evidence as JSON.

The API key is not saved by the site.

## If you get “Load failed”

That is usually CORS. Use the included `cloudflare-worker.js`:

1. Go to Cloudflare Workers.
2. Create a Worker.
3. Paste `cloudflare-worker.js`.
4. Deploy.
5. Copy the Worker URL.
6. Paste it into **Optional Cloudflare Worker proxy URL** on the site.
7. Test again.

## Default watchlist

- OG Renegade Raider
- Renegade Raider
- OG Skull Trooper
- Skull Trooper
- Purple Skull
- OG Ghoul Trooper
- Ghoul Trooper
- Pink Ghoul
- OG Aerial Assault
- Aerial Assault Trooper
- Aerial Assault
- OG Raiders Revenge
- Raider's Revenge
- Raiders Revenge
- Raider Revenge
