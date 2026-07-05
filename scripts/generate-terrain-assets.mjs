import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const terrainOutDir = join(root, "public", "assets", "terrain");
const vegetationOutDir = join(root, "public", "assets", "vegetation");
const textureOutDir = join(root, "public", "assets", "textures");
const conceptTextureOutDir = join(textureOutDir, "concept");
mkdirSync(terrainOutDir, { recursive: true });
mkdirSync(vegetationOutDir, { recursive: true });
mkdirSync(textureOutDir, { recursive: true });
mkdirSync(conceptTextureOutDir, { recursive: true });

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

function writePng(outDir, fileName, width, height, pixelAt) {
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
const distanceToLine = (x, y, ax, ay, bx, by) => {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = x - ax;
  const wy = y - ay;
  const lengthSq = vx * vx + vy * vy || 1;
  const t = clamp((wx * vx + wy * vy) / lengthSq, 0, 1);
  const px = ax + vx * t;
  const py = ay + vy * t;
  const dx = x - px;
  const dy = y - py;
  return Math.sqrt(dx * dx + dy * dy);
};

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

function edgeAlpha(x, y, width, height, feather) {
  const distance = Math.min(x, y, width - 1 - x, height - 1 - y);
  return Math.round(clamp(smooth(clamp(distance / feather, 0, 1)) * 255, 0, 255));
}

function softPatchAlpha(x, y, width, height, feather = 0.18) {
  const nx = (x / (width - 1) - 0.5) / 0.5;
  const ny = (y / (height - 1) - 0.5) / 0.5;
  const edgeNoise = (fbm(x, y, 613, width, height) - 0.5) * 0.08;
  const distance = 1 - Math.sqrt(nx * nx + ny * ny) + edgeNoise;
  return Math.round(clamp(smooth(clamp(distance / feather, 0, 1)) * 255, 0, 255));
}

function ellipseMask(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return Math.max(0, 1 - dx * dx - dy * dy);
}

function softShapeAlpha(amount) {
  return Math.round(clamp(smooth(clamp(amount, 0, 1)) * 255, 0, 255));
}

function grassBladeAmount(x, y) {
  const cellSize = 6;
  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);
  const localX = x - cellX * cellSize;
  const localY = y - cellY * cellSize;
  const density = hash(cellX, cellY, 71);
  if (density < 0.56) return 0;

  const anchorX = Math.floor(hash(cellX, cellY, 72) * cellSize);
  const anchorY = Math.floor(hash(cellX, cellY, 73) * cellSize);
  const length = 2 + Math.floor(hash(cellX, cellY, 74) * 4);
  const lean = hash(cellX, cellY, 75) > 0.5 ? 0.35 : -0.35;
  const dy = localY - anchorY;
  if (dy < 0 || dy > length) return 0;
  const bladeX = anchorX + dy * lean;
  const distance = Math.abs(localX - bladeX);
  return distance < 0.65 ? 1 - distance / 0.65 : 0;
}

function woodGrain(x, y, seed, width, height) {
  const flow = tileNoise(x, y, 42, seed, width, height) * 22;
  const longWave = Math.sin((y * 0.18 + flow) * Math.PI);
  const fineWave = Math.sin((y * 0.72 + flow * 0.45) * Math.PI);
  return longWave * 0.72 + fineWave * 0.28;
}

function stoneColor(x, y, width, height, baseDark = [90, 96, 92], baseLight = [150, 156, 148]) {
  const broad = fbm(x, y, 161, width, height);
  const veins = Math.abs(Math.sin((x * 0.08 + y * 0.045 + tileNoise(x, y, 28, 162, width, height) * 3.4) * Math.PI));
  let color = mixColor(baseDark, baseLight, broad * 0.8);
  if (veins < 0.13) color = mixColor(color, [56, 61, 58], 0.35);
  if (speckle(x, y, 163, 0.94)) color = shade(color, hash(x, y, 164) > 0.5 ? 24 : -28);
  return color;
}

