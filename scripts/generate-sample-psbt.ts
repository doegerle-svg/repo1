/**
 * Generates a sample .psbt file for testing the upload UI.
 * This file uses a dummy nonce and won't pass full verification,
 * but can be used to test drag-and-drop, file selection, and the upload flow.
 *
 * For full end-to-end testing, use the "Generate Test PSBT" button
 * on the /verify page instead.
 *
 * Usage: npx tsx scripts/generate-sample-psbt.ts
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

const DUMMY_NONCE = "satstack:0000000000000000000000000000000000";

function createDummyDERSignature(): Buffer {
  const r = crypto.randomBytes(32);
  const s = crypto.randomBytes(32);
  const rPadded = r[0] & 0x80 ? Buffer.concat([Buffer.from([0x00]), r]) : r;
  const sPadded = s[0] & 0x80 ? Buffer.concat([Buffer.from([0x00]), s]) : s;
  const rLen = rPadded.length;
  const sLen = sPadded.length;
  const totalLen = 2 + rLen + 2 + sLen;
  return Buffer.concat([
    Buffer.from([0x30, totalLen, 0x02, rLen]),
    rPadded,
    Buffer.from([0x02, sLen]),
    sPadded,
    Buffer.from([0x01]),
  ]);
}

function writeVarint(n: number): Buffer {
  if (n < 0xfd) return Buffer.from([n]);
  if (n <= 0xffff) {
    const buf = Buffer.alloc(3);
    buf[0] = 0xfd;
    buf.writeUInt16LE(n, 1);
    return buf;
  }
  const buf = Buffer.alloc(5);
  buf[0] = 0xfe;
  buf.writeUInt32LE(n, 1);
  return buf;
}

function writeKeyValue(key: Buffer, value: Buffer): Buffer {
  return Buffer.concat([
    writeVarint(key.length),
    key,
    writeVarint(value.length),
    value,
  ]);
}

// Generate a test keypair
const ecdh = crypto.createECDH("secp256k1");
ecdh.generateKeys();
const compressedPubKey = Buffer.from(ecdh.getPublicKey(null, "compressed"));
const sha256Hash = crypto.createHash("sha256").update(compressedPubKey).digest();
const hash160 = crypto.createHash("ripemd160").update(sha256Hash).digest();
const p2wpkhScript = Buffer.concat([Buffer.from([0x00, 0x14]), hash160]);

const fakeTxId = crypto.randomBytes(32);
const totalSats = 150_000_000; // 1.5 BTC

// OP_RETURN script
const nonceBuffer = Buffer.from(DUMMY_NONCE, "utf8");
// OP_RETURN OP_PUSHDATA
const opReturnScript = Buffer.concat([
  Buffer.from([0x6a]), // OP_RETURN
  Buffer.from([nonceBuffer.length]), // push length
  nonceBuffer,
]);

// Build unsigned transaction
const txParts: Buffer[] = [];
// Version
const versionBuf = Buffer.alloc(4);
versionBuf.writeUInt32LE(2);
txParts.push(versionBuf);
// 1 input
txParts.push(Buffer.from([0x01]));
txParts.push(fakeTxId);
const indexBuf = Buffer.alloc(4);
indexBuf.writeUInt32LE(0);
txParts.push(indexBuf);
txParts.push(Buffer.from([0x00])); // empty scriptSig
txParts.push(Buffer.from([0xfe, 0xff, 0xff, 0xff])); // sequence
// 2 outputs
txParts.push(Buffer.from([0x02]));
// OP_RETURN output (value 0)
txParts.push(Buffer.alloc(8)); // 0 sats
txParts.push(writeVarint(opReturnScript.length));
txParts.push(opReturnScript);
// Change output
const changeBuf = Buffer.alloc(8);
changeBuf.writeBigUInt64LE(BigInt(totalSats - 1000));
txParts.push(changeBuf);
txParts.push(writeVarint(p2wpkhScript.length));
txParts.push(p2wpkhScript);
// Locktime
txParts.push(Buffer.alloc(4));

const unsignedTx = Buffer.concat(txParts);

// Build PSBT
const psbtParts: Buffer[] = [];
// Magic
psbtParts.push(Buffer.from([0x70, 0x73, 0x62, 0x74, 0xff]));
// Global: unsigned tx
psbtParts.push(writeKeyValue(Buffer.from([0x00]), unsignedTx));
psbtParts.push(Buffer.from([0x00])); // separator

// Input map
const partialSigKey = Buffer.concat([Buffer.from([0x02]), compressedPubKey]);
psbtParts.push(writeKeyValue(partialSigKey, createDummyDERSignature()));
const valueBuf = Buffer.alloc(8);
valueBuf.writeBigUInt64LE(BigInt(totalSats));
const witnessUtxoData = Buffer.concat([
  valueBuf,
  writeVarint(p2wpkhScript.length),
  p2wpkhScript,
]);
psbtParts.push(writeKeyValue(Buffer.from([0x08]), witnessUtxoData));
psbtParts.push(Buffer.from([0x00])); // separator

// Output maps (empty)
psbtParts.push(Buffer.from([0x00]));
psbtParts.push(Buffer.from([0x00]));

const psbtBuffer = Buffer.concat(psbtParts);

const outDir = path.join(process.cwd(), "public");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "sample.psbt");
fs.writeFileSync(outPath, psbtBuffer);

console.log(`Sample PSBT file created: ${outPath}`);
console.log(`Size: ${psbtBuffer.length} bytes`);
console.log(`Base64: ${psbtBuffer.toString("base64").substring(0, 80)}...`);
console.log(`\nNote: This file uses a dummy nonce and won't pass full verification.`);
console.log(`Use the "Generate Test PSBT" button on /verify for end-to-end testing.`);
