import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'

function u32be(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n >>> 0)
  return b
}

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const crc = crc32(Buffer.concat([t, data]))
  return Buffer.concat([u32be(data.length), t, data, u32be(crc)])
}

function makePng(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB, no alpha

  // Build raw scanlines: filter-byte(0) + R G B × width per row
  const rowLen = 1 + size * 3
  const raw = Buffer.alloc(size * rowLen)
  for (let y = 0; y < size; y++) {
    const base = y * rowLen
    raw[base] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      raw[base + 1 + x * 3]     = r
      raw[base + 1 + x * 3 + 1] = g
      raw[base + 1 + x * 3 + 2] = b
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// Kozegho green: #7AB648 = rgb(122, 182, 72)
const [R, G, B] = [122, 182, 72]
const outDir = './public/icons'
mkdirSync(outDir, { recursive: true })
writeFileSync(`${outDir}/icon-192.png`,           makePng(192, R, G, B))
writeFileSync(`${outDir}/icon-512.png`,           makePng(512, R, G, B))
writeFileSync(`${outDir}/icon-512-maskable.png`,  makePng(512, R, G, B))
console.log('✓ PWA icons generated (192×192, 512×512, 512×512-maskable)')
