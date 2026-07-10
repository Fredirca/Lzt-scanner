# Wrota Review Console — Strict OG Styles

This version fixes the false-positive issue.

It does not treat normal cosmetic filters as proof.

A listing is only shown if the listing title/details actually verify one of these OG styles:

- Renegade Raider Black & Gold
- Aerial Assault Trooper Black & Gold
- Raider’s Revenge Black & Gold
- Purple Skull Trooper
- Pink Ghoul Trooper

It also only accepts real numeric LZT listing IDs, so links look like:

```text
https://lzt.market/244307015/
```

and not:

```text
https://lzt.market/cid_...
```

Upload all files to GitHub Pages and hard refresh.
