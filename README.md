# Wrota Review Console

Upload these files to the root of your GitHub Pages repository:

- index.html
- styles.css
- app.js
- .nojekyll
- 404.html

The interface uses the built-in proxy and only asks for the API key inside the browser session.


## Browser-save API key field

This build keeps the API key as a normal password-manager-compatible field:

```html
autocomplete="current-password"
name="lzt_api_key"
```

Browsers/password managers can offer to save and autofill the API key for this site.
The key is not hardcoded into the public website files.


## Quota fix

This build no longer saves large raw API blobs into localStorage.

It stores compact browser-safe records only:

- item ID
- title
- price/currency
- seller
- source URL
- matched OG filter
- created timestamp

This prevents:

```text
Failed to execute 'setItem' on 'Storage'
```

It also automatically trims old legacy `raw` records if they exist in browser storage.

## Raider's Revenge OG style

The Raider's Revenge filter is labelled as `Raider’s Revenge OG Style` and its aliases focus on the OG / Black & Gold style wording.


## Storage hard fix

This build does not save scan results to localStorage anymore.

- Current scan results are kept in memory only.
- Saved cases are compact and capped at 100.
- Old oversized result storage is deleted automatically on page load.
- If storage is still full, the app trims saved cases instead of crashing.

This specifically prevents:

```text
Failed to execute 'setItem' on 'Storage': Setting the value of 'wrota.polished.results.v1' exceeded the quota.
```


## Advanced filters panel

This build adds a full advanced filter panel similar to the market filter layout:

- price range
- title / Fortnite ID search
- platform
- account origin / email filters
- publication date
- sold-before toggles
- changeable email / Xbox / PSN segmented controls
- min/max outfits, pickaxes, dances, gliders, V-Bucks, friends, level
- paid items
- Battle Pass controls
- extra cosmetic ID fields for outfits, pickaxes, emotes, and gliders

The app sends filled filters as query parameters with each OG preset scan, and also applies lightweight local filtering where possible.
