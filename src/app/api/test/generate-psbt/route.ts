import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import * as bitcoin from "bitcoinjs-lib";
import crypto from "crypto";

/**
 * Test endpoint: Generates a valid PSBT for a given challenge.
 * This creates a PSBT with a test keypair, fake UTXOs, and the
 * challenge nonce as an OP_RETURN output - suitable for testing
 * the full verification flow.
 *
 * POST /api/test/generate-psbt
 * Body: { challengeId: string, amountBtc?: number }
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  let body: { challengeId: string; amountBtc?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { challengeId, amountBtc = 1.5 } = body;

  if (!challengeId) {
    return NextResponse.json(
      { success: false, error: "Missing challengeId" },
      { status: 400 }
    );
  }

  // Look up the challenge to get the nonce
  const db = getDb();
  const challenge = db
    .prepare(
      `SELECT * FROM challenges
       WHERE id = ? AND user_id = ? AND used = 0 AND expires_at > datetime('now')`
    )
    .get(challengeId, user.id) as Record<string, string> | undefined;

  if (!challenge) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid or expired challenge. Generate a new one first.",
      },
      { status: 400 }
    );
  }

  try {
    const psbtBase64 = generateTestPSBT(challenge.nonce, amountBtc);

    return NextResponse.json({
      success: true,
      data: {
        psbt: psbtBase64,
        amountBtc,
        nonce: challenge.nonce,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate test PSBT: ${(err as Error).message}`,
      },
      { status: 500 }
    );
  }
}

function generateTestPSBT(nonce: string, amountBtc: number): string {
  const SATOSHIS_PER_BTC = 100_000_000;
  const totalSats = Math.round(amountBtc * SATOSHIS_PER_BTC);

  // Generate a test keypair using Node.js crypto
  const ecdh = crypto.createECDH("secp256k1");
  ecdh.generateKeys();
  const compressedPubKey = Buffer.from(ecdh.getPublicKey(null, "compressed"));

  // Compute hash160(pubkey) for P2WPKH
  const sha256Hash = crypto.createHash("sha256").update(compressedPubKey).digest();
  const hash160 = crypto.createHash("ripemd160").update(sha256Hash).digest();

  // P2WPKH script: OP_0 <20-byte-hash>
  const p2wpkhScript = Buffer.concat([
    Buffer.from([0x00, 0x14]), // OP_0, PUSH_20
    hash160,
  ]);

  // Create a fake previous transaction ID
  const fakeTxId = crypto.randomBytes(32);

  // Build the OP_RETURN script: OP_RETURN <push_data> <nonce_bytes>
  const nonceBuffer = Buffer.from(nonce, "utf8");
  const opReturnScript = Buffer.from(
    bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, nonceBuffer])
  );

  // Build the PSBT manually at the binary level for maximum compatibility
  // PSBT format: magic (5 bytes) + global map + input maps + output maps
  const psbt = buildPSBT({
    txVersion: 2,
    inputs: [
      {
        prevTxId: fakeTxId,
        prevIndex: 0,
        witnessUtxo: {
          script: p2wpkhScript,
          value: totalSats,
        },
        partialSig: {
          pubkey: compressedPubKey,
          signature: createDummyDERSignature(),
        },
      },
    ],
    outputs: [
      {
        script: opReturnScript,
        value: 0,
      },
      {
        script: p2wpkhScript,
        value: totalSats - 1000, // minus fee
      },
    ],
  });

  return psbt.toString("base64");
}

function createDummyDERSignature(): Buffer {
  // Create a properly formatted DER signature with SIGHASH_ALL
  // DER format: 30 <len> 02 <r_len> <r> 02 <s_len> <s> <sighash>
  const r = crypto.randomBytes(32);
  const s = crypto.randomBytes(32);

  // Ensure r and s don't have leading zero issues
  // If high bit is set, prepend a 0x00 byte
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
    Buffer.from([0x01]), // SIGHASH_ALL
  ]);
}

interface PSBTInput {
  prevTxId: Buffer;
  prevIndex: number;
  witnessUtxo: {
    script: Buffer;
    value: number;
  };
  partialSig: {
    pubkey: Buffer;
    signature: Buffer;
  };
}

interface PSBTOutput {
  script: Buffer;
  value: number;
}

interface PSBTParams {
  txVersion: number;
  inputs: PSBTInput[];
  outputs: PSBTOutput[];
}

function buildPSBT(params: PSBTParams): Buffer {
  const { txVersion, inputs, outputs } = params;

  // Build the unsigned transaction
  const unsignedTx = buildUnsignedTx(txVersion, inputs, outputs);

  const parts: Buffer[] = [];

  // PSBT magic bytes: "psbt" + 0xff
  parts.push(Buffer.from([0x70, 0x73, 0x62, 0x74, 0xff]));

  // === Global map ===
  // Key: 0x00 (unsigned tx)
  parts.push(writeKeyValue(Buffer.from([0x00]), unsignedTx));
  // Separator
  parts.push(Buffer.from([0x00]));

  // === Input maps ===
  for (const input of inputs) {
    // Key 0x01: Non-witness UTXO (skip, we use witness)
    // Key 0x02: Partial signature
    const partialSigKey = Buffer.concat([Buffer.from([0x02]), input.partialSig.pubkey]);
    parts.push(writeKeyValue(partialSigKey, input.partialSig.signature));

    // Key 0x08: Witness UTXO
    const witnessUtxoValue = serializeWitnessUtxo(input.witnessUtxo);
    parts.push(writeKeyValue(Buffer.from([0x08]), witnessUtxoValue));

    // Separator
    parts.push(Buffer.from([0x00]));
  }

  // === Output maps ===
  for (let i = 0; i < outputs.length; i++) {
    // Empty output map (no extra data needed)
    parts.push(Buffer.from([0x00]));
  }

  return Buffer.concat(parts);
}

function buildUnsignedTx(
  version: number,
  inputs: PSBTInput[],
  outputs: PSBTOutput[]
): Buffer {
  const parts: Buffer[] = [];

  // Version (4 bytes LE)
  const versionBuf = Buffer.alloc(4);
  versionBuf.writeUInt32LE(version);
  parts.push(versionBuf);

  // Input count (varint)
  parts.push(writeVarint(inputs.length));

  for (const input of inputs) {
    // Previous tx hash (32 bytes, internal byte order = reversed display order)
    parts.push(input.prevTxId);
    // Previous output index (4 bytes LE)
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(input.prevIndex);
    parts.push(indexBuf);
    // ScriptSig length (0 for unsigned)
    parts.push(Buffer.from([0x00]));
    // Sequence (4 bytes LE, 0xfffffffe for RBF)
    parts.push(Buffer.from([0xfe, 0xff, 0xff, 0xff]));
  }

  // Output count (varint)
  parts.push(writeVarint(outputs.length));

  for (const output of outputs) {
    // Value (8 bytes LE)
    const valueBuf = Buffer.alloc(8);
    valueBuf.writeBigUInt64LE(BigInt(output.value));
    parts.push(valueBuf);
    // Script length + script
    parts.push(writeVarint(output.script.length));
    parts.push(output.script);
  }

  // Locktime (4 bytes LE, 0)
  parts.push(Buffer.from([0x00, 0x00, 0x00, 0x00]));

  return Buffer.concat(parts);
}

function serializeWitnessUtxo(utxo: { script: Buffer; value: number }): Buffer {
  const valueBuf = Buffer.alloc(8);
  valueBuf.writeBigUInt64LE(BigInt(utxo.value));
  return Buffer.concat([
    valueBuf,
    writeVarint(utxo.script.length),
    utxo.script,
  ]);
}

function writeKeyValue(key: Buffer, value: Buffer): Buffer {
  return Buffer.concat([
    writeVarint(key.length),
    key,
    writeVarint(value.length),
    value,
  ]);
}

function writeVarint(n: number): Buffer {
  if (n < 0xfd) {
    return Buffer.from([n]);
  } else if (n <= 0xffff) {
    const buf = Buffer.alloc(3);
    buf[0] = 0xfd;
    buf.writeUInt16LE(n, 1);
    return buf;
  } else {
    const buf = Buffer.alloc(5);
    buf[0] = 0xfe;
    buf.writeUInt32LE(n, 1);
    return buf;
  }
}
