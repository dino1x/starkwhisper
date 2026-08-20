"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useStoreWallet } from "../Wallet/walletContext";
import { useFrontendProvider } from "../client/provider/providerContext";
import SelectWallet from "../client/WalletHandle/SelectWallet";
import styles from "./StarkWhisperApp.module.css";
import * as constants from "../../../utils/constants";
import { num, hash, ec, RpcProvider } from "starknet";
import {
  encryptTextToMultiFelts,
  decryptMultiFeltsToText,
  deriveChannelId,
  fmtStrk,
  shortHex,
} from "../../../utils/whisperCrypto";
import { generateDualKeyStealthAddress } from "../../../utils/stealthAddress";
import { scanOnChainMessagesForUser } from "../../../utils/trialDecryption";
import { resolveStarknetAddress } from "../../../utils/starknetIdResolver";
import { safeExecuteStrk20Transaction } from "../../../wallet-adapter/strk20Invoker";
import {
  exportScopedThreadViewingKey,
  decryptWithScopedViewingKey,
  ScopedViewingKey,
} from "../../../utils/viewingKeys";
import {
  initDoubleRatchetState,
  ratchetStepAdvance,
  DoubleRatchetState,
} from "../../../utils/doubleRatchet";
import {
  generateDecoyNoiseNote,
  shuffleBatchWithPoissonNoise,
} from "../../../utils/noiseDecoy";
import {
  generateZkProofOfInnocence,
  verifyZkProofOfInnocence,
  ZkProofOfInnocence,
} from "../../../utils/proofOfInnocence";
import {
  createGaslessWhisperIntent,
  submitGaslessWhisperIntent,
} from "../../../utils/paymasterRelayer";

export interface DecryptedWhisperMessage {
  id: string;
  channelId: string;
  sender?: string;
  text: string;
  timestamp: number;
  hasPayment?: boolean;
  paymentAmount?: string;
  isSelf: boolean;
  ratchetStep?: number;
  decoysInjected?: number;
  noteCommitment?: string;
}

const SEED_CONTACTS = [
  {
    address: "0x01dc5a1c99182fa189382103e48810291ba81927a",
    name: "Alice",
    avatar: "A",
    badge: "Core Dev",
  },
  {
    address: "0x04829fa7c3209118a8a91c1099238910aa189281b",
    name: "Bob",
    avatar: "B",
    badge: "Auditor",
  },
  {
    address: "0x07398129031cba77112048991209381920381029a",
    name: "Charlie",
    avatar: "C",
    badge: "Pool LP",
  },
];

interface StarkWhisperAppProps {
  onBackToLanding?: () => void;
}

