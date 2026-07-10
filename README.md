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


## Target groups and official locker images

Fixes in this build:

- Results are no longer merged by listing ID across different cosmetic targets.
- The same listing can appear separately under Raider’s Revenge, OG Skull, OG Ghoul, etc.
- The label shown on a card is the exact target that produced that hit.
- Results are grouped by matched target, so Raider’s Revenge does not overwrite skin matches.
- Official LZT locker image endpoints are used:
  - `https://lzt.market/<id>/image?type=skins`
  - `https://lzt.market/<id>/image?type=pickaxes`
- Listing page HTML is also parsed for price, title, seller, published date, and extra images when available.


## Global mixed feed fix

This build changes the results model again:

- One card per unique numeric LZT account/listing.
- If the same account matches multiple filters, it shows once with multiple badges.
- Raider’s Revenge no longer becomes the only label; all matched filters are displayed.
- Newest uploaded sorts the entire mixed account feed globally, not separately by target group.
- Official LZT image endpoints remain first:
  - `/image?type=skins`
  - `/image?type=pickaxes`


## Embedded locker images build

This build stops trying to fetch locker images through JavaScript thumbnails.

Instead, every result card embeds the real LZT image endpoints directly:

```text
https://lzt.market/<listing id>/image?type=skins
https://lzt.market/<listing id>/image?type=pickaxes
```

Each result now shows two embedded panels:

- Skins locker
- Pickaxes locker

Each panel also has an Open link and the card has a Copy embed links button.
