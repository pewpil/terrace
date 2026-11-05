// Restores the agent skills recorded in skills-lock.json.
//
// Craft Anything ships its skill as crates/setup/src/skill.md (lowercase, and
// not at a standard SKILL.md path), so `npx skills add storytold/craft-anything`
// reports "No skills found". The lock entry therefore points at the raw file
// for the pinned v0.3.0 tag.
//
// `skills add` does not record direct downloads in skills-lock.json, so the
// lock entry is checked in by hand with sourceType "download".
// `skills experimental_install` can restore and verify it.
//
// A direct download carries only SKILL.md. The vendor's recovery reference is
// fetched separately and both files are checked against their SHA-256 hashes.
//
// `skills check` and `skills update` do not handle download-type entries. To
// move to a newer Craft Anything release, bump the tag in skills-lock.json and
// the URLs/hashes here, then rerun this script.
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const skillDir = path.join(root, '.agents', 'skills', 'craft-anything')
const recoveryUrl =
  'https://raw.githubusercontent.com/storytold/craft-anything/v0.3.0/crates/setup/src/skill_recovery.md'

const expected = {
  'SKILL.md':
    'f287e38b6b5e0a6e3452cd436c3a53b17604274db8b9d9482d9c795342cf55a2',
  'references/recovery.md':
    'f983ea2dfb9ea0706fcc49fe274964d79f84eda68cf0fc58e60541eb16376a3a',
}

if (!fs.existsSync(path.join(root, 'skills-lock.json'))) {
  console.error('[skills] skills-lock.json is missing; cannot restore')
  process.exit(1)
}

console.log('[skills] restoring skills from skills-lock.json')
execSync('npx -y skills experimental_install --force --frozen-lockfile', {
  cwd: root,
  stdio: 'inherit',
})

console.log('[skills] fetching the Craft Anything recovery reference')
const response = await fetch(recoveryUrl)
if (!response.ok) {
  throw new Error(`[skills] ${recoveryUrl} returned ${response.status}`)
}
const recovery = Buffer.from(await response.arrayBuffer())
const recoveryPath = path.join(skillDir, 'references', 'recovery.md')
fs.mkdirSync(path.dirname(recoveryPath), { recursive: true })
fs.writeFileSync(recoveryPath, recovery)

for (const [relativePath, expectedHash] of Object.entries(expected)) {
  const filePath = path.join(skillDir, relativePath)
  const actualHash = createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex')
  if (actualHash !== expectedHash) {
    throw new Error(
      `[skills] ${relativePath} hash mismatch: expected ${expectedHash}, got ${actualHash}`,
    )
  }
}

console.log('[skills] craft-anything restored and verified')
