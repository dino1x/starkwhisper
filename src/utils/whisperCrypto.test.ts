import {
  deriveChannelId,
  encryptTextToFelts,
  decryptFeltsToText,
  encryptTextToMultiFelts,
  decryptMultiFeltsToText,
} from "./whisperCrypto";
import { resolveStarknetAddress } from "./starknetIdResolver";
import { scanOnChainMessagesForUser } from "./trialDecryption";
import { generateStealthAddress, checkStealthAddressOwnership } from "./stealthAddress";
import { calculateBundledGasSavings } from "./gasOptimizer";
import { encryptTimelockMessage, decryptTimelockMessage } from "./timelockCrypto";
import { applyUniformCiphertextPadding, stripUniformCiphertextPadding } from "./paddingNoise";
import { auditAnonymizerContract } from "./proofAudit";

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

  test("encryptTextToFelts and decryptFeltsToText roundtrip", () => {
    const secretMessage = "Private transfer 50 STRK for Q3 allocation";
    const ephemeralSecret = 123456789012345n;

    const encrypted = encryptTextToFelts(secretMessage, ephemeralSecret);

    expect(encrypted.nonce).toBeDefined();
    expect(encrypted.ephemeralPubkey).toBeDefined();
    expect(encrypted.c0.startsWith("0x")).toBe(true);

    const decrypted = decryptFeltsToText(
      encrypted.c0,
      encrypted.c1,
      encrypted.c2,
      encrypted.c3,
      ephemeralSecret
    );

    expect(decrypted).toEqual(secretMessage);
  });

  test("multi-felt stream cipher handles arbitrary length notes", () => {
    const longMessage = "A".repeat(300); // 300 bytes payload
    const ephemeralSecret = 999888777n;

    const enc = encryptTextToMultiFelts(longMessage, ephemeralSecret);
    expect(enc.felts.length).toBeGreaterThan(4);

    const dec = decryptMultiFeltsToText(enc.felts, ephemeralSecret);
    expect(dec).toEqual(longMessage);
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
    const sampleChannel = deriveChannelId(aliceAddr, bobAddr);
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

    const scanRes = await scanOnChainMessagesForUser(aliceAddr, [bobAddr], events);
    expect(scanRes.scannedCount).toBe(1);
    expect(scanRes.matchedCount).toBe(1);
  });

  test("DKSAP stealth address generation and ownership verification", () => {
    const secret = 888777666n;
    const stealth = generateStealthAddress(aliceAddr, bobAddr, secret);

    expect(stealth.stealthAddress.startsWith("0x")).toBe(true);
    expect(stealth.viewTag).toBeDefined();

    const isMine = checkStealthAddressOwnership(
      stealth.stealthAddress,
      stealth.ephemeralPubKey,
      stealth.viewTag,
      aliceAddr,
      secret
    );

    expect(isMine).toBe(true);
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
});
