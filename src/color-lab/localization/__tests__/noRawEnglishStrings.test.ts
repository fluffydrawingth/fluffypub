import { describe, expect, it } from 'vitest'

/**
 * Regression guard: these strings were hardcoded directly in component JSX
 * before the localization pass and are now translation-dictionary values
 * only (see src/locales/en.ts). If one of them reappears in a component
 * file, it means a string was re-hardcoded instead of routed through t().
 */
const PREVIOUSLY_HARDCODED_STRINGS = [
  'Pull a palette from a coloring page, or generate one from scratch.',
  'Choose a vibe',
  'Advanced options',
  'Adjust colors',
  'Include neutral/background colors',
  'Drag to frame just the artwork — skip the desk, pens, and paper edges.',
  'Match with your markers',
  'Match colors',
  'Marker matches are approximate. Actual ink color may vary with paper, lighting, scanning, and swatch conditions.',
  'Add from reference library',
  'Create custom set',
  'Download template',
  'Scan swatch image',
  'Reset to reference',
  'No colors yet — add one or import a file.',
  'Save as curated palette',
  "You haven't added a marker set yet.",
  'Choose a different photo',
]

const featureFiles = import.meta.glob('/src/features/**/*.tsx', { eager: true, query: '?raw', import: 'default' })
const appFiles = import.meta.glob('/src/app/**/*.tsx', { eager: true, query: '?raw', import: 'default' })
const allFiles: Record<string, unknown> = { ...featureFiles, ...appFiles }

describe('no raw hardcoded English strings remain in feature components', () => {
  const filePaths = Object.keys(allFiles).filter((path) => !path.includes('/__tests__/'))

  it('scans at least the expected number of component files', () => {
    // Sanity check the scan itself is running against real files, not an empty/broken glob.
    expect(filePaths.length).toBeGreaterThan(20)
  })

  for (const needle of PREVIOUSLY_HARDCODED_STRINGS) {
    it(`"${needle}" does not appear literally in any feature/app .tsx file`, () => {
      const offenders = filePaths.filter((path) => String(allFiles[path]).includes(needle))
      expect(offenders).toEqual([])
    })
  }
})
