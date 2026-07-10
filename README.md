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
