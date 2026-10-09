#!/usr/bin/env node
/**
 * Pixel-by-pixel proof for the style clean-up: "swapping them in cannot change a pixel".
 *
 * Compares every PNG in --before against the same-named PNG in --after. A pixel counts as
 * DIFFERENT only if any RGB channel differs by more than --tolerance (the anti-aliasing
 * allowance - a hair of sub-pixel blur at an edge is not a real change; pixelmatch's own default
 * threshold is the same idea, scaled 0-1). Pixels inside any rectangle given with --mask are
 * ignored in both images, so known noise (a clock, a date) never fails the comparison.
 *
 * Also used to compare two "before" runs against each other, to find the page's own noise before
 * any code changes.
 *
 * Usage:
 *   node compare-style-shots.js --before DIR1 --after DIR2 [--mask x,y,w,h ...] [--tolerance 32] [--diff-out DIR]
 *
 * Uses client/node_modules/pngjs (already a project dependency) rather than adding a new one.
 */
const fs = require('fs')
const path = require('path')
const { PNG } = require(path.join(__dirname, '..', '..', 'client', 'node_modules', 'pngjs'))

function parseArgs(argv) {
  const out = { mask: [], tolerance: 32, diffOut: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--before') out.before = argv[++i]
    else if (a === '--after') out.after = argv[++i]
    else if (a === '--mask') out.mask.push(argv[++i].split(',').map(Number))
    else if (a === '--tolerance') out.tolerance = Number(argv[++i])
    else if (a === '--diff-out') out.diffOut = argv[++i]
  }
  if (!out.before || !out.after) throw new Error('Need --before and --after')
  return out
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file))
}

function inMask(x, y, masks) {
  return masks.some(([mx, my, mw, mh]) => x >= mx && x < mx + mw && y >= my && y < my + mh)
}

function diffCount(a, b, tolerance, masks) {
  if (a.width !== b.width || a.height !== b.height) {
    return { count: Infinity, reason: `size differs: ${a.width}x${a.height} vs ${b.width}x${b.height}` }
  }
  let count = 0
  const diffPng = new PNG({ width: a.width, height: a.height })
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const idx = (a.width * y + x) << 2
      diffPng.data[idx] = 255
      diffPng.data[idx + 1] = 255
      diffPng.data[idx + 2] = 255
      diffPng.data[idx + 3] = 255
      if (inMask(x, y, masks)) continue
      const dr = Math.abs(a.data[idx] - b.data[idx])
      const dg = Math.abs(a.data[idx + 1] - b.data[idx + 1])
      const db = Math.abs(a.data[idx + 2] - b.data[idx + 2])
      const da = Math.abs(a.data[idx + 3] - b.data[idx + 3])
      if (Math.max(dr, dg, db, da) > tolerance) {
        count++
        diffPng.data[idx] = 255
        diffPng.data[idx + 1] = 0
        diffPng.data[idx + 2] = 0
        diffPng.data[idx + 3] = 255
      }
    }
  }
  return { count, diffPng }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const names = fs.readdirSync(args.before).filter((f) => f.endsWith('.png')).sort()
  let failed = false
  for (const name of names) {
    const bPath = path.join(args.before, name)
    const aPath = path.join(args.after, name)
    if (!fs.existsSync(aPath)) {
      console.log(`MISSING in after: ${name}`)
      failed = true
      continue
    }
    const a = readPng(bPath)
    const b = readPng(aPath)
    const { count, diffPng, reason } = diffCount(a, b, args.tolerance, args.mask)
    if (reason) {
      console.log(`FAIL ${name}: ${reason}`)
      failed = true
      continue
    }
    if (count === 0) {
      console.log(`OK   ${name}: 0 differing pixels`)
    } else {
      console.log(`FAIL ${name}: ${count} differing pixels`)
      failed = true
      if (diffPng && args.diffOut) {
        fs.mkdirSync(args.diffOut, { recursive: true })
        fs.writeFileSync(path.join(args.diffOut, `diff-${name}`), PNG.sync.write(diffPng))
      }
    }
  }
  process.exit(failed ? 1 : 0)
}

main()
