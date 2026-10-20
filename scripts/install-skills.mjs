// Restores every agent skill recorded in skills-lock.json.
//
// .agents/skills/ is gitignored (regenerable, like node_modules); this script
// is the restore step. Each lockfile entry maps a skill name to its GitHub
// source, so future skills only need to be added to the lockfile (which
// `npx skills add` maintains) to be picked up here.
//
// Note: the CLI fetches current upstream contents; the lockfile hash is a
// drift indicator, not a pinned version.
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const lockPath = path.resolve(import.meta.dirname, '..', 'skills-lock.json')
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))

const names = Object.keys(lock.skills ?? {})
if (names.length === 0) {
  console.log('[skills] skills-lock.json has no skills; nothing to do')
  process.exit(0)
}

for (const name of names) {
  const entry = lock.skills[name]
  console.log(`[skills] installing ${name} from ${entry.source}`)
  execSync(`npx -y skills add ${entry.source} --skill ${name} --yes`, {
    stdio: 'inherit',
  })
}

console.log(`[skills] done: ${names.length} skill(s) installed`)