function tileMortar(x, y, width, height, tileW, tileH, stagger = 0) {
  const row = Math.floor(y / tileH);
  const offsetX = row % 2 ? stagger : 0;
  const localX = (x + offsetX) % tileW;
  const localY = y % tileH;
  const edge = Math.min(localX, tileW - localX, localY, tileH - localY);
  return edge;
}

function cellBlobAmount(x, y, cellSize, seed, density = 0.42) {
  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);
  if (hash(cellX, cellY, seed) > density) return 0;
  const localX = x - cellX * cellSize;
  const localY = y - cellY * cellSize;
  const cx = hash(cellX, cellY, seed + 1) * cellSize;
  const cy = hash(cellX, cellY, seed + 2) * cellSize;
  const rx = cellSize * (0.16 + hash(cellX, cellY, seed + 3) * 0.18);
  const ry = cellSize * (0.12 + hash(cellX, cellY, seed + 4) * 0.16);
  return ellipseMask(localX, localY, cx, cy, rx, ry);
}

function verticalStreakAmount(x, y, seed, width, height) {
  const column = tileNoise(x, y, 22, seed, width, height);
  const waviness = tileNoise(x, y, 12, seed + 1, width, height) * 4;
  const thread = Math.abs(((x + waviness + column * 7) % 31) - 15.5);
  const falloff = smooth(clamp(y / height, 0, 1));
  return thread < 1.1 && column > 0.52 ? falloff * (1 - thread / 1.1) : 0;
}

function meadowGrassPixel(x, y, width, height, seed = 3) {
  const broad = fbm(x, y, seed, width, height);
  const meadow = tileNoise(x, y, 72, seed + 9, width, height);
  const clover = cellBlobAmount(x, y, 20, seed + 33, 0.5);
  const detail = tileNoise(x, y, 6, seed + 25, width, height);
  let color = mixColor(
    [94, 148, 54],
    [178, 209, 98],
    clamp(broad * 0.46 + meadow * 0.34 + detail * 0.16, 0, 1),
  );

  if (clover > 0.18) color = mixColor(color, [130, 186, 72], clover * 0.32);
  const sunPatch = cellBlobAmount(x + 11, y - 7, 42, seed + 42, 0.34);
  if (sunPatch > 0.18) color = mixColor(color, [196, 215, 112], sunPatch * 0.28);

  const blade = grassBladeAmount(x, y);
  if (blade > 0) {
    color = mixColor(color, hash(x, y, seed + 73) > 0.45 ? [190, 224, 112] : [76, 134, 52], blade * 0.42);
  }

  const warmFleck = tileNoise(x, y, 11, seed + 74, width, height);
  if (warmFleck > 0.8) color = mixColor(color, [184, 179, 98], (warmFleck - 0.8) * 0.8);

  const wildStem = Math.abs(((x * 0.42 - y * 0.16 + tileNoise(x, y, 18, seed + 75, width, height) * 6) % 13) - 6.5);
  if (wildStem < 0.28 && hash(Math.floor(x / 3), Math.floor(y / 11), seed + 76) > 0.5) {
    color = mixColor(color, [212, 205, 124], 0.2);
  }

  const flower = cellBlobAmount(x + 5, y + 3, 17, seed + 77, 0.22);
  if (flower > 0.34) color = mixColor(color, hash(x, y, seed + 78) > 0.58 ? [240, 224, 126] : [206, 172, 230], flower * 0.34);
  if (speckle(x, y, seed + 79, 0.972)) color = shade(color, -12);
  if (speckle(x, y, seed + 80, 0.975)) color = shade(color, 18);
  return color;
}

