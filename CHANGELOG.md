# Changelog

## v1.9.0

- Redesigned the website into a Fortnite-lobby-inspired layout
- Added local lobby background from supplied reference image
- Added top navigation bar, left search panel, center stage, and right play panel
- Removed more visible technical clutter from the main screen
- Kept API-only scanner, watch mode, and rare stack pricing

## v1.8.0

- Added rare stack pricing
- Accounts with multiple rare matches now get a combined baseline
- Added diminishing-weight stack valuation to avoid simple double-counting
- Added rare stack mode setting
- Added most rare value sort
- Result cards now show rare stack count

## v1.7.0

- Reworked interface into a lobby-style UI
- Removed non-essential information from result cards
- Moved saved listings and debug log into lower drawers
- Hid raw JSON by default
- Made scan/watch actions the central focus

## v1.6.0

- Added browser watch mode
- Added Start watch and Stop controls
- Added sound alerts for newly detected listing IDs
- Added watch interval setting
- Added test sound button
- Added watch status stat
- Watch mode primes on first scan to avoid alerting existing listings

## v1.5.0

- Added regular price baseline system
- Added median price per matched group
- Added below-regular filter
- Added biggest price gap sort
- Added price check block to listing cards
- Added regular price fields to copied summaries

## v1.4.0

- Added in-app API key help panel
- Added token safety warning
- Added link to public LZT Market API docs
- Clarified API key placeholder text

## v1.3.0

- Reworked UI into a cleaner step-based flow
- Moved skin search to the main target area
- Hid advanced target tools behind details
- Hid advanced scan controls behind details
- Reduced visual noise across cards and empty states

## v1.2.0

- Added real skin search bar
- Added live known-skin suggestions
- Added exact skin ID support
- Added API title-search fallback for unknown skin names
- Added applied skin search chips

## v1.1.0

- Added exclusive skin search setting
- Added OG style exclusive preset
- Added promo/device exclusive preset
- Preset filters are added at scan time without cluttering manual targets

## v1.0.0

Release build.

- Reworked interface into restrained dark mode
- Removed image handling completely
- Removed page scraping
- Hid proxy URL from the UI
- Kept API-only request model
- Added release labeling
- Kept raw JSON inspection per listing
- Kept saved listings and JSON export
- Included API-only Cloudflare Worker bridge
