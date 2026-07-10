# Wrota Pro Scanner — rebuilt from scratch

Upload all files to the root of GitHub Pages.

This build is a clean rewrite, not another patch.

## Main improvements

- Clean app structure
- Exact cosmetic filter target chips
- Bulk target parser
- Marketplace order applied during scan
- Turbo parallel scanning
- Smooth drawer-based Filter Lab
- Live results
- Detail enrichment
- Locker image extraction from API data and listing page HTML
- Proxy image loading as blobs
- Compact/card view toggle
- Saved cases
- Copy message / copy image links
- Local storage kept compact

## Default targets

```text
pickaxe[]=pickaxe_lockjaw_og
skin[]=030_athena_commando_m_halloween_og
skin[]=029_athena_commando_f_halloween_og
skin[]=028_athena_commando_f_og
skin[]=017_athena_commando_m_og
```

## Newest uploaded

Set:

```text
Marketplace order: Newest uploaded
Display sort: Marketplace order
```

Then run a new scan. Marketplace order is applied in the API request.


## Accounts fixed build

Fixes:

- Blank number filters now count as empty, not `0`.
- Results are no longer hidden by empty `Price to`, `Skins to`, or `Level to` fields.
- Listing extraction is more tolerant of LZT response shapes.
- Numeric object keys from API responses are copied into `item_id` when needed.