function cleanDirtRoadPixel(x, y, width, height, seed = 11) {
  const across = Math.abs(x / (width - 1) - 0.5) * 2;
  const centerWear = Math.max(0, 1 - across);
  const soil = fbm(x, y, seed, width, height);
  const fineDust = tileNoise(x, y, 9, seed + 4, width, height);
  const lengthGrain = Math.sin((y * 0.12 + tileNoise(x, y, 28, seed + 9, width, height) * 1.8) * Math.PI);
  let color = mixColor([154, 101, 54], [221, 159, 82], soil * 0.45 + centerWear * 0.22 + fineDust * 0.18);
  color = shade(color, Math.round(lengthGrain * 4 - across * 6));

  const softPebble = cellBlobAmount(x, y, 18, seed + 31, 0.24);
  if (softPebble > 0.22) color = mixColor(color, [196, 178, 132], softPebble * 0.26);

  const dryGrassEdge = across > 0.74 && tileNoise(x, y, 21, seed + 45, width, height) > 0.56;
  if (dryGrassEdge) color = mixColor(color, [176, 163, 92], 0.14);
  if (speckle(x, y, seed + 52, 0.965)) color = shade(color, hash(x, y, seed + 53) > 0.5 ? 12 : -12);
  return color;
}

function cleanBareSoilPixel(x, y, width, height, seed = 25) {
  const broad = fbm(x, y, seed, width, height);
  const dust = tileNoise(x, y, 10, seed + 6, width, height);
  let color = mixColor([142, 96, 54], [212, 166, 96], broad * 0.52 + dust * 0.24);
  const softPebble = cellBlobAmount(x, y, 20, seed + 18, 0.22);
  if (softPebble > 0.24) color = mixColor(color, [190, 174, 128], softPebble * 0.24);
  const dryGrass = cellBlobAmount(x + 8, y - 5, 30, seed + 31, 0.25);
  if (dryGrass > 0.22) color = mixColor(color, [165, 160, 92], dryGrass * 0.16);
  if (speckle(x, y, seed + 44, 0.97)) color = shade(color, hash(x, y, seed + 45) > 0.5 ? 10 : -10);
  return color;
}

