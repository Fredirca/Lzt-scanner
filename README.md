# LZT Fortnite Review Scanner — GitHub Pages Token-Each-Visit Version

This is a static GitHub Pages app.

It lets you:
- paste your LZT API token each time you open the site
- click **Scan LZT Now**
- search the Fortnite category by rare/OG watchlist terms
- save cases in browser localStorage
- export JSON/CSV evidence
- scan pasted listing text manually

## Important security note

This version does **not** have a backend.

Your token is:
- typed into the page each visit
- kept only in page memory/session
- not stored in localStorage
- not included in exports

But browser requests still include your token in request headers. Anyone with access to your device/browser DevTools while scanning could see it.

For stronger security, use a backend/proxy. For convenience on GitHub Pages, this token-each-visit version is the simplest.

## Deploy to GitHub Pages

1. Create a GitHub repo.
2. Upload:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. Go to repo **Settings → Pages**.
4. Source: **Deploy from a branch**
5. Branch: `main`
6. Folder: `/root`
7. Save.

## How to use

1. Open the GitHub Pages site.
2. Paste your LZT API token.
3. Click **Test Token**.
4. Click **Scan LZT Now**.
5. Export JSON/CSV when needed.

## Watchlist

Default OR-match watchlist:

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

You can add/remove watchlist terms in the UI.
