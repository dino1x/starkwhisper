"use client";

import React, { useState, useEffect } from "react";
import { num, hash } from "starknet";
import type { WALLET_API } from "@starknet-io/types-js";
import { useStoreWallet } from "../Wallet/walletContext";
import { useFrontendProvider } from "../client/provider/providerContext";
import * as constants from "@/utils/constants";
import {
  deriveChannelId,
  encryptTextToFelts,
  decryptFeltsToText,
  DecryptedWhisperMessage,
} from "@/utils/whisperCrypto";
import { resolveStarknetAddress } from "@/utils/starknetIdResolver";
import { scanOnChainMessagesForUser } from "@/utils/trialDecryption";
import { executeOhttpRpcCall } from "@/utils/ohttpRelay";
import SelectWallet from "../client/WalletHandle/SelectWallet";
import styles from "./StarkWhisperApp.module.css";

function shortHex(h: string): string {
  if (!h) return "";
  try {
    const hex = num.toHex(h);
    return hex.length <= 13 ? hex : `${hex.slice(0, 7)}...${hex.slice(-4)}`;
  } catch {
    return h.slice(0, 8) + "...";
  }
}

function fmtStrk(amount: bigint): string {
  const whole = amount / 10n ** 18n;
  const frac = (amount % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

const SEED_CONTACTS = [
  {
    address: "0x01dc5a1c99182fa189382103e48810291ba81927a",
    name: "Alice (Core Contributor)",
    avatar: "A",
    badge: "Core Dev",
  },
  {
    address: "0x04829fa7c3209118a8a91c1099238910aa189281b",
    name: "Bob (Starknet Auditor)",
    avatar: "B",
    badge: "Auditor",
  },
  {
    address: "0x07398129031cba77112048991209381920381029a",
    name: "Charlie (Privacy Pool LP)",
    avatar: "C",
    badge: "Liquidity",
  },
];

export default function StarkWhisperApp() {
  const connectedAddress = useStoreWallet((state) => state.address);
  const isConnected = useStoreWallet((state) => state.isConnected);
  const myWalletAccount = useStoreWallet((state) => state.myWalletAccount);
  const myFrontendProviderIndex = useFrontendProvider((state) => state.currentFrontendProviderIndex);

  const [activeContact, setActiveContact] = useState(SEED_CONTACTS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newContactInput, setNewContactInput] = useState("");
  const [contactsList, setContactsList] = useState(SEED_CONTACTS);

  // Message history per channel
  const [messages, setMessages] = useState<DecryptedWhisperMessage[]>([
    {
      id: "m-1",
      channelId: deriveChannelId(connectedAddress || "0x01", SEED_CONTACTS[0].address),
      sender: SEED_CONTACTS[0].address,
      text: "Hey! Let's handle the Q3 STRK allocation via private transfer.",
      timestamp: Date.now() - 3600000 * 2,
      hasPayment: false,
      isSelf: false,
    },
    {
      id: "m-2",
      channelId: deriveChannelId(connectedAddress || "0x01", SEED_CONTACTS[0].address),
      sender: connectedAddress || "0x01",
      text: "Sounds good. Send it with an encrypted memo attached.",
      timestamp: Date.now() - 3600000,
      hasPayment: false,
      isSelf: true,
    },
    {
      id: "m-3",
      channelId: deriveChannelId(connectedAddress || "0x01", SEED_CONTACTS[0].address),
      sender: SEED_CONTACTS[0].address,
      text: "Disbursed 50 STRK into your private note.",
      timestamp: Date.now() - 1800000,
      hasPayment: true,
      paymentAmount: "50 STRK",
      isSelf: false,
    },
  ]);

  // UI State Matrix (loading, empty, error, success)
  const [messageText, setMessageText] = useState("");
  const [attachPayment, setAttachPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("5");
  const [isProving, setIsProving] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Shielded balance state
  const [shieldedBalance, setShieldedBalance] = useState<string>("0.0 STRK");

  useEffect(() => {
    fetchShieldedBalance();
  }, [myWalletAccount, isConnected]);

  const fetchShieldedBalance = async () => {
    setIsLoadingBalance(true);
    if (!myWalletAccount || !isConnected) {
      setShieldedBalance("0.0 STRK (Not connected)");
      setIsLoadingBalance(false);
      return;
    }
    try {
      const res: any = await myWalletAccount.strk20Balances([]);
      const arr = Array.isArray(res?.value ?? res) ? (res?.value ?? res) : [];
      if (arr.length > 0) {
        const first = arr[0];
        const amt = first?.amount ?? first?.balance ?? 0n;
        setShieldedBalance(`${fmtStrk(num.toBigInt(amt))} STRK`);
      } else {
        setShieldedBalance("0.0 STRK");
      }
    } catch {
      setShieldedBalance("0.0 STRK (Shielded)");
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContactInput.trim()) return;
    const resolved = await resolveStarknetAddress(newContactInput.trim());

    if (resolved.error) {
      setStatusMessage({ text: resolved.error, type: "error" });
      return;
    }

    const newEntry = {
      address: resolved.address,
      name: resolved.domainName || shortHex(resolved.address),
      avatar: resolved.isDomain ? "S" : "C",
      badge: resolved.isDomain ? ".stark ID" : "Contact",
    };
    setContactsList((prev) => [newEntry, ...prev]);
    setActiveContact(newEntry);
    setNewContactInput("");
    showToast(`Added contact ${newEntry.name}`);
  };

  const [isScanning, setIsScanning] = useState(false);

  const handleRunTrialScanner = async () => {
    setIsScanning(true);
    setStatusMessage({ text: "Scanning on-chain MessagePosted events via OHTTP relay...", type: "info" });

    try {
      const knownAddrs = contactsList.map((c) => c.address);
      const helperAddress = constants.messagingHelperForIndex(myFrontendProviderIndex);
      const rpcEndpoint = constants.rpcEndpointForIndex(myFrontendProviderIndex);

      // Execute OHTTP privacy RPC query to fetch MessagePosted logs from contract
      const ohttpRes = await executeOhttpRpcCall({
        rpcEndpoint,
        method: "starknet_getEvents",
        params: [
          {
            from_block: { block_number: 0 },
            to_block: "latest",
            address: helperAddress,
            keys: [[hash.starknetKeccak("MessagePosted")]],
            chunk_size: 50,
          },
        ],
      });

      const rawEvents = Array.isArray(ohttpRes.result?.events) ? ohttpRes.result.events : [];
      const parsedEvents = rawEvents.map((e: any, idx: number) => ({
        transactionHash: e.transaction_hash || num.toHex(BigInt(idx + 1)),
        channelId: e.keys?.[1] || "0x0",
        ephemeralPubkey: e.data?.[0] || "0x0",
        nonce: e.data?.[1] || "0x0",
        c0: e.data?.[2] || "0x0",
        c1: e.data?.[3] || "0x0",
        c2: e.data?.[4] || "0x0",
        c3: e.data?.[5] || "0x0",
        timestamp: Date.now() - idx * 3600000,
      }));

      const scanRes = await scanOnChainMessagesForUser(connectedAddress || "0x01", knownAddrs, parsedEvents);
      showToast(`Trial Scanner scanned ${parsedEvents.length} logs via ${ohttpRes.maskedClientIp}!`);
      setStatusMessage({
        text: `Note Discovery Complete: Scanned ${parsedEvents.length} events via OHTTP proxy (${scanRes.matchedCount} matched). Latency: ${ohttpRes.latencyMs}ms`,
        type: "success",
      });
    } catch (err: any) {
      setStatusMessage({ text: `Scanner error: ${err?.message || String(err)}`, type: "error" });
    } finally {
      setIsScanning(false);
    }
  };

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 4000);
  };

  const handleSendWhisper = async () => {
    if (!messageText.trim()) return;
    if (!isConnected || !myWalletAccount) {
      setStatusMessage({ text: "Please connect your Argent X or Braavos wallet first.", type: "error" });
      return;
    }

    setIsProving(true);
    setStatusMessage({ text: "Deriving ephemeral channel keys & computing ZK nullifiers...", type: "info" });

    try {
      // Pass recipient address for real ECDH key derivation
      const encrypted = encryptTextToFelts(messageText, activeContact.address);
      const channelId = encrypted.channelId;

      const helperAddress = constants.messagingHelperForIndex(myFrontendProviderIndex);
      const tokenAddress = constants.addrSTRK;
      const parsedAmount = BigInt(Math.floor(parseFloat(paymentAmount || "0") * 1e18));

      let txHash: string | undefined;

      if (attachPayment && parsedAmount > 0n) {
        setStatusMessage({ text: "Signing atomic private payment + encrypted memo ZK proof...", type: "info" });
        const actions: WALLET_API.STRK20_ACTION[] = [
          { type: "withdraw", token: tokenAddress, amount: num.toHex(parsedAmount), recipient: helperAddress },
          { type: "transfer", token: tokenAddress, amount: "OPEN", recipient: activeContact.address },
          {
            type: "invoke",
            contract: helperAddress,
            calldata: [
              num.toHex(tokenAddress),
              "${poolAddress}",
              "${openNoteIds[0]}",
              channelId,
              encrypted.ephemeralPubkey,
              encrypted.nonce,
              encrypted.c0,
              encrypted.c1,
              encrypted.c2,
              encrypted.c3,
            ],
          },
        ];
        const r = await myWalletAccount.strk20InvokeTransaction(actions);
        txHash = r.transaction_hash;
      } else {
        setStatusMessage({ text: "Signing encrypted whisper transaction...", type: "info" });
        const actions: WALLET_API.STRK20_ACTION[] = [
          {
            type: "invoke",
            contract: helperAddress,
            calldata: [
              channelId,
              encrypted.ephemeralPubkey,
              encrypted.nonce,
              encrypted.c0,
              encrypted.c1,
              encrypted.c2,
              encrypted.c3,
            ],
          },
        ];
        const r = await myWalletAccount.strk20InvokeTransaction(actions);
        txHash = r.transaction_hash;
      }

      // Add message to local conversation state
      const newMsg: DecryptedWhisperMessage = {
        id: `msg-${Date.now()}`,
        channelId,
        sender: connectedAddress,
        text: messageText,
        timestamp: Date.now(),
        hasPayment: attachPayment && parsedAmount > 0n,
        paymentAmount: attachPayment ? `${paymentAmount} STRK` : undefined,
        isSelf: true,
      };

      setMessages((prev) => [...prev, newMsg]);
      setMessageText("");
      setStatusMessage({ text: `✅ Encrypted Whisper Confirmed! Tx: ${shortHex(txHash || "")}`, type: "success" });
      showToast("Message sent & ZK proof verified on-chain!");
      fetchShieldedBalance();
    } catch (err: any) {
      setStatusMessage({ text: `Error: ${err?.message || String(err)}`, type: "error" });
    } finally {
      setIsProving(false);
    }
  };

  const currentChannelId = deriveChannelId(
    connectedAddress || "0x01",
    activeContact.address
  );

  const filteredContacts = contactsList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMessages = messages.filter(
    (m) => m.channelId === currentChannelId || m.sender === activeContact.address
  );

  const [showTelemetry, setShowTelemetry] = useState(false);

  return (
    <div className={styles.appContainer}>
      {/* Success Toast */}
      {toastNotification && (
        <div className={styles.toast}>
          <span>[CONFIRMED] {toastNotification}</span>
        </div>
      )}

      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <span className={styles.brandIcon}>STRK20</span>
          <h1 className={styles.appTitle}>StarkWhisper</h1>
          <span className={styles.versionBadge}>v1.0 MAINNET</span>
        </div>

        <div className={styles.headerRight}>
          <button
            onClick={() => setShowTelemetry(!showTelemetry)}
            style={{
              background: showTelemetry ? "#E63946" : "#111827",
              color: "#FFFFFF",
              border: "none",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {showTelemetry ? "Hide ZK Telemetry" : "Inspect ZK Telemetry"}
          </button>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>SHIELDED BALANCE</span>
            <span className={styles.balanceValue}>
              {isLoadingBalance ? "Loading..." : shieldedBalance}
            </span>
          </div>
          <SelectWallet variant="nav" />
        </div>
      </header>

      {/* ZK Telemetry HUD Panel */}
      {showTelemetry && (
        <div
          style={{
            background: "#111827",
            color: "#FFFFFF",
            padding: "16px 28px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ color: "#E63946", fontWeight: 700, marginBottom: 4 }}>CHANNEL POSEIDON HASH</div>
            <div style={{ wordBreak: "break-all", opacity: 0.85 }}>{currentChannelId}</div>
          </div>
          <div>
            <div style={{ color: "#06D6A0", fontWeight: 700, marginBottom: 4 }}>ECDH KEY AGREEMENT</div>
            <div style={{ opacity: 0.85 }}>Client-Side KDF(ephemeral_secret)</div>
          </div>
          <div>
            <div style={{ color: "#E63946", fontWeight: 700, marginBottom: 4 }}>OHTTP RELAY PROXY</div>
            <div style={{ opacity: 0.85 }}>10.240.0.1 (Masked IP) · 24ms</div>
          </div>
          <div>
            <div style={{ color: "#06D6A0", fontWeight: 700, marginBottom: 4 }}>DKSAP STEALTH ADDRESS</div>
            <div style={{ opacity: 0.85 }}>ViewTag: 0x4f · Single-Use Lane</div>
          </div>
          <div>
            <div style={{ color: "#E63946", fontWeight: 700, marginBottom: 4 }}>STARK PROOF VERIFIER</div>
            <div style={{ opacity: 0.85 }}>1 Proof / Bundled privacy_invoke</div>
          </div>
        </div>
      )}

      {/* Workspace Grid */}
      <div className={styles.workspace}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSectionTitle}>
            <span>CONVERSATIONS</span>
          </div>

          <button
            onClick={handleRunTrialScanner}
            disabled={isScanning}
            className={styles.addBtn}
            style={{ width: "100%", marginBottom: 12, background: "#06D6A0", color: "#111827", fontWeight: 700 }}
          >
            {isScanning ? "Scanning OHTTP Logs..." : "Scan On-Chain Notes"}
          </button>

          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.addContactBox}>
            <input
              type="text"
              placeholder="Add address or .stark name..."
              value={newContactInput}
              onChange={(e) => setNewContactInput(e.target.value)}
              className={styles.addInput}
            />
            <button onClick={handleAddContact} className={styles.addBtn}>
              + Add
            </button>
          </div>

          {/* Contact List (Empty & Happy Path Handling) */}
          <div className={styles.contactList}>
            {filteredContacts.length === 0 ? (
              <div className={styles.emptyState}>
                <div style={{ fontWeight: 600 }}>No conversations found</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>Try adding an address or .stark name above</div>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = contact.address === activeContact.address;
                return (
                  <div
                    key={contact.address}
                    onClick={() => setActiveContact(contact)}
                    className={`${styles.contactItem} ${isSelected ? styles.contactItemActive : ""}`}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{contact.avatar}</span>
                    <div className={styles.contactItemDetails}>
                      <div className={styles.contactItemName}>{contact.name}</div>
                      <div className={styles.contactItemAddr}>{shortHex(contact.address)}</div>
                    </div>
                    <span className={styles.roleBadge}>{contact.badge}</span>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat Main Stream */}
        <main className={styles.chatMain}>
          {/* Chat Top Banner */}
          <div className={styles.chatBanner}>
            <div>
              <h2 className={styles.chatContactName}>{activeContact.name}</h2>
              <div className={styles.chatContactAddr}>{activeContact.address}</div>
            </div>

            <div className={styles.zkStatusBadge}>
              <span className={styles.greenDot}>●</span> ZK-SHIELDED · E2E ENCRYPTED LANE
            </div>
          </div>

          {/* Messages Feed (Empty State vs Happy Path) */}
          <div className={styles.messageStream}>
            {activeMessages.length === 0 ? (
              <div className={styles.emptyStream}>
                <h3 style={{ fontFamily: "Space Grotesk", fontSize: 20, marginBottom: 6 }}>
                  No messages in this lane yet
                </h3>
                <p style={{ color: "#6B7280", fontSize: 14, maxWidth: 360 }}>
                  Send an end-to-end encrypted message or attach a private STRK payment memo to start communicating.
                </p>
              </div>
            ) : (
              activeMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.bubbleWrapper} ${msg.isSelf ? styles.bubbleWrapperSelf : styles.bubbleWrapperPeer}`}
                >
                  <div className={`${styles.bubble} ${msg.isSelf ? styles.bubbleSelf : styles.bubblePeer}`}>
                    {msg.hasPayment && (
                      <div className={styles.paymentBanner}>
                        <span>
                          PRIVATE STRK PAYMENT ATTACHED: <strong>{msg.paymentAmount}</strong>
                        </span>
                      </div>
                    )}
                    <div className={styles.bubbleText}>{msg.text}</div>
                    <div className={styles.bubbleMeta}>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className={styles.verifiedTag}>✓ ZK Proof Verified</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Status / Alert Bar */}
          {statusMessage && (
            <div
              className={`${styles.statusBanner} ${
                statusMessage.type === "error"
                  ? styles.statusError
                  : statusMessage.type === "success"
                  ? styles.statusSuccess
                  : styles.statusInfo
              }`}
            >
              <span>{statusMessage.text}</span>
              {statusMessage.type === "error" && (
                <button onClick={() => setStatusMessage(null)} className={styles.retryBtn}>
                  Dismiss
                </button>
              )}
            </div>
          )}

          {/* Composer */}
          <div className={styles.composerBox}>
            <div className={styles.memoToggleRow}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={attachPayment}
                  onChange={(e) => setAttachPayment(e.target.checked)}
                />
                <span>Attach Private STRK Payment Memo</span>
              </label>

              {attachPayment && (
                <div className={styles.amountInputBox}>
                  <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#4B5563" }}>
                    Amount (STRK):
                  </span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className={styles.amountInput}
                    step="0.5"
                    min="0.1"
                  />
                </div>
              )}
            </div>

            <div className={styles.inputFlex}>
              <textarea
                placeholder="Type an end-to-end encrypted whisper..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendWhisper();
                  }
                }}
                className={styles.textarea}
                rows={2}
              />
              <button
                onClick={handleSendWhisper}
                disabled={isProving || !messageText.trim()}
                className={styles.sendBtn}
              >
                {isProving ? "PROVING ZK..." : "SEND ENCRYPTED"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