writePng(terrainOutDir, "heightmap-valley.png", 128, 128, (x, y, width, height) => {
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

writePng(terrainOutDir, "grass.png", 256, 256, (x, y, width, height) => {
  return [...meadowGrassPixel(x, y, width, height, 3), 255];
});

writePng(terrainOutDir, "meadow.png", 256, 256, (x, y, width, height) => {
  let color = meadowGrassPixel(x, y, width, height, 303);
  const flowerScatter = cellBlobAmount(x + 13, y - 9, 14, 309, 0.36);
  if (flowerScatter > 0.26) color = mixColor(color, hash(x, y, 310) > 0.5 ? [242, 226, 128] : [218, 184, 238], flowerScatter * 0.46);
  return [...color, edgeAlpha(x, y, width, height, 30)];
});

writePng(conceptTextureOutDir, "grass.png", 512, 512, (x, y, width, height) => {
  return [...meadowGrassPixel(x, y, width, height, 403), 255];
});

writePng(terrainOutDir, "sand.png", 256, 256, (x, y, width, height) => {
  const color = mixColor(cleanBareSoilPixel(x, y, width, height, 7), [228, 184, 108], 0.16);
  return [...color, softPatchAlpha(x, y, width, height, 0.2)];
});

writePng(terrainOutDir, "road.png", 256, 256, (x, y, width, height) => {
  const across = Math.abs(x / (width - 1) - 0.5) * 2;
  const color = cleanDirtRoadPixel(x, y, width, height, 11);
  const sideFade = smooth(clamp((1 - across) / 0.2, 0, 1));
  return [...color, Math.min(edgeAlpha(x, y, width, height, 18), Math.round(sideFade * 255))];
});

writePng(conceptTextureOutDir, "dirt-road.png", 512, 512, (x, y, width, height) => {
  return [...cleanDirtRoadPixel(x, y, width, height, 411), 255];
});

writePng(conceptTextureOutDir, "dark-dirt.png", 512, 512, (x, y, width, height) => {
  return [...cleanBareSoilPixel(x, y, width, height, 425), 255];
});

writePng(vegetationOutDir, "tree-leaves.png", 256, 256, (x, y, width, height) => {
  const clusters = [
    [72, 104, 62, 46],
    [118, 78, 72, 54],
    [172, 104, 66, 48],
    [92, 152, 74, 56],
    [152, 158, 72, 54],
    [128, 124, 92, 66],
  ];
  let mask = 0;
  for (const [cx, cy, rx, ry] of clusters) {
    mask = Math.max(mask, ellipseMask(x, y, cx, cy, rx, ry));
  }
  const noise = fbm(x, y, 81, width, height);
  let color = mixColor([34, 88, 42], [124, 166, 74], noise);
  const vein = Math.abs(((x * 0.36 + y * 0.22 + tileNoise(x, y, 11, 84, width, height) * 5) % 19) - 9.5);
  if (vein < 0.42) color = mixColor(color, [164, 188, 94], 0.22);
  if (hash(x, y, 82) > 0.91) color = shade(color, 22);
  if (hash(x, y, 83) > 0.91) color = shade(color, -18);
  const cut = softShapeAlpha(mask);
  return [...color, cut > 54 ? 255 : 0];
});

writePng(vegetationOutDir, "tree-leaf-shell.png", 256, 256, (x, y, width, height) => {
  const clusters = [
    [64, 132, 54, 46],
    [116, 96, 70, 56],
    [174, 124, 58, 52],
    [138, 170, 78, 46],
  ];
  let mask = 0;
  for (const [cx, cy, rx, ry] of clusters) {
    mask = Math.max(mask, ellipseMask(x, y, cx, cy, rx, ry));
  }
  let color = mixColor([38, 94, 46], [136, 176, 84], fbm(x, y, 121, width, height));
  const leafPocket = cellBlobAmount(x, y, 16, 123, 0.44);
  if (leafPocket > 0.2) color = mixColor(color, [26, 72, 38], leafPocket * 0.24);
  const interior = mask > 0.12 ? 255 : 0;
  const holes = hash(Math.floor(x / 7), Math.floor(y / 7), 122) > 0.86 && mask > 0.35 ? 0 : interior;
  return [...color, holes];
});

writePng(vegetationOutDir, "tree-bark.png", 256, 256, (x, y, width, height) => {
  const vertical = Math.sin((x * 0.14 + tileNoise(x, y, 18, 131, width, height) * 2.4) * Math.PI);
  const knots = tileNoise(x, y, 26, 132, width, height);
  let color = mixColor([68, 42, 27], [132, 82, 46], fbm(x, y, 133, width, height));
  color = shade(color, Math.round(vertical * 18));
  const furrow = Math.abs(((x + tileNoise(x, y, 12, 135, width, height) * 10) % 18) - 9);
  if (furrow < 1.2) color = mixColor(color, [36, 23, 17], 0.42);
  const raised = Math.abs(((x + tileNoise(x, y, 10, 136, width, height) * 8) % 18) - 3.5);
  if (raised < 0.8) color = mixColor(color, [158, 104, 62], 0.28);
  if (knots > 0.69) color = mixColor(color, [38, 24, 18], 0.54);
  if (hash(x, y, 134) > 0.955) color = shade(color, 22);
  return [...color, 255];
});

writePng(vegetationOutDir, "bush.png", 256, 256, (x, y, width, height) => {
  const clusters = [
    [76, 166, 54, 44],
    [122, 136, 70, 58],
    [174, 164, 58, 46],
    [132, 184, 86, 42],
  ];
  let mask = 0;
  for (const [cx, cy, rx, ry] of clusters) {
    mask = Math.max(mask, ellipseMask(x, y, cx, cy, rx, ry));
  }
  const color = mixColor([36, 92, 48], [104, 142, 74], fbm(x, y, 91, width, height));
  return [...color, softShapeAlpha(mask)];
});

writePng(vegetationOutDir, "grass-card.png", 256, 256, (x, y, width, height) => {
  const ground = y / (height - 1);
  const bladeField = Math.max(0, ground - 0.25);
  const blade = grassBladeAmount(x, y)
    || (hash(Math.floor(x / 5), Math.floor(y / 9), 101) > 0.62 && bladeField > 0 ? bladeField : 0);
  const color = mixColor([74, 134, 52], [190, 220, 112], fbm(x, y, 102, width, height));
  return [...color, Math.round(clamp(blade * 255, 0, 255))];
});

writePng(textureOutDir, "stone.png", 256, 256, (x, y, width, height) => {
  let color = stoneColor(x, y, width, height);
  const crackA = distanceToLine(x, y, 28, 74, 224, 38) < 1.1 && tileNoise(x, y, 18, 171, width, height) > 0.38;
  const crackB = distanceToLine(x, y, 52, 214, 184, 102) < 0.9 && tileNoise(x, y, 16, 172, width, height) > 0.44;
  if (crackA || crackB) color = mixColor(color, [42, 46, 44], 0.58);
  const embeddedPebble = cellBlobAmount(x, y, 21, 174, 0.38);
  if (embeddedPebble > 0.22) color = mixColor(color, [170, 168, 154], embeddedPebble * 0.34);
  const pitted = cellBlobAmount(x + 9, y + 3, 9, 175, 0.5);
  if (pitted > 0.3) color = mixColor(color, [54, 58, 56], pitted * 0.32);
  const moss = y > height * 0.62 && tileNoise(x, y, 18, 173, width, height) > 0.72;
  if (moss) color = mixColor(color, [58, 82, 48], 0.35);
  return [...color, 255];
});

writePng(textureOutDir, "weathered-wood.png", 256, 256, (x, y, width, height) => {
  const grain = woodGrain(x, y, 181, width, height);
  const plank = Math.floor(y / 42);
  let color = mixColor([83, 56, 34], [156, 105, 62], fbm(x, y + plank * 17, 182, width, height));
  color = shade(color, Math.round(grain * 18));
  if (y % 42 < 2 || y % 42 > 39) color = mixColor(color, [42, 31, 24], 0.45);
  const split = Math.abs(((x * 0.26 + y * 0.02 + tileNoise(x, y, 24, 185, width, height) * 8) % 37) - 18.5);
  if (split < 0.45 && tileNoise(x, y, 9, 186, width, height) > 0.42) color = mixColor(color, [32, 24, 18], 0.48);
  const worn = cellBlobAmount(x, y, 34, 187, 0.36);
  if (worn > 0.2) color = mixColor(color, [184, 156, 116], worn * 0.26);
  if (speckle(x, y, 183, 0.965)) color = shade(color, hash(x, y, 184) > 0.5 ? 28 : -34);
  return [...color, 255];
});

function roofTexturePixel(x, y, width, height, dark, mid, light, seed) {
  const edge = tileMortar(x, y, width, height, 38, 22, 19);
  const age = fbm(x, y, seed, width, height);
  let color = mixColor(mid, light, age * 0.42);
  color = mixColor(color, dark, tileNoise(x, y, 9, seed + 1, width, height) * 0.28);
  if (edge < 1.8) color = mixColor(color, [44, 35, 32], 0.58);
  const tileLip = y % 22;
  if (tileLip < 3.2) color = mixColor(color, [32, 28, 27], 0.25);
  if (tileLip > 15 && tileLip < 19) color = mixColor(color, light, 0.16);
  const chipped = cellBlobAmount(x, y, 18, seed + 4, 0.34);
  if (chipped > 0.28) color = mixColor(color, [78, 62, 52], chipped * 0.34);
  if (speckle(x, y, seed + 2, 0.94)) color = shade(color, hash(x, y, seed + 3) > 0.5 ? 20 : -26);
  return [...color, 255];
}

writePng(textureOutDir, "roof-tiles-red.png", 256, 256, (x, y, width, height) => (
  roofTexturePixel(x, y, width, height, [79, 36, 29], [145, 67, 48], [185, 99, 70], 191)
));

writePng(textureOutDir, "roof-tiles-teal.png", 256, 256, (x, y, width, height) => (
  roofTexturePixel(x, y, width, height, [28, 64, 67], [54, 103, 105], [88, 139, 136], 201)
));

writePng(textureOutDir, "roof-tiles-violet.png", 256, 256, (x, y, width, height) => (
  roofTexturePixel(x, y, width, height, [56, 46, 70], [96, 82, 116], [132, 116, 148], 211)
));

function plasterPixel(x, y, width, height, dark, mid, light, seed) {
  const n = fbm(x, y, seed, width, height);
  const sand = tileNoise(x, y, 5, seed + 1, width, height);
  let color = mixColor(dark, light, n * 0.7 + sand * 0.18);
  const hairline = Math.abs(((x * 0.44 + y * 0.29 + tileNoise(x, y, 26, seed + 2, width, height) * 18) % 67) - 33.5) < 0.45
    && tileNoise(x, y, 14, seed + 3, width, height) > 0.65;
  if (hairline) color = mixColor(color, dark, 0.45);
  const rainStreak = verticalStreakAmount(x, y, seed + 6, width, height);
  if (rainStreak > 0) color = mixColor(color, [72, 62, 48], rainStreak * 0.38);
  const peeled = cellBlobAmount(x, y, 38, seed + 7, 0.36);
  if (peeled > 0.24) color = mixColor(color, dark, peeled * 0.18);
  if (speckle(x, y, seed + 4, 0.965)) color = shade(color, hash(x, y, seed + 5) > 0.5 ? 15 : -20);
  return [...color, 255];
}

writePng(textureOutDir, "plaster-warm.png", 256, 256, (x, y, width, height) => (
  plasterPixel(x, y, width, height, [130, 95, 67], [178, 138, 102], [214, 178, 134], 221)
));

writePng(textureOutDir, "plaster-sage.png", 256, 256, (x, y, width, height) => (
  plasterPixel(x, y, width, height, [91, 116, 86], [138, 163, 126], [177, 196, 158], 231)
));

writePng(textureOutDir, "plaster-clay.png", 256, 256, (x, y, width, height) => (
  plasterPixel(x, y, width, height, [126, 70, 52], [177, 102, 76], [209, 142, 107], 241)
));

writePng(textureOutDir, "trim-aged.png", 256, 256, (x, y, width, height) => {
  let color = mixColor([158, 130, 91], [220, 192, 144], fbm(x, y, 251, width, height));
  color = shade(color, Math.round(woodGrain(x, y, 252, width, height) * 9));
  if (speckle(x, y, 253, 0.965)) color = shade(color, -28);
  return [...color, 255];
});

writePng(textureOutDir, "door-wood.png", 256, 256, (x, y, width, height) => {
  let color = mixColor([58, 36, 24], [117, 72, 42], fbm(x, y, 261, width, height));
  color = shade(color, Math.round(woodGrain(x, y, 262, width, height) * 22));
  if (x % 64 < 3 || x % 64 > 61) color = mixColor(color, [30, 22, 18], 0.42);
  const knot = ellipseMask(x, y, 82, 146, 19, 11) || ellipseMask(x, y, 174, 82, 17, 10);
  if (knot > 0.2) color = mixColor(color, [34, 22, 16], knot * 0.6);
  return [...color, 255];
});

writePng(textureOutDir, "window-glass.png", 256, 256, (x, y, width, height) => {
  const gradient = y / (height - 1);
  let color = mixColor([76, 112, 124], [152, 185, 190], gradient * 0.6 + fbm(x, y, 271, width, height) * 0.25);
  if (Math.abs(x - y * 0.85 - 38) < 4 || Math.abs(x - y * 0.85 - 70) < 2) color = mixColor(color, [225, 238, 230], 0.55);
  if (speckle(x, y, 272, 0.985)) color = shade(color, -22);
  return [...color, 255];
});