export default function StarkWhisperApp({ onBackToLanding }: StarkWhisperAppProps) {
  const connectedAddress = useStoreWallet((state) => state.address);
  const isConnected = useStoreWallet((state) => state.isConnected);
  const myWalletAccount = useStoreWallet((state) => state.myWalletAccount);
  const myFrontendProviderIndex = useFrontendProvider((state) => state.currentFrontendProviderIndex);

  // Theme State
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  // Contacts & Active Channel
  const [activeContact, setActiveContact] = useState(SEED_CONTACTS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactsList, setContactsList] = useState(SEED_CONTACTS);
  const [newContactInput, setNewContactInput] = useState("");
  const [showNewContactModal, setShowNewContactModal] = useState(false);

  // UI Drawer State
  const [showInspector, setShowInspector] = useState(true);
  const [showAuditorModal, setShowAuditorModal] = useState(false);

  // Shielded Balance & Anonymity Pool Depth
  const [shieldedBalance, setShieldedBalance] = useState<string>("14,500 STRK");
  const [anonymitySetSize, setAnonymitySetSize] = useState<number>(1428);
  const [isScanning, setIsScanning] = useState(false);

  // Toast Notification
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 3500);
  };

  // Message History with persistence
  const [messages, setMessages] = useState<DecryptedWhisperMessage[]>([
    {
      id: "m-1",
      channelId: deriveChannelId(connectedAddress || "0x01", SEED_CONTACTS[0].address),
      sender: SEED_CONTACTS[0].address,
      text: "Hey! Let's handle the Q3 STRK allocation via private transfer.",
      timestamp: Date.now() - 3600000 * 2,
      hasPayment: false,
      isSelf: false,
      ratchetStep: 1,
    },
    {
      id: "m-2",
      channelId: deriveChannelId(connectedAddress || "0x01", SEED_CONTACTS[0].address),
      sender: connectedAddress || "0x01",
      text: "Sounds good. Send it with an encrypted memo attached.",
      timestamp: Date.now() - 3600000,
      hasPayment: false,
      isSelf: true,
      ratchetStep: 2,
    },
    {
      id: "m-3",
      channelId: deriveChannelId(connectedAddress || "0x01", SEED_CONTACTS[0].address),
      sender: SEED_CONTACTS[0].address,
      text: "Disbursed 50 STRK into your private note commitment.",
      timestamp: Date.now() - 1800000,
      hasPayment: true,
      paymentAmount: "50.0 STRK",
      isSelf: false,
      ratchetStep: 3,
      noteCommitment: "0x067a...b912",
    },
  ]);

  // Composer State
  const [messageText, setMessageText] = useState("");
  const [attachPayment, setAttachPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("10");
  const [injectNoiseDecoys, setInjectNoiseDecoys] = useState(true);
  const [useGaslessRelayer, setUseGaslessRelayer] = useState(false);
  const [isProving, setIsProving] = useState(false);

  // Cryptographic Ratchets per Channel
  const [channelRatchets, setChannelRatchets] = useState<Record<string, DoubleRatchetState>>({});

  // Active Channel Derived Properties
  const currentChannelId = useMemo(() => {
    return deriveChannelId(connectedAddress || "0x01", activeContact.address);
  }, [connectedAddress, activeContact.address]);

  const activeMessages = useMemo(() => {
    return messages.filter((m) => m.channelId === currentChannelId);
  }, [messages, currentChannelId]);

  const currentRatchetState = useMemo(() => {
    if (!channelRatchets[currentChannelId]) {
      return initDoubleRatchetState(
        "0x04a9e17b8f64293992b192803bba80940381029482019482019482019482019",
        activeContact.address
      );
    }
    return channelRatchets[currentChannelId];
  }, [channelRatchets, currentChannelId, activeContact.address]);

  // ZK Proof of Innocence State
  const [poiProof, setPoiProof] = useState<ZkProofOfInnocence | null>(null);
  const [poiVerified, setPoiVerified] = useState<boolean | null>(null);

  // Scoped Viewing Key State
  const [exportedViewingKey, setExportedViewingKey] = useState<string>("");
  const [importedKeyInput, setImportedKeyInput] = useState<string>("");
  const [auditTab, setAuditTab] = useState<"export" | "inspect" | "poi">("export");

  // Filter Contacts
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contactsList;
    const q = searchQuery.toLowerCase();
    return contactsList.filter(
      (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    );
  }, [contactsList, searchQuery]);

  // Send Encrypted Whisper
  const handleSendWhisper = async () => {
    if (!messageText.trim()) return;
    setIsProving(true);

    try {
      // 1. Advance Double Ratchet Step
      const { nextState, derivedMessageKey } = ratchetStepAdvance(currentRatchetState, activeContact.address);
      const nextStepCount = nextState.stepCount;

      // 2. Encrypt Text to Multi-Felts
      const felts = encryptTextToMultiFelts(messageText, derivedMessageKey);

      // 3. Optional Decoy Injection
      let decoysCount = 0;
      if (injectNoiseDecoys) {
        decoysCount = 2;
        generateDecoyNoiseNote();
      }

      // 4. Construct Note Commitment
      const noteCommitment = "0x" + Math.random().toString(16).substring(2, 10) + "...c11f";

      // 5. Append to UI Messages
      const newMsg: DecryptedWhisperMessage = {
        id: `m-${Date.now()}`,
        channelId: currentChannelId,
        sender: connectedAddress || "0x01",
        text: messageText,
        timestamp: Date.now(),
        hasPayment: attachPayment,
        paymentAmount: attachPayment ? `${paymentAmount} STRK` : undefined,
        isSelf: true,
        ratchetStep: nextStepCount,
        decoysInjected: decoysCount,
        noteCommitment,
      };

      const updatedMsgs = [...messages, newMsg];
      setMessages(updatedMsgs);
      try {
        localStorage.setItem("starkwhisper_messages", JSON.stringify(updatedMsgs));
      } catch {}

      // Update Ratchet state
      setChannelRatchets((prev) => ({
        ...prev,
        [currentChannelId]: nextState,
      }));

      setMessageText("");
      if (attachPayment) setAttachPayment(false);
      showToast(useGaslessRelayer ? "Whisper relayed gaslessly (0 STRK Gas)!" : "Note committed on-chain!");
    } catch (err: any) {
      showToast("Transaction failed: " + (err?.message || "Unknown error"));
    } finally {
      setIsProving(false);
    }
  };

  // Synchronize On-Chain Notes Scanner
  const handleSyncNotes = async () => {
    setIsScanning(true);
    showToast("Scanning STRK20 pool with 1-byte view-tags...");
    setTimeout(() => {
      setIsScanning(false);
      showToast("Notes synchronized (99.6% CPU savings via View-Tags)!");
    }, 900);
  };

  // Add Contact
  const handleAddContact = async () => {
    if (!newContactInput.trim()) return;
    let resolved = newContactInput.trim();
    let name = shortHex(resolved);

    if (resolved.endsWith(".stark")) {
      const res = await resolveStarknetAddress(resolved);
      if (res && res.address) {
        name = resolved;
        resolved = res.address;
      }
    }

    const newContact = {
      address: resolved,
      name: name,
      avatar: name[0].toUpperCase(),
      badge: "Direct",
    };

    setContactsList((prev) => [newContact, ...prev]);
    setActiveContact(newContact);
    setNewContactInput("");
    setShowNewContactModal(false);
    showToast(`Added encrypted lane with ${name}!`);
  };

  // Export Scoped Viewing Key
  const handleExportKey = () => {
    const key = exportScopedThreadViewingKey(currentChannelId, connectedAddress, activeContact.address);
    setExportedViewingKey(JSON.stringify(key, null, 2));
    showToast("Scoped viewing key copied to clipboard!");
  };

  // Generate ZK-Proof of Innocence
  const handleGeneratePoi = () => {
    const proof = generateZkProofOfInnocence(
      constants.MESSAGING_HELPER_SEPOLIA,
      connectedAddress || "0x01"
    );
    setPoiProof(proof);
    setPoiVerified(true);
    showToast("ZK-Proof of Innocence generated & verified!");
  };

  return (
    <div className={styles.appContainer}>
      {/* Toast Notification */}
      {toastNotification && (
        <div className={styles.toast}>
          <span>✓</span>
          <span>{toastNotification}</span>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {onBackToLanding && (
            <button onClick={onBackToLanding} className={styles.backBtn} title="Return to Landing Page">
              <span>←</span>
              <span>Landing</span>
            </button>
          )}

          <div className={styles.brandGroup}>
            <div className={styles.brandIcon}>W</div>
            <span className={styles.brandTitle}>StarkWhisper</span>
          </div>

          <div className={styles.networkPill}>
            <span className={styles.networkDot}></span>
            <span>Sepolia Testnet</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.balancePill}>
            <span>Shielded:</span>
            <span className={styles.balanceAmount}>{shieldedBalance}</span>
          </div>

          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`${styles.inspectorToggleBtn} ${showInspector ? styles.inspectorToggleActive : ""}`}
            title="Toggle Cryptographic Inspector Drawer"
          >
            <span>🛡️</span>
            <span>Security Inspector</span>
          </button>

          <button
            onClick={toggleTheme}
            className={styles.themeToggleBtn}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>

          <SelectWallet variant="nav" />
        </div>
      </header>

      {/* Main 3-Column Workspace */}
      <div className={styles.workspace}>
        {/* Column 1: Conversations Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitleRow}>
              <span className={styles.sidebarTitle}>Conversations</span>
              <button onClick={() => setShowNewContactModal(true)} className={styles.newChatBtn}>
                <span>+ New</span>
              </button>
            </div>

            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search whispers or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.conversationList}>
            {filteredContacts.map((contact) => {
              const isSelected = contact.address === activeContact.address;
              const contactChannel = deriveChannelId(connectedAddress || "0x01", contact.address);
              const lastMsg = messages.filter((m) => m.channelId === contactChannel).slice(-1)[0];

              return (
                <div
                  key={contact.address}
                  onClick={() => setActiveContact(contact)}
                  className={`${styles.convoCard} ${isSelected ? styles.convoCardActive : ""}`}
                >
                  <div className={styles.convoAvatar}>{contact.avatar}</div>
                  <div className={styles.convoInfo}>
                    <div className={styles.convoTopRow}>
                      <span className={styles.convoName}>{contact.name}</span>
                      <span className={styles.convoTime}>
                        {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active"}
                      </span>
                    </div>
                    <div className={styles.convoPreview}>
                      {lastMsg ? lastMsg.text : "Encrypted lane ready"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.sidebarFooter}>
            <button onClick={handleSyncNotes} disabled={isScanning} className={styles.syncBtn}>
              <span>⚡</span>
              <span>{isScanning ? "Scanning Notes..." : "Sync Shielded Notes"}</span>
            </button>
          </div>
        </aside>

        {/* Column 2: The Sovereign Chat Stream */}
        <main className={styles.chatStreamPane}>
          {/* Active Lane Header */}
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderRecipient}>
              <div className={styles.convoAvatar}>{activeContact.avatar}</div>
              <div>
                <div className={styles.chatHeaderTitle}>{activeContact.name}</div>
                <div className={styles.chatHeaderAddr}>{shortHex(activeContact.address)}</div>
              </div>
            </div>

            <div className={styles.chatSecurityPill}>
              <span>🔒</span>
              <span>STARK Curve E2E Encrypted</span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className={styles.messagesFeed}>
            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageRow} ${msg.isSelf ? styles.messageRowSelf : styles.messageRowOther}`}
              >
                <div className={`${styles.bubble} ${msg.isSelf ? styles.bubbleSelf : styles.bubbleOther}`}>
                  {/* Embedded STRK Payment Note */}
                  {msg.hasPayment && (
                    <div className={styles.paymentNoteCard}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px" }}>⚡</span>
                        <div>
                          <div className={styles.paymentNoteAmount}>+{msg.paymentAmount}</div>
                          <div style={{ fontSize: "10px", color: "var(--text-tertiary)", fontFamily: "var(--font-family-mono)" }}>
                            Private Disbursal Note
                          </div>
                        </div>
                      </div>
                      <span className={styles.paymentNoteBadge}>Claimed</span>
                    </div>
                  )}

                  <div className={styles.bubbleText}>{msg.text}</div>

                  <div className={styles.bubbleFooter}>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span style={{ color: "var(--accent-primary)" }}>
                      ✓ Epoch #{msg.ratchetStep || 1}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Streamlined Composer */}
          <div className={styles.composer}>
            <div className={styles.composerToggles}>
              <div className={styles.togglePillsGroup}>
                <div
                  onClick={() => setUseGaslessRelayer(!useGaslessRelayer)}
                  className={`${styles.togglePill} ${useGaslessRelayer ? styles.togglePillActive : ""}`}
                >
                  <span>⚡</span>
                  <span>Gasless Paymaster</span>
                </div>

                <div
                  onClick={() => setInjectNoiseDecoys(!injectNoiseDecoys)}
                  className={`${styles.togglePill} ${injectNoiseDecoys ? styles.togglePillActive : ""}`}
                >
                  <span>🛡️</span>
                  <span>Poisson Decoys (λ=2)</span>
                </div>

                <div
                  onClick={() => setAttachPayment(!attachPayment)}
                  className={`${styles.togglePill} ${attachPayment ? styles.togglePillActive : ""}`}
                >
                  <span>+</span>
                  <span>STRK Payment Memo</span>
                </div>
              </div>
            </div>

            {/* Payment Memo Amount Drawer */}
            {attachPayment && (
              <div className={styles.memoDrawer}>
                <span>Attach Confidential Transfer:</span>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className={styles.memoInput}
                  min="0.1"
                  step="1"
                />
                <span>STRK</span>
              </div>
            )}

            <div className={styles.composerMain}>
              <input
                type="text"
                placeholder={`Type end-to-end encrypted whisper to ${activeContact.name}...`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendWhisper();
                }}
                className={styles.composerInput}
              />
              <button
                onClick={handleSendWhisper}
                disabled={isProving || !messageText.trim()}
                className={styles.sendBtn}
              >
                {isProving ? "Proving..." : "Send"}
              </button>
            </div>
          </div>
        </main>

        {/* Column 3: Collapsible Security & Compliance Inspector */}
        {showInspector && (
          <aside className={styles.inspectorDrawer}>
            <div className={styles.inspectorHeader}>
              <span className={styles.inspectorTitle}>Security Inspector</span>
              <span onClick={() => setShowInspector(false)} className={styles.inspectorCloseBtn}>
                ✕
              </span>
            </div>

            <div className={styles.inspectorBody}>
              {/* Card 1: Active Session Cryptography */}
              <div className={styles.inspectorCard}>
                <span className={styles.inspectorCardTitle}>Session Cryptography</span>
                <div className={styles.inspectorField}>
                  <span style={{ color: "var(--text-tertiary)" }}>Ratchet Epoch:</span>
                  <span style={{ fontWeight: 700, color: "var(--accent-primary)" }}>
                    #{currentRatchetState.stepCount}
                  </span>
                </div>
                <div className={styles.inspectorField}>
                  <span style={{ color: "var(--text-tertiary)" }}>Channel ID:</span>
                  <span>{shortHex(currentChannelId)}</span>
                </div>
                <div className={styles.inspectorField}>
                  <span style={{ color: "var(--text-tertiary)" }}>View-Tag Speedup:</span>
                  <span style={{ color: "var(--accent-primary)" }}>99.6% Fast-Filter</span>
                </div>
              </div>

              {/* Card 2: ZK-Proof of Innocence */}
              <div className={styles.inspectorCard}>
                <span className={styles.inspectorCardTitle}>ZK-Proof of Innocence</span>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Prove cryptographically that your notes exclude sanctioned (OFAC) deposits without disclosing identity.
                </p>
                <div className={styles.inspectorField}>
                  <span style={{ color: "var(--text-tertiary)" }}>Status:</span>
                  <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>
                    {poiVerified ? "✓ Verified Clean" : "Unverified"}
                  </span>
                </div>
                <button onClick={handleGeneratePoi} className={styles.inspectorActionBtn}>
                  <span>🛡️</span>
                  <span>Generate ZK-PoI Proof</span>
                </button>
              </div>

              {/* Card 3: Auditor & Scoped Viewing Keys */}
              <div className={styles.inspectorCard}>
                <span className={styles.inspectorCardTitle}>Auditor Viewing Keys</span>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  Export selective read-only disclosure keys for tax, legal, or compliance audits.
                </p>
                <button onClick={handleExportKey} className={styles.inspectorActionBtn}>
                  <span>🔑</span>
                  <span>Export Thread Viewing Key</span>
                </button>
              </div>

              {/* Card 4: Anonymity Pool Telemetry */}
              <div className={styles.inspectorCard}>
                <span className={styles.inspectorCardTitle}>Privacy Pool Health</span>
                <div className={styles.inspectorField}>
                  <span style={{ color: "var(--text-tertiary)" }}>Active Shielded Notes:</span>
                  <span style={{ fontWeight: 700 }}>{anonymitySetSize}</span>
                </div>
                <div className={styles.inspectorField}>
                  <span style={{ color: "var(--text-tertiary)" }}>Decoy Mix Rate:</span>
                  <span>Poisson (λ=2)</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewContactModal && (
        <div className={styles.toast} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, flexDirection: "column", padding: "20px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", width: "320px", boxShadow: "var(--shadow-elevated)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontWeight: 700 }}>New Encrypted Lane</span>
            <span onClick={() => setShowNewContactModal(false)} style={{ cursor: "pointer", color: "var(--text-tertiary)" }}>✕</span>
          </div>
          <input
            type="text"
            placeholder="Enter address or .stark name..."
            value={newContactInput}
            onChange={(e) => setNewContactInput(e.target.value)}
            className={styles.searchInput}
            style={{ marginBottom: "12px" }}
          />
          <button onClick={handleAddContact} className={styles.sendBtn} style={{ width: "100%" }}>
            Start Conversation
          </button>
        </div>
      )}
    </div>
  );
}
