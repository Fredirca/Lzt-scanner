# Wrota Review Console — Select Outfits Filter

This version uses the outfit filter input idea.

It includes this UI element:

```html
<input class="chosen-search-input default" type="text" autocomplete="off" value="Select outfits">
```

Use it by pasting either:

1. A full LZT filtered URL, for example:

```text
https://lzt.market/fortnite/?skin%5B%5D=030_athena_commando_m_halloween_og
```

2. Raw outfit IDs, comma-separated:

```text
030_athena_commando_m_halloween_og, 029_athena_commando_f_halloween_og
```

The scanner extracts the `skin[]` values and scans those exact outfit filters.

It still rejects cosmetic `cid_...` result links and only shows numeric LZT listing links.


## Exact filters added

This build has these exact defaults preloaded:

```text
pickaxe[]=pickaxe_lockjaw_og
skin[]=030_athena_commando_m_halloween_og
skin[]=029_athena_commando_f_halloween_og
skin[]=028_athena_commando_f_og
skin[]=017_athena_commando_m_og
```

The parser now supports both `skin[]` and `pickaxe[]` filters, including URL-encoded `skin%5B%5D=...`.


## Polished enriched output

This build improves result cards and fills more fields by fetching listing details for every numeric listing ID.

It now attempts to populate:

- skin count
- exclusives
- email changeable / email status
- title
- seller
- price
- season level
- country
- last activity
- V-Bucks when present
- platform when present
- numeric LZT listing link

If LZT does not provide a field in search or detail data, the app leaves it as `Unknown` instead of inventing it.


## Turbo UI build

This version is optimized for speed:

- parallel page scanning
- configurable parallel requests
- low default delay
- instant result rendering
- optional background detail enrichment
- upgraded premium result cards
- animated progress and speed badge

If you hit a 429, lower `Parallel requests` or raise `Delay`.


## Pro Filters UI

This build adds a polished Filter Lab:

- search across title/seller/country/exclusives
- price min/max
- skin count min/max
- level min/max
- seller filter
- country filter
- email status filter
- include/exclude terms
- hide unknown fields toggles
- full-info-only toggle
- fresh/budget/premium presets
- card/compact view toggle
- API price/title params where supported, plus local filtering

Results update live as filters change.


## Order filters

Added marketplace/order controls:

- Newest uploaded
- Oldest uploaded
- Cheapest first
- Highest price
- Newest listed
- Oldest listed
- Display sort: uploaded/listed/activity/price/skins/level
- Quick filters: uploaded today, uploaded this week, active last 30 days, has price
- Uploaded after/before date filters
- Activity after/before date filters

The selected marketplace order is sent as `order_by` in scan requests.


## Inventory checker images

This build adds an Inventory Checker Images section to each result card.

It extracts image URLs from listing search/detail data, including likely fields such as:

- image / images
- screenshot / screenshots
- inventory / inventory_images
- inventory_checker / checker
- HTML image `src` attributes

Images are lazy-loaded thumbnails and each card includes a `Copy image links` button.

A new filter toggle is also included:

- Has inventory images


## Locker page image scraping

This build now fetches the actual LZT listing page for each numeric listing ID:

```text
https://lzt.market/<listing id>/
```

Then it extracts locker/inventory images from the page HTML, including:

- `src`
- `data-src`
- `data-original`
- `srcset`
- CSS `url(...)`
- image URLs embedded in script/JSON

This is separate from API detail image extraction, because LZT often shows the locker directly on the listing page.
