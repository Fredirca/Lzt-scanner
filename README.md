# Wrota LZT Checker — Ultimate Rebuild

This is a full rebuild from scratch.

## What this version does

- One mixed global feed
- One card per unique numeric LZT listing
- Multiple matched cosmetic badges on the same card
- Marketplace newest order applied to every target request
- Interleaved page scanning across all targets
- Detail-page enrichment for title, price, seller, upload date and other data
- Official locker image endpoints
- Dedicated Cloudflare Worker image proxy fallback
- Local filter lab
- Saved cases
- Export JSON
- Copy filtered messages
- Debug console

## Default OG targets

```text
pickaxe[]=pickaxe_lockjaw_og
skin[]=030_athena_commando_m_halloween_og
skin[]=029_athena_commando_f_halloween_og
skin[]=028_athena_commando_f_og
skin[]=017_athena_commando_m_og
```

## Image strategy

The app tries to display official LZT locker images:

```text
https://lzt.market/<id>/image?type=skins
https://lzt.market/<id>/image?type=pickaxes
```

For reliability, the app uses the included Worker route first when enabled:

```text
https://your-worker.workers.dev/image/<id>/skins
https://your-worker.workers.dev/image/<id>/pickaxes
```

The Worker fetches upstream and streams image bytes with CORS headers.

## Deploy frontend to GitHub Pages

Upload these files to your GitHub Pages repository root:

```text
index.html
404.html
styles.css
app.js
.nojekyll
```

## Deploy Worker

Install Wrangler, then from the `cloudflare-worker` folder:

```bash
npm install -g wrangler
wrangler deploy
```

Optional secrets:

```bash
wrangler secret put LZT_API_KEY
wrangler secret put LZT_COOKIE
```

Then paste your Worker URL into the app.

## Important

This is a read-only review scanner. It intentionally does not include purchase buttons, cart tools, seller contact automation, or anything for account-trading workflows.
