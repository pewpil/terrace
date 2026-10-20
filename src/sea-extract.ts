// OpenTUI asset extraction for Node.js single-executable applications (SEA).
//
// Inside a SEA executable the native library, parser worker, and tree-sitter
// assets are embedded as blob assets. Core requires an absolute
// OTUI_ASSET_ROOT before its module graph executes, so this module must be
// imported BEFORE any @opentui module: ESM evaluation order guarantees a
// first-listed side-effect import runs to completion first.
//
// Outside a SEA executable this module is a no-op, so normal `npm run dev`
// is unaffected.
import { isSea, getAsset } from 'node:sea'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

if (isSea()) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'terrace-sea-'))

  const manifest = JSON.parse(getAsset('manifest.json', 'utf8')) as {
    keys: string[]
  }

  for (const key of manifest.keys) {
    const dest = path.join(root, key)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, Buffer.from(getAsset(key)))
  }

  // Must be set before any @opentui/core module executes.
  process.env.OTUI_ASSET_ROOT = root
}
