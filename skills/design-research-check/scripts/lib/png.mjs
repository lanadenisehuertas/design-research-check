// Minimal PNG crop with no dependencies. Supports 8-bit, non-interlaced grayscale, RGB, gray+alpha and RGBA,
// which is what headless Chrome and Edge write. Used to cut the iframe wrapper margin off narrow screenshots.
import { inflateSync, deflateSync } from "node:zlib";

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function readPngSize(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("not a PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Crop a PNG to the left `width` pixels (and optionally the top `height`). Returns a new PNG buffer. */
export function cropPng(buf, width, height) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("not a PNG");
  let off = 8;
  let ihdr;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") ihdr = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error("PNG has no IHDR");
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4);
  const depth = ihdr[8], colorType = ihdr[9], interlace = ihdr[12];
  const ch = CHANNELS[colorType];
  if (depth !== 8 || !ch || interlace !== 0) throw new Error(`unsupported PNG (depth ${depth}, color type ${colorType}, interlace ${interlace})`);
  const nw = Math.min(width, w), nh = Math.min(height ?? h, h);
  if (nw === w && nh === h) return buf;

  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const outStride = nw * ch;
  const out = Buffer.alloc(nh * (outStride + 1));
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < nh; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0;
      const b = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      if (filter === 1) line[x] = (line[x] + a) & 0xff;
      else if (filter === 2) line[x] = (line[x] + b) & 0xff;
      else if (filter === 3) line[x] = (line[x] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) line[x] = (line[x] + paeth(a, b, c)) & 0xff;
      else if (filter !== 0) throw new Error(`bad PNG filter ${filter}`);
    }
    out[y * (outStride + 1)] = 0;
    line.copy(out, y * (outStride + 1) + 1, 0, outStride);
    prev = line;
  }
  const hdr = Buffer.from(ihdr);
  hdr.writeUInt32BE(nw, 0);
  hdr.writeUInt32BE(nh, 4);
  return Buffer.concat([SIG, chunk("IHDR", hdr), chunk("IDAT", deflateSync(out)), chunk("IEND", Buffer.alloc(0))]);
}

/** Build a PNG from raw RGBA pixels. Used by tests. */
export function encodeRgba(width, height, pixel) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y);
      const i = y * (width * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  const hdr = Buffer.alloc(13);
  hdr.writeUInt32BE(width, 0);
  hdr.writeUInt32BE(height, 4);
  hdr[8] = 8; hdr[9] = 6;
  return Buffer.concat([SIG, chunk("IHDR", hdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
