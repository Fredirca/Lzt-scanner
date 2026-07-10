# Wrota CMD Scanner

A clean terminal/CMD-themed rebuild.

## Key changes

- Uses the existing legacy proxy format by default:
  - `https://shiny-shape-49fd.flruming.workers.dev/proxy?url=...`
- Does not require the newer `/search` or `/image/:id/:type` Worker routes.
- One global mixed feed.
- One card per unique numeric listing.
- Multiple matched target badges on one card.
- Interleaved page scanning across all targets.
- Newest uploaded is applied during each target request and final sorting is global.
- Images are loaded by JavaScript as blobs through the proxy first, with `X-LZT-Key` / `X-LZT-Cookie` headers if supplied.
- Direct image endpoint fallback is included.

## Upload to GitHub Pages

Upload:

```text
index.html
404.html
styles.css
app.js
.nojekyll
README.md
```

Hard refresh after uploading.

## Image notes

This build tries:

1. Proxy blob image:
   `proxy?url=https://lzt.market/<id>/image?type=skins`
2. Direct image:
   `https://lzt.market/<id>/image?type=skins`

Same for `pickaxes`.

If LZT requires a logged-in session for image endpoints, paste the optional cookie into the Cookie field.


## Upload dates build

This version makes upload dates visible on every listing card:

- Adds a clear `UPLOAD_DATE:` stamp near the title.
- Keeps `UPLOAD DATE` in the info grid.
- Copies upload date into the generated message.
- Checks more possible API/date field names.
- Parses LZT listing page `published_date` and `refreshed_date` values when enrichment is on.


## Newest sorting by system time

This build changes "newest" sorting:

- Uses each listing's upload date + time.
- Compares that timestamp against the user's current browser/system time.
- The listing with the smallest distance to current system time appears first.
- This applies to `sort:global_market`, `sort:newest`, and `newest_uploaded`.
- `oldest_uploaded` still sorts by oldest upload timestamp.
- Cards now show `AGE` and `System-Time Distance`.


## Site-hosted image blobs

This version hides the Cloudflare/proxy URL from the scanner UI.

Images are no longer displayed as Cloudflare or LZT links. The page fetches each locker image through the hidden proxy transport, converts the response to a browser `Blob`, and displays it with a local `blob:` URL inside the site.

Visible result cards now show:

```text
HOSTED_ON_PAGE
SITE_HOSTED_LOCKER_IMAGES
```

Notes:

- The images are hosted inside the current browser page/session as object URLs.
- A static GitHub Pages site cannot permanently store newly scanned remote images without a real storage backend.
- This build avoids showing/pasting Cloudflare links in the UI.


## Real newest order fix

This version fixes newest ordering against the LZT/ReadMe docs.

Changes:

- Sends `order=<selected order>` to the API request.
- Also sends `order_by=<selected order>` as a fallback.
- Parses Unix timestamps returned as numeric strings, such as `"1783599271"`.
- Known upload dates always sort above unknown upload dates.
- `newest_uploaded` and `sort:newest` use upload date/time closest to the user's current browser/system time.
- Debug log prints the selected order mode and confirms both `order` and `order_by` are sent.


## Docs-aligned API client

This build follows the public docs more closely:

- Uses `Authorization: Bearer <token>` upstream through the hidden Worker bridge.
- Sends `order` as the primary resource-ordering parameter.
- Sends `order_by` as a fallback because older marketplace URLs/builds used it.
- Applies a 225ms request gate so requests stay below the 300/minute documented limit.
- Retries HTTP 429 with backoff / Retry-After when available.
- Requests use `locale=en` and `currency=usd`.
- Detail enrichment is API-first:
  - `/<id>`
  - `/item/<id>`
  - `/items/<id>`
  - `/fortnite/<id>`
- HTML listing page parsing is fallback only for fields like published/refreshed date.
- Images are fetched through the hidden bridge and displayed as local `blob:` URLs inside the page.
