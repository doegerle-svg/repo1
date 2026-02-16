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
import * as bitcoin from "bitcoinjs-lib";

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
const opReturnScript = Buffer.from(
  bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, nonceBuffer])
);

// Use bitcoinjs-lib's Psbt class for correct BIP 174 serialization
const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

psbt.addInput({
  hash: fakeTxId,
  index: 0,
  witnessUtxo: {
    script: p2wpkhScript,
    value: BigInt(totalSats),
  },
});

psbt.addOutput({
  script: opReturnScript,
  value: BigInt(0),
});

psbt.addOutput({
  script: p2wpkhScript,
  value: BigInt(totalSats - 1000),
});

// Add dummy partial signature
psbt.data.inputs[0].partialSig = [
  {
    pubkey: compressedPubKey,
    signature: createDummyDERSignature(),
  },
];

const psbtBuffer = Buffer.from(psbt.toBuffer());

const outDir = path.join(process.cwd(), "public");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "sample.psbt");
fs.writeFileSync(outPath, psbtBuffer);

console.log(`Sample PSBT file created: ${outPath}`);
console.log(`Size: ${psbtBuffer.length} bytes`);
console.log(`Base64: ${psbtBuffer.toString("base64").substring(0, 80)}...`);
console.log(`\nNote: This file uses a dummy nonce and won't pass full verification.`);
console.log(`Use the "Generate Test PSBT" button on /verify for end-to-end testing.`);
