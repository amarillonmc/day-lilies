# Managed card rendering assets

These are the standard OCG/TCG frames, icons, and Chinese/Japanese/English fonts
used by `yugioh-card` 1.9.2. Only required standard rendering resources are
included; executable applications, sample card artwork, alternate games, and
foil overlays are not included.

Source: https://github.com/kooriookami/yugioh-card/tree/92462bbd2aa3aa0075ebcc9b633bdc05137fd7ac/src/assets/yugioh-card

The upstream repository's MIT license is preserved in `LICENSE.yugioh-card`.
The upstream README credits 白羽幸鳥 for the high-resolution card frames.
Upstream does not separately document redistribution terms for each font or
third-party visual asset; this archive records provenance, not a claim of
independent ownership or additional licensing rights.

`manifest.json` records SHA-256 and byte length for each upstream file.
`npm run assets:sync` checks the vendored files locally and restores missing or
changed files from the pinned revision. For offline restoration from an
upstream checkout, use `node scripts/sync-assets.mjs --from <checkout-path>`.
Normal application development, build, and deployment do not access any
sibling repository. Updating assets requires an intentional manifest update.

`font-list.json` is generated from the manifest's required font subset.
