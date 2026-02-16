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
    value: BigInt(totalSats - 1000), // minus fee
  });

  // Add a dummy partial signature to prove "ownership"
  psbt.data.inputs[0].partialSig = [
    {
      pubkey: compressedPubKey,
      signature: createDummyDERSignature(),
    },
  ];

  return psbt.toBase64();
}

function createDummyDERSignature(): Buffer {
  // Create a properly formatted DER signature with SIGHASH_ALL
  // DER format: 30 <len> 02 <r_len> <r> 02 <s_len> <s> <sighash>
  const r = crypto.randomBytes(32);
  const s = crypto.randomBytes(32);

  // If high bit is set, prepend a 0x00 byte (DER encoding rule)
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
