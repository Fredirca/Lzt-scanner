# Wrota Release v1.1.0

Dark-mode, API-only release build.

## Scope

This release is intentionally focused:

- API JSON only
- No images
- No HTML page scraping
- No visible proxy field
- One global mixed feed
- One card per unique listing ID
- Multiple matched target badges per listing
- API detail pass
- Full raw JSON available per listing
- Export visible results as JSON
- Saved listings stored locally in the browser

## API behavior

The frontend sends requests through the hidden proxy bridge so the browser does not call the API directly.

Request behavior:

- `Authorization: Bearer <token>` is applied by the proxy from `X-LZT-Key`
- `order` is sent as the primary ordering parameter
- `order_by` is kept as a compatibility fallback
- `currency=usd`
- `locale=en`
- `fields_include=*`
- 225ms request gate for the documented 300/minute limit
- 429 retry/backoff support

## Deployment

Upload the root files to GitHub Pages:

```text
index.html
404.html
styles.css
app.js
.nojekyll
README.md
CHANGELOG.md
```

Deploy the optional Worker in `cloudflare-worker/` if your current proxy does not convert `X-LZT-Key` into the upstream `Authorization: Bearer <token>` header.

## Worker

The included Worker only allows:

```text
prod-api.lzt.market
```

It does not proxy image URLs or web pages.


## Exclusive skin search

Release v1.1.0 adds an exclusive skin search setting.

Modes:

- Off
- OG style exclusives
- Promo / device exclusives
- All exclusive presets

When enabled, the selected preset skin filters are added during scan without cluttering the manual target list.

Included preset IDs:

```text
030_athena_commando_m_halloween_og
029_athena_commando_f_halloween_og
028_athena_commando_f_og
017_athena_commando_m_og
175_athena_commando_m_celestial
313_athena_commando_m_kpopfashion
479_athena_commando_f_davinci
434_athena_commando_f_stealthhonor
342_athena_commando_m_streetracermetallic
183_athena_commando_m_modernmilitaryred
113_athena_commando_m_blueace
174_athena_commando_f_carbidewhite
371_athena_commando_m_speedymidnight
441_athena_commando_f_cyberfu
386_athena_commando_m_streetopsstealth
757_athena_commando_f_wildcat
```
