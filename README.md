# Wrota API Console — streamlined API-only build

This version removes images completely and does not scrape HTML pages.

## What it does

- Uses LZT API JSON only.
- Scans Fortnite listings with exact cosmetic filters.
- Sends `order` as the primary API ordering parameter.
- Keeps `order_by` as fallback.
- Sends `fields_include=*`, `locale=en`, and `currency=usd`.
- Merges duplicate listing IDs into one global mixed feed.
- Keeps all matched target badges on each listing.
- Uses API detail pass only; no page scraping.
- Shows important fields on the card.
- Keeps the full API JSON available under each listing.
- Exports visible listings as JSON.
- Hidden proxy URL; no image or Cloudflare links shown in the UI.

## Deploy

Upload these files to GitHub Pages:

```text
index.html
404.html
styles.css
app.js
.nojekyll
README.md
```

Deploy the optional Cloudflare Worker in `cloudflare-worker/` if your current proxy does not convert `X-LZT-Key` to `Authorization: Bearer <token>`.

## Worker

The worker only allows `prod-api.lzt.market` and only exposes `/proxy?url=...`.


## Clean UI build

This version keeps the API-only functionality but replaces the heavy CMD look with a cleaner modern dashboard:

- Minimal light dashboard design
- Clear scan setup and targets
- Cleaner cards
- Less visual noise
- Raw JSON still available
- No image code or page scraping
