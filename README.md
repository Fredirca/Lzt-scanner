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


## Embedded proxy

This build has the Cloudflare Worker proxy prefilled:

```text
https://shiny-shape-49fd.flruming.workers.dev
```

You should only need to paste your LZT API key and click **Test key** or **Scan now**.


## Existing listings / backfill scanning

This build scans existing listings too.

`Scan now` does:

1. Search each watchlist term across multiple pages.
2. Check multiple newest-listing pages.
3. Deduplicate matching item IDs.
4. Fetch full details for each match.
5. Save matched cases in browser storage.

New settings:

- **Pages per term**: how many older result pages to check per watchlist term.
- **Newest pages**: how many newest general Fortnite pages to check.

Higher values find more existing listings, but scans take longer and may hit API rate limits.


## Rate-limit safe build

This version is less aggressive by default:

- Max terms: 15
- Pages per term: 2
- Newest pages: 1
- Delay ms: 2500
- Stop on 429: enabled

If you get `429 from LZT`, your key/IP is temporarily rate-limited. Do not keep pressing Test or Scan. Reduce pages, increase Delay ms, and try again later.

Recommended gentle settings:

```text
Max terms: 5–10
Pages per term: 1
Newest pages: 1
Delay ms: 4000–8000
Stop on 429: on
```


## Skin / cosmetic filter mode

This build uses LZT's Fortnite cosmetic filters instead of the title search box.

It queries filters like:

```text
skin[]=028_athena_commando_f
skin[]=030_athena_commando_m_halloween_og
skin[]=029_athena_commando_f_halloween_og
pickaxe[]=pickaxe_id_027_scavenger
```

That means matches come from the actual LZT skin/pickaxe filters, not just title keywords.

Default filters:

- OG Renegade Raider: `skin[]=028_athena_commando_f`
- OG Skull Trooper: `skin[]=030_athena_commando_m_halloween_og`
- OG Ghoul Trooper: `skin[]=029_athena_commando_f_halloween_og`
- OG Aerial Assault Trooper: `skin[]=017_athena_commando_m`
- Raider's Revenge: `pickaxe[]=pickaxe_id_027_scavenger`

`Newest safety pages` is set to `0` by default. Raise it only if you want an extra text-based safety check on newest listings.


## OG styles only update

This build removes normal-style fallback aliases such as plain `Skull Trooper`, `Ghoul Trooper`, and `Aerial Assault`.

It now focuses on OG-specific targets:

- OG Renegade Raider
- OG Skull Trooper Style / Purple Skull
- OG Ghoul Trooper Style / Pink Ghoul
- OG Aerial Assault Trooper
- OG Raider's Revenge

For Skull Trooper and Ghoul Trooper, the app uses the `_og` skin filter IDs rather than normal skin names.


## Auto-proxy + stuck-loading fix

This build hides the proxy field and automatically uses:

```text
https://shiny-shape-49fd.flruming.workers.dev
```

It also fixes the `Loading details 127/127` hang by adding:

- 45-second request timeouts
- incremental rendering as each detail loads
- safe fallback when one detail request fails
- final `Done · X result(s)` badge

If a detail request fails, the listing still appears using summary data.
