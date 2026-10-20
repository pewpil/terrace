// Builds a self-contained terrace executable via Node.js SEA.
//
// Flow:
// 1. esbuild bundles the babel-compiled dist/ into one ESM file. Its first
//    import is src/sea-extract.ts, which extracts embedded assets and sets
//    OTUI_ASSET_ROOT before any @opentui/core module body runs.
// 2. getNodeAssets() returns the OpenTUI native library + tree-sitter assets
//    for this platform; they are embedded in the SEA blob.
// 3. node --experimental-sea-config produces the blob; postject injects it
//    into a copy of the node binary.
import { build } from 'esbuild'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { getNodeAssets } from '@opentui/core/node-assets'

const projectRoot = path.resolve(import.meta.dirname, '..')
const buildDir = path.join(projectRoot, 'build')

fs.rmSync(buildDir, { recursive: true, force: true })
fs.mkdirSync(buildDir, { recursive: true })

const step = (msg) => console.log(`[sea] ${msg}`)

// 1. Bundle the compiled app
step('bundling dist/index.js -> build/app-main.mjs')
await build({
  entryPoints: [path.join(projectRoot, 'dist', 'index.js')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node26',
  outfile: path.join(buildDir, 'app-main.mjs'),
  minify: false,
  sourcemap: false,
})

// 2. Collect OpenTUI runtime assets for this platform
step('collecting OpenTUI node assets')
const report = process.report.getReport().header
const target = {
  platform: process.platform,
  arch: process.arch,
  libc: report.glibcVersionRuntime ? 'glibc' : 'musl',
}
const assets = getNodeAssets(target)
for (const asset of assets) {
  step(`  asset ${asset.key} <- ${path.relative(projectRoot, asset.source)}`)
}

// 3. Manifest read by src/sea-extract.ts at runtime
const manifest = {
  keys: assets.map((a) => a.key),
}
fs.writeFileSync(path.join(buildDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

// 4. SEA config: the app bundle itself is the main script
const seaConfig = {
  main: path.join(buildDir, 'app-main.mjs'),
  output: path.join(buildDir, 'sea-prep.blob'),
  mainFormat: 'module',
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
  execArgvExtension: 'none',
  execArgv: ['--experimental-ffi', '--no-warnings'],
  assets: {
    'manifest.json': path.join(buildDir, 'manifest.json'),
    ...Object.fromEntries(assets.map((a) => [a.key, a.source])),
  },
}
const seaConfigPath = path.join(buildDir, 'sea-config.json')
fs.writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2))

step('generating SEA blob')
execSync(`node --experimental-sea-config ${JSON.stringify(seaConfigPath)}`, {
  stdio: 'inherit',
  cwd: projectRoot,
})

// 5. Copy the node binary and inject the blob
const exePath = path.join(buildDir, 'terrace')
step(`copying node binary -> ${path.relative(projectRoot, exePath)}`)
fs.copyFileSync(process.execPath, exePath)
fs.chmodSync(exePath, 0o755)

step('injecting blob with postject')
execSync(
  `npx postject ${JSON.stringify(exePath)} NODE_SEA_BLOB ${JSON.stringify(
    seaConfig.output,
  )} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
  { stdio: 'inherit', cwd: projectRoot },
)

step(`done: ${path.relative(projectRoot, exePath)}`)
