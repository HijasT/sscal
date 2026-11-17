import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { APP_VERSION } from '../lib/config'

/**
 * Major-release gate: when APP_VERSION advances to v16, v17, etc.,
 * the About-page version history must be updated in that same release.
 * Minor/patch releases do not require a new major-history entry.
 */
test('About-page major-version history is complete, unique and newest-first', () => {
  const source = readFileSync(new URL('../components/tabs/AboutTab.tsx', import.meta.url), 'utf8')
  const history = source.split('Version History')[1]?.split('{/* Legal Disclaimer')[0]
  assert.ok(history, 'About page must contain Version History')
  const displayed = [...history.matchAll(/\{ ver: 'v(\d+)', desc:/g)].map(match => Number(match[1]))
  const currentMajor = Number(APP_VERSION.split('.')[0])
  assert.ok(Number.isSafeInteger(currentMajor) && currentMajor >= 1)
  assert.deepEqual(
    displayed,
    Array.from({ length: currentMajor }, (_, index) => currentMajor - index),
    `Every major release through v${currentMajor} must be described in About -> Version History, newest first.`
  )
})

test('README mirrors the same major-version release entries', () => {
  const source = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  const history = source.split('## Version history')[1]?.split('\nBuilt with')[0]
  assert.ok(history, 'README must contain its Version history section')
  const displayed = [...history.matchAll(/^- \*\*v(\d+)\*\*/gm)].map(match => Number(match[1]))
  const currentMajor = Number(APP_VERSION.split('.')[0])
  assert.deepEqual(
    displayed,
    Array.from({ length: currentMajor }, (_, index) => currentMajor - index),
    'Update README version history whenever a new major app version is introduced.'
  )
})
