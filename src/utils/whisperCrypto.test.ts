import {
  deriveChannelId,
  encryptTextToFelts,
  decryptFeltsToText,
} from "./whisperCrypto";

describe("StarkWhisper Crypto Engine", () => {
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

  test("handles empty string gracefully", () => {
    const emptyMsg = "";
    const ephemeralSecret = 9876543210n;

    const encrypted = encryptTextToFelts(emptyMsg, ephemeralSecret);
    const decrypted = decryptFeltsToText(
      encrypted.c0,
      encrypted.c1,
      encrypted.c2,
      encrypted.c3,
      ephemeralSecret
    );

    expect(decrypted).toEqual("");
  });
});
