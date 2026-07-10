# Wrota Review Console — Stable Clean

Upload all files in this ZIP to the root of your GitHub Pages repository.

This build uses `app-stable.js` instead of `app.js` to avoid old browser/GitHub cache issues.

Includes:
- polished dashboard
- browser-save API key field
- hidden built-in proxy
- OG filters only
- Raider’s Revenge OG Style
- scan results kept in memory
- saved cases compact/capped
- no advanced filters panel


## Listing-output style

This build formats website result cards like:

```text
New Fortnite listing on LZT Market

Skin Count: 5
Exclusives: OG Skull Trooper
Email Changeable: ❌

🏷️ Title: 5 Skins | OG STW | Og Skull Trooper | Rust Lord | Mission Specialist | 2500 VB
👤 Seller: zerosugar
💵 Price: $401.77
🔢 Season Level: 1
🌍 Country: FI
⏱️ Last Activity: 2024-09-13
🔗 Link: https://lzt.market/244307015/
```

It also adds a `Copy message` button for each result.


## Real listing fix

This build rejects cosmetic catalogue entries such as:

```text
cid_713_athena_commando_m_maskedwarriorspring
cid_a_024_athena_commando_f_skirmish_qw2bq
```

Only real numeric LZT listing/account IDs are accepted, so result links should look like:

```text
https://lzt.market/244307015/
```

It also avoids using nested cosmetic names as titles, which caused bad titles like `Xander`.
