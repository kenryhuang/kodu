import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "public", "assets", "terrain");
mkdirSync(outDir, { recursive: true });

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(fileName, width, height, pixelAt) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = pixelAt(x, y, width, height);
      raw[row + 1 + x * 4 + 0] = r;
      raw[row + 1 + x * 4 + 1] = g;
      raw[row + 1 + x * 4 + 2] = b;
      raw[row + 1 + x * 4 + 3] = a;
    }
  }

  writeFileSync(join(outDir, fileName), Buffer.concat([
    pngSignature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wave = (x, y, seed) => (Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453) % 1;

writePng("heightmap-valley.png", 128, 128, (x, y, width, height) => {
  const nx = (x / (width - 1)) * 2 - 1;
  const nz = (y / (height - 1)) * 2 - 1;
  const radius = Math.sqrt(nx * nx + nz * nz);
  const roadNorth = Math.abs(nx + nz * 0.12) < 0.08 && nz < 0.62;
  const roadEast = Math.abs(nz - 0.16) < 0.08 && nx > -0.1;
  const roadSouthWest = Math.abs(nz - nx * 0.36) < 0.09 && nx < 0.15 && nz > -0.78;
  let value = 34 + clamp(radius - 0.35, 0, 1) * 110;
  if (roadNorth || roadEast || roadSouthWest) value = Math.min(value, 72);
  const shade = Math.round(clamp(value, 20, 180));
  return [shade, shade, shade, 255];
});

writePng("grass.png", 64, 64, (x, y) => {
  const n = Math.floor(Math.abs(wave(x, y, 3)) * 22);
  const blade = (x + y * 2) % 13 === 0 ? 24 : 0;
  return [78 + n, 142 + n + blade, 58 + n, 255];
});

writePng("sand.png", 64, 64, (x, y) => {
  const n = Math.floor(Math.abs(wave(x, y, 7)) * 20);
  const dot = (x * 5 + y * 3) % 29 === 0 ? 18 : 0;
  return [196 + n + dot, 163 + n + dot, 94 + n, 255];
});

writePng("road.png", 64, 64, (x, y) => {
  const n = Math.floor(Math.abs(wave(x, y, 11)) * 18);
  const pebble = (x * 7 + y * 5) % 23 === 0 ? -22 : 0;
  return [129 + n + pebble, 91 + n + pebble, 54 + n + pebble, 255];
});
