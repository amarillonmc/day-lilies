# Third-party references and resources

day-lilies original application code is covered by the repository's MIT license. Dependencies and reference data retain their own licenses. The lockfile records installed JavaScript package versions; package distributions include their own license notices.

## Card rendering

- [kooriookami/yugioh-card](https://github.com/kooriookami/yugioh-card), MIT. Rendering library is installed through npm. Managed card assets originate at commit `92462bbd2aa3aa0075ebcc9b633bdc05137fd7ac`; source license is preserved at `public/card-assets/LICENSE.yugioh-card`. The original project credits 白羽幸鳥 for high-resolution card templates.
- Font files and third-party template artwork are preserved as provided upstream. The upstream package does not separately enumerate all font or artwork permissions; the code's MIT license must not be interpreted as an independent grant for those assets. See the managed resource manifest for exact files and checksums.

## Database and scripting tools

- [purerosefallen/ygopro-cdb-encode](https://github.com/purerosefallen/ygopro-cdb-encode), MIT: CDB access and conversion; installed as a versioned npm dependency.
- [purerosefallen/ygopro-msg-encode](https://github.com/purerosefallen/ygopro-msg-encode), MIT: constants/data types used transitively by CDB tooling.
- [sql.js](https://github.com/sql-js/sql.js), MIT: in-memory SQLite / WebAssembly. SQLite itself is public domain.
- [luaparse](https://github.com/fstirlitz/luaparse), MIT: Lua syntax parsing, not Lua execution or engine verification.
- [JSZip](https://github.com/Stuk/jszip), MIT or GPLv3 dual licensing: archive import/export and upstream snapshot extraction.

## Managed reference cache

The optional reference-sync command downloads or copies the following upstream source data into the ignored `.data/references` directory. These are not sibling-repository runtime dependencies. The cache manifest records exact revisions and sources for each sync, and retained upstream license texts accompany it.

- [Smile-DK/ygopro-scripts](https://github.com/Smile-DK/ygopro-scripts): upstream includes GNU GPL version 2 license text. Scripts are reference material for searching and model context.
- [purerosefallen/ygopro-core](https://github.com/purerosefallen/ygopro-core): upstream includes GNU GPL version 2 license text. The sync command derives a Lua API inventory; the application does not distribute or run a compiled core.
- [mycard/ygopro-database](https://github.com/mycard/ygopro-database): multilingual card information. No general data/asset license was present in the inspected source; do not assume the application MIT license covers this material.
- [ygopro-scripting-workflow](https://code.moenext.com/nanahira/ygopro-scripting-workflow): MIT; consulted as development reference for script conventions, CDB tooling, and validation boundaries. No runtime dependence on its checkout or CLI.

The bundled `src/domain/engine-constants.json` catalogs Lua interface names and numeric values from the synced `constant.lua`, with per-entry source locations; it contains no upstream script bodies. `engine-capabilities.ts` separately records the Koishi extension interface numbers and their defining source. `scripts/sync-capabilities.mjs` regenerates this catalog from an explicitly synced reference cache. Upstream source licenses remain those stated above.

Game titles, card texts, images, logos and other game material belong to their respective rights holders. User-created content and generated Lua are not automatically relicensed by this notice. When distributing copied or adapted upstream scripts/resources, retain applicable upstream notices and licenses.
