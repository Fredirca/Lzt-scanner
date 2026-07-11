# Wrota Release v1.9.0

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

Release v1.4.0 adds an exclusive skin search setting.

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


## Skin search bar

Release v1.4.0 adds a real skin search panel.

It supports:

- Searching known preset skins by readable name
- Adding exact `skin[]` filters from known matches
- Pasting exact Fortnite cosmetic IDs
- Pressing Enter on any unknown skin name to add it as an API title search
- Keeping applied title searches separate from manual cosmetic targets

Exact IDs are preferred when known. Unknown names use `title=<name>` as an API listing search so the scan can still search for any skin name you type.


## v1.4.0 clean UI

This release focuses on usability:

- Cleaner dark layout
- Step-based flow
- Skin search moved to the top
- Advanced target tools tucked behind a details panel
- Advanced scan settings tucked behind a details panel
- Less visual noise
- Better empty states
- Same API-only scanner logic


## v1.4.0 API key help

This release adds an in-app guide for getting and using an API key.

The guide explains:

- Log in to LZT / Lolzteam Market
- Open account settings
- Find API / token / developer / personal access token settings
- Create or copy a token
- Paste it into Wrota
- Press Test
- Save only on a trusted browser
- Keep the token private

The UI links to the public LZT Market API reference.


## v1.5.0 regular price check

This release adds a read-only regular price baseline system.

How it works:

- Uses scanned API listing prices only
- Groups prices by matched target label
- Calculates median regular price per group
- Shows sample count and average
- Flags listings below the median by the chosen threshold
- Adds a "Below regular" filter
- Adds a "Biggest price gap" sort
- Adds regular price information to copied listing summaries

This is a review/evaluation feature. It does not automate purchases, messaging, checkout, or seller contact.


## v1.6.0 watch mode

This release adds browser watch mode.

Watch mode:

- Re-scans the current filters while the browser tab stays open
- Remembers listing IDs already seen
- Primes itself on the first watch scan so existing listings do not trigger noise
- Plays an in-browser sound when a new listing ID appears
- Shows watch status in the stats bar
- Lets the user set the scan interval
- Lets the user enable/disable sound alerts
- Includes a test sound button

Notes:

- Watch mode only runs while the browser tab is open.
- Browser audio requires user interaction, so start watch or test sound from the page first.
- This is read-only monitoring. It does not automate purchases, messaging, checkout, or seller contact.


## v1.7.0 lobby UI

This release trims the interface into a lobby-style scanner:

- Fortnite-lobby-inspired layout without official assets or logos
- Search and presets moved into one left panel
- Main stage for scan / watch actions
- Compact HUD stats
- Results cards reduced to the important fields only
- Saved listings and debug log moved into lower drawers
- Raw JSON hidden by default
- Same API-only, read-only logic


## v1.8.0 rare stack pricing

This release fixes valuation for listings with multiple rare matches.

Instead of comparing a listing with several rare items against only one matching skin, Wrota now builds a stacked rare-value baseline:

- Finds the median price for each matched rare item from scanned API results
- Counts the strongest rare match fully
- Adds extra rare matches with a diminishing stack weight to avoid over-counting shared account value
- Compares the listing price against the combined rare stack baseline
- Shows how many rare matches are being valued
- Adds "Most rare value" sorting

Modes:

- Stacked value: combined rare match value
- Best single rare: old/simple comparison against the strongest single match

This remains read-only and only uses API listing data.


## v1.9.0 Fortnite-lobby-inspired website theme

This release redesigns the website to match the lobby references supplied by the user.

Design changes:

- Full-screen lobby scene background from the supplied reference image
- Top navigation bar inspired by older game lobby menus
- Left-side search / daily scan panel
- Center stage with scan-ready character-platform style block
- Right-side play/watch panel
- Bottom result board with compact listing cards
- Saved listings and debug log moved into drawers
- Technical settings tucked into advanced menus
- Raw JSON hidden by default
- No official Fortnite logo or official UI assets added

Functionality remains:

- API-only
- No images from listings
- No page scraping
- Watch mode
- Sound alert
- Rare stack pricing
