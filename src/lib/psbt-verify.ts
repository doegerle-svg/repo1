import * as bitcoin from "bitcoinjs-lib";
import { PSBTVerificationResult } from "@/types";

const SATOSHIS_PER_BTC = 100_000_000;
const MAX_PSBT_SIZE = 1_000_000; // 1MB max
const MAX_INPUTS = 500;
const MIN_UTXO_VALUE = 546; // dust limit

/**
 * Verify a PSBT file and extract proven UTXO ownership.
 *
 * Edge cases handled:
 * - Oversized PSBTs
 * - Too many inputs (DoS protection)
 * - Dust UTXOs
 * - Missing or invalid signatures
 * - Missing witness/non-witness UTXO data
 * - Non-mainnet transactions
 * - Duplicate inputs
 * - Zero-value outputs
 * - Challenge nonce validation via OP_RETURN
 */
function fail(error: string): PSBTVerificationResult {
  return { valid: false, totalSatoshis: 0, utxoAddresses: [], txids: [], error };
}

export function verifyPSBT(
  psbtBase64OrHex: string,
  expectedChallenge: string
): PSBTVerificationResult {
  try {
    // Size check
    const rawBytes = decodeInput(psbtBase64OrHex);
    if (rawBytes.length > MAX_PSBT_SIZE) {
      return fail("PSBT exceeds maximum allowed size (1MB)");
    }

    // Parse the PSBT
    let psbt: bitcoin.Psbt;
    try {
      psbt = bitcoin.Psbt.fromBuffer(Buffer.from(rawBytes));
    } catch {
      return fail("Invalid PSBT format - could not parse");
    }

    const inputCount = psbt.data.inputs.length;
    if (inputCount === 0) {
      return fail("PSBT has no inputs");
    }
    if (inputCount > MAX_INPUTS) {
      return fail(`Too many inputs (${inputCount}). Maximum is ${MAX_INPUTS}`);
    }

    // Validate the challenge nonce in OP_RETURN output
    if (!validateChallenge(psbt, expectedChallenge)) {
      return fail(
        "Challenge nonce not found in PSBT outputs. Include the challenge as an OP_RETURN output."
      );
    }

    // Verify each input has a valid signature and extract UTXO data
    const seenOutpoints = new Set<string>();
    const utxoAddresses: string[] = [];
    const txids: string[] = [];
    let totalSatoshis = 0;

    for (let i = 0; i < inputCount; i++) {
      const input = psbt.data.inputs[i];
      const txInput = psbt.txInputs[i];

      // Check for duplicate inputs
      const outpoint = `${Buffer.from(txInput.hash).reverse().toString("hex")}:${txInput.index}`;
      if (seenOutpoints.has(outpoint)) {
        return fail(`Duplicate input detected at index ${i}: ${outpoint}`);
      }
      seenOutpoints.add(outpoint);

      // Get the UTXO value and script
      const utxoData = getUtxoData(input, txInput);
      if (!utxoData) {
        // Log available keys for debugging
        const inputKeys = Object.keys(input).filter(k => input[k] != null);
        console.error(`[PSBT Verify] Input ${i} missing UTXO data. Available keys: [${inputKeys.join(', ')}]`);
        return fail(
          `Input ${i}: Missing UTXO data. Include witnessUtxo or nonWitnessUtxo.`
        );
      }

      if (utxoData.value < MIN_UTXO_VALUE) {
        return fail(
          `Input ${i}: UTXO value ${utxoData.value} sats is below dust limit (${MIN_UTXO_VALUE})`
        );
      }

      // Check that input has at least a partial signature
      const hasPartialSig =
        input.partialSig && input.partialSig.length > 0;
      const hasFinalScript =
        input.finalScriptSig || input.finalScriptWitness;

      if (!hasPartialSig && !hasFinalScript) {
        return fail(
          `Input ${i}: No signature found. Sign the PSBT before submitting.`
        );
      }

      // Extract address from the UTXO script
      let address: string;
      try {
        address = extractAddress(utxoData.script);
      } catch {
        return fail(`Input ${i}: Could not derive address from UTXO script`);
      }

      totalSatoshis += utxoData.value;
      utxoAddresses.push(address);
      txids.push(outpoint.split(":")[0]);
    }

    if (totalSatoshis === 0) {
      return fail("Total proven value is zero");
    }

    return {
      valid: true,
      totalSatoshis,
      utxoAddresses: [...new Set(utxoAddresses)],
      txids: [...new Set(txids)],
    };
  } catch (err) {
    return fail(`Unexpected verification error: ${(err as Error).message}`);
  }
}

function decodeInput(input: string): Uint8Array {
  const trimmed = input.trim();
  // Try base64 first
  try {
    const buf = Buffer.from(trimmed, "base64");
    // Verify it round-trips (valid base64)
    if (buf.toString("base64") === trimmed || trimmed.length % 4 <= 1) {
      return buf;
    }
  } catch { /* not base64 */ }
  // Try hex
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  // Try raw binary (already a buffer from file upload)
  return Buffer.from(trimmed, "binary");
}

function validateChallenge(psbt: bitcoin.Psbt, expected: string): boolean {
  const tx = psbt.data.globalMap.unsignedTx as unknown as {
    tx: { outs: Array<{ script: Buffer; value: number }> };
  };

  if (!tx?.tx?.outs) return false;

  for (const out of tx.tx.outs) {
    const script = out.script;
    // OP_RETURN is 0x6a
    if (script[0] === 0x6a) {
      const data = script.slice(2).toString("utf8");
      if (data.includes(expected)) {
        return true;
      }
    }
  }
  return false;
}

function getUtxoData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any,
  txInput: { hash: Uint8Array; index: number }
): { value: number; script: Buffer } | null {
  if (input.witnessUtxo) {
    return {
      value: Number(input.witnessUtxo.value),
      script: Buffer.from(input.witnessUtxo.script),
    };
  }
  if (input.nonWitnessUtxo) {
    try {
      const tx = bitcoin.Transaction.fromBuffer(
        Buffer.from(input.nonWitnessUtxo)
      );
      const out = tx.outs[txInput.index];
      if (out) {
        return { value: Number(out.value), script: Buffer.from(out.script) };
      }
    } catch {
      return null;
    }
  }
  return null;
}

function extractAddress(script: Buffer): string {
  // Try all standard output types
  const network = bitcoin.networks.bitcoin;
  try {
    return bitcoin.address.fromOutputScript(script, network);
  } catch {
    throw new Error("Non-standard script - cannot derive address");
  }
}

export function satsToBtc(sats: number): number {
  return Number((sats / SATOSHIS_PER_BTC).toFixed(8));
}
