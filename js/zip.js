// Tiny zip writer — uncompressed (STORE / method 0) entries only.
// Sufficient for bundling a handful of text SVGs. No external dependency.
//
// File format reference: PKZIP APPNOTE.TXT
//   Per entry: Local File Header + file name + raw bytes (no compression)
//   End:       Central Directory (one record per entry) + End-Of-Central-Directory record.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const enc = new TextEncoder();

function dosDateTime(d = new Date()) {
  const time =
    (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
  const date =
    ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

function writeU16(view, off, v) { view.setUint16(off, v, true); }
function writeU32(view, off, v) { view.setUint32(off, v, true); }

// files: Array<{ name: string, bytes: Uint8Array | string }>
export function buildZip(files) {
  const { time, date } = dosDateTime();
  const entries = files.map((f) => {
    const bytes = typeof f.bytes === "string" ? enc.encode(f.bytes) : f.bytes;
    const nameBytes = enc.encode(f.name);
    return { name: f.name, nameBytes, bytes, crc: crc32(bytes) };
  });

  // Compute sizes
  const LFH = 30; // local file header fixed size
  const CDH = 46; // central directory header fixed size
  const EOCD = 22;

  let totalLocal = 0;
  for (const e of entries) totalLocal += LFH + e.nameBytes.length + e.bytes.length;
  let totalCentral = 0;
  for (const e of entries) totalCentral += CDH + e.nameBytes.length;

  const out = new Uint8Array(totalLocal + totalCentral + EOCD);
  const view = new DataView(out.buffer);

  let off = 0;
  const offsets = [];

  // Local file headers + data
  for (const e of entries) {
    offsets.push(off);
    writeU32(view, off, 0x04034b50); // local file header signature
    writeU16(view, off + 4, 20);     // version needed
    writeU16(view, off + 6, 0);      // general purpose
    writeU16(view, off + 8, 0);      // method = store
    writeU16(view, off + 10, time);
    writeU16(view, off + 12, date);
    writeU32(view, off + 14, e.crc);
    writeU32(view, off + 18, e.bytes.length); // compressed size
    writeU32(view, off + 22, e.bytes.length); // uncompressed size
    writeU16(view, off + 26, e.nameBytes.length);
    writeU16(view, off + 28, 0);     // extra field length
    out.set(e.nameBytes, off + 30);
    out.set(e.bytes, off + 30 + e.nameBytes.length);
    off += 30 + e.nameBytes.length + e.bytes.length;
  }

  const centralStart = off;

  // Central directory headers
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    writeU32(view, off, 0x02014b50);     // central dir signature
    writeU16(view, off + 4, 20);         // version made by
    writeU16(view, off + 6, 20);         // version needed
    writeU16(view, off + 8, 0);          // general purpose
    writeU16(view, off + 10, 0);         // method
    writeU16(view, off + 12, time);
    writeU16(view, off + 14, date);
    writeU32(view, off + 16, e.crc);
    writeU32(view, off + 20, e.bytes.length);
    writeU32(view, off + 24, e.bytes.length);
    writeU16(view, off + 28, e.nameBytes.length);
    writeU16(view, off + 30, 0);         // extra
    writeU16(view, off + 32, 0);         // comment
    writeU16(view, off + 34, 0);         // disk number start
    writeU16(view, off + 36, 0);         // internal attrs
    writeU32(view, off + 38, 0);         // external attrs
    writeU32(view, off + 42, offsets[i]);
    out.set(e.nameBytes, off + 46);
    off += 46 + e.nameBytes.length;
  }

  const centralSize = off - centralStart;

  // End of central directory record
  writeU32(view, off, 0x06054b50);
  writeU16(view, off + 4, 0);            // disk number
  writeU16(view, off + 6, 0);            // disk where central dir starts
  writeU16(view, off + 8, entries.length);
  writeU16(view, off + 10, entries.length);
  writeU32(view, off + 12, centralSize);
  writeU32(view, off + 16, centralStart);
  writeU16(view, off + 20, 0);           // comment length

  return out;
}
