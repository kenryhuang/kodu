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
const fract = (value) => value - Math.floor(value);
const lerp = (from, to, amount) => from + (to - from) * amount;
const smooth = (value) => value * value * (3 - value * 2);
const hash = (x, y, seed) => fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123);
const shade = (color, amount) => color.map((channel) => Math.round(clamp(channel + amount, 0, 255)));
const mixColor = (from, to, amount) => from.map((channel, index) => Math.round(lerp(channel, to[index], amount)));

function tileNoise(x, y, cellSize, seed, width, height) {
  const cellsX = Math.max(1, Math.round(width / cellSize));
  const cellsY = Math.max(1, Math.round(height / cellSize));
  const gx = (x / width) * cellsX;
  const gy = (y / height) * cellsY;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = smooth(gx - ix);
  const fy = smooth(gy - iy);
  const at = (px, py) => hash(((px % cellsX) + cellsX) % cellsX, ((py % cellsY) + cellsY) % cellsY, seed);
  const top = lerp(at(ix, iy), at(ix + 1, iy), fx);
  const bottom = lerp(at(ix, iy + 1), at(ix + 1, iy + 1), fx);
  return lerp(top, bottom, fy);
}

function fbm(x, y, seed, width, height) {
  return (
    tileNoise(x, y, 32, seed, width, height) * 0.5
    + tileNoise(x, y, 16, seed + 1, width, height) * 0.28
    + tileNoise(x, y, 8, seed + 2, width, height) * 0.16
    + tileNoise(x, y, 4, seed + 3, width, height) * 0.06
  );
}

function speckle(x, y, seed, threshold) {
  return hash(x, y, seed) > threshold;
}

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

writePng("grass.png", 128, 128, (x, y, width, height) => {
  const broad = fbm(x, y, 3, width, height);
  const clump = tileNoise(x, y, 16, 12, width, height);
  const detail = tileNoise(x, y, 4, 18, width, height);
  let color = mixColor([63, 126, 55], [111, 169, 78], broad);
  if (clump > 0.62) color = mixColor(color, [43, 105, 50], (clump - 0.62) * 1.8);
  if (detail > 0.76) color = mixColor(color, [139, 190, 91], 0.35);
  const bladeBand = Math.abs(((x * 0.7 + y * 1.35 + tileNoise(x, y, 8, 28, width, height) * 9) % 19) - 9.5);
  if (bladeBand < 0.42 && speckle(Math.floor(x / 2), Math.floor(y / 2), 31, 0.53)) color = shade(color, 24);
  if (speckle(x, y, 41, 0.965)) color = shade(color, -28);
  return [...color, 255];
});

writePng("sand.png", 128, 128, (x, y, width, height) => {
  const broad = fbm(x, y, 7, width, height);
  const ripples = Math.sin((x * 0.17 + y * 0.08 + tileNoise(x, y, 16, 16, width, height) * 2.4) * Math.PI);
  let color = mixColor([172, 133, 77], [226, 188, 111], broad);
  color = shade(color, Math.round(ripples * 7));
  const crack = Math.abs(((x * 0.82 + y * 0.36 + tileNoise(x, y, 32, 24, width, height) * 18) % 47) - 23.5) < 0.48
    && tileNoise(x, y, 16, 25, width, height) > 0.58;
  if (crack) color = mixColor(color, [116, 83, 52], 0.38);
  if (speckle(x, y, 53, 0.93)) color = shade(color, hash(x, y, 54) > 0.5 ? 22 : -24);
  return [...color, 255];
});

writePng("road.png", 128, 128, (x, y, width, height) => {
  const across = Math.abs(x / (width - 1) - 0.5) * 2;
  const centerWear = Math.max(0, 1 - across);
  const mud = fbm(x, y, 11, width, height);
  const lengthGrain = Math.sin((y * 0.19 + tileNoise(x, y, 16, 33, width, height) * 3.2) * Math.PI);
  let color = mixColor([92, 67, 43], [151, 109, 67], mud * 0.72 + centerWear * 0.22);
  color = shade(color, Math.round(lengthGrain * 6 - across * 16));
  const rut = Math.abs(x - width * 0.33) < 2.3 || Math.abs(x - width * 0.67) < 2.3;
  if (rut && tileNoise(x, y, 8, 43, width, height) > 0.42) color = mixColor(color, [73, 51, 34], 0.34);
  if (speckle(x, y, 61, 0.94)) color = shade(color, hash(x, y, 62) > 0.48 ? 25 : -28);
  return [...color, 255];
});
