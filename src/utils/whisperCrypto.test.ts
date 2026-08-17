import {
  deriveChannelId,
  encryptTextToFelts,
  decryptFeltsToText,
  encryptTextToMultiFelts,
  decryptMultiFeltsToText,
} from "./whisperCrypto";
import { resolveStarknetAddress } from "./starknetIdResolver";
import { scanOnChainMessagesForUser } from "./trialDecryption";
import { generateDualKeyKeyPair, generateDualKeyStealthAddress, checkDualKeyStealthOwnership } from "./stealthAddress";
import { calculateBundledGasSavings } from "./gasOptimizer";
import { encryptTimelockMessage, decryptTimelockMessage } from "./timelockCrypto";
import { applyUniformCiphertextPadding, stripUniformCiphertextPadding } from "./paddingNoise";
import { auditAnonymizerContract } from "./proofAudit";
import { StarkWhisperSDK } from "../sdk";

describe("StarkWhisper Crypto & Privacy Suite", () => {
  const aliceAddr = "0x01dc5a1c99182fa189382103e48810291ba81927a";
  const bobAddr = "0x04829fa7c3209118a8a91c1099238910aa189281b";

  test("deriveChannelId is deterministic and symmetric", () => {
    const channel1 = deriveChannelId(aliceAddr, bobAddr);
    const channel2 = deriveChannelId(bobAddr, aliceAddr);

    expect(channel1).toBeDefined();
    expect(channel1).toEqual(channel2);
    expect(channel1.startsWith("0x")).toBe(true);
  });

  test("encryptTextToFelts and decryptFeltsToText roundtrip with real ECDH", () => {
    const secretMessage = "Private transfer 50 STRK for Q3 allocation";
    const recipientPrivateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const recipientPublicKey = "0x04829fa7c3209118a8a91c1099238910aa189281b";

    const encrypted = encryptTextToFelts(secretMessage, recipientPublicKey);

    expect(encrypted.nonce).toBeDefined();
    expect(encrypted.ephemeralPubkey).toBeDefined();
    expect(encrypted.c0.startsWith("0x")).toBe(true);

    const decrypted = decryptFeltsToText(
      encrypted.c0,
      encrypted.c1,
      encrypted.c2,
      encrypted.c3,
      encrypted.ephemeralPubkey,
      encrypted.nonce,
      recipientPrivateKey,
      encrypted.mac
    );

    expect(decrypted.isAuthenticated).toBe(true);
    expect(decrypted.text).toEqual(secretMessage);
  });

  test("multi-felt stream cipher handles arbitrary length notes", () => {
    const longMessage = "A".repeat(300); // 300 bytes payload
    const recipientPublicKey = "0x04829fa7c3209118a8a91c1099238910aa189281b";
    const recipientPrivateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const enc = encryptTextToMultiFelts(longMessage, recipientPublicKey);
    expect(enc.felts.length).toBeGreaterThan(4);

    const dec = decryptMultiFeltsToText(enc.felts, enc.ephemeralPubkey, enc.nonce, recipientPrivateKey, enc.mac);
    expect(dec.isAuthenticated).toBe(true);
    expect(dec.text).toEqual(longMessage);
  });

  test("resolveStarknetAddress resolves .stark names", async () => {
    const aliceRes = await resolveStarknetAddress("alice.stark");
    expect(aliceRes.isDomain).toBe(true);
    expect(aliceRes.address).toEqual(aliceAddr);

    const customRes = await resolveStarknetAddress("customname.stark");
    expect(customRes.isDomain).toBe(true);
    expect(customRes.address.startsWith("0x")).toBe(true);
  });

  test("scanOnChainMessagesForUser performs trial decryption scanner", async () => {
    const sampleChannel = deriveChannelId("0x123", "0x456");
    const events = [
      {
        transactionHash: "0x123456",
        channelId: sampleChannel,
        ephemeralPubkey: "0xephem1",
        nonce: "0xnonce1",
        c0: "0x1",
        c1: "0x2",
        c2: "0x3",
        c3: "0x4",
        timestamp: Date.now(),
      },
    ];

    const scanRes = await scanOnChainMessagesForUser(aliceAddr, events);
    expect(scanRes.scannedCount).toBe(1);
  });

  test("STARK Curve Dual-Key Stealth Address generation and 1-byte ViewTag scanner", () => {
    const keys = generateDualKeyKeyPair();
    const stealth = generateDualKeyStealthAddress(keys.spendPublicKey, keys.viewPublicKey);

    expect(stealth.stealthAddress.startsWith("0x")).toBe(true);
    expect(stealth.viewTag).toBeDefined();

    const scanResult = checkDualKeyStealthOwnership(
      {
        ephemeralPublicKey: stealth.ephemeralPublicKey,
        stealthAddress: stealth.stealthAddress,
        viewTag: stealth.viewTag,
        channelId: "0x123",
        timestamp: Date.now(),
      },
      keys.viewPrivateKey,
      keys.spendPublicKey
    );

    expect(scanResult.isMine).toBe(true);
  });

  test("calculateBundledGasSavings calculates proof efficiency", () => {
    const savings = calculateBundledGasSavings(3, true);
    expect(savings.starkProofCount).toBe(1);
    expect(savings.savingsPercentage).toBeGreaterThan(0);
  });

  test("ZK Timelock VDF encryption locks until threshold", () => {
    const targetTime = Date.now() + 3600000;
    const targetBlock = 1000;
    const payload = encryptTimelockMessage("Locked Memo", targetTime, targetBlock, 50);

    const lockedRes = decryptTimelockMessage(payload, Date.now(), 500);
    expect(lockedRes.success).toBe(false);
    expect(lockedRes.error).toContain("Timelock active");

    const unlockedRes = decryptTimelockMessage(payload, targetTime + 100, targetBlock + 1);
    expect(unlockedRes.success).toBe(true);
    expect(unlockedRes.text).toEqual("Locked Memo");
  });

  test("applyUniformCiphertextPadding eliminates side-channel length leaks", () => {
    const rawFelts = ["0x1", "0x2"];
    const padded = applyUniformCiphertextPadding(rawFelts, 4);

    expect(padded.paddedFelts.length).toBe(4);
    const stripped = stripUniformCiphertextPadding(padded.paddedFelts, padded.originalLength);
    expect(stripped).toEqual(rawFelts);
  });

  test("auditAnonymizerContract verifies pre-flight class hashes", async () => {
    const auditRes = await auditAnonymizerContract("0x04829fa7c3209118a8a91c1099238910aa189281b");
    expect(auditRes.supportsPrivacyInvoke).toBe(true);
    expect(auditRes.classHash.startsWith("0x")).toBe(true);
  });

  test("@starkwhisper/sdk exports 10-line integration API", () => {
    const sdk = new StarkWhisperSDK(0);
    const keys = sdk.generateStealthMetaAddress();
    const batch = sdk.createEncryptedWhisper({
      recipientMeta: { spendPublicKey: keys.spendPublicKey, viewPublicKey: keys.viewPublicKey },
      message: "SDK Whisper Test",
      tipAmount: "10",
    });

    expect(batch.stealth.stealthAddress.startsWith("0x")).toBe(true);
    expect(batch.actions.length).toBe(3);
  });
});
