# Extension Package

Chrome MV3 sidepanel extension package.

## Release Package
1. From repo root run:
   - `npm run release:extension`
2. Artifacts are generated in:
   - `dist/extension/datascrap-v<version>.zip`
   - `dist/extension/datascrap-latest.zip`

## Load Unpacked
1. Run `npm run sync:extension`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click "Load unpacked" and select `packages/extension`.
