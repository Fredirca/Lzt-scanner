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
