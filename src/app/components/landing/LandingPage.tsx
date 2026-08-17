"use client";

import React, { useState } from "react";
import styles from "./LandingPage.module.css";
import { deriveChannelId, encryptTextToFelts } from "@/utils/whisperCrypto";

interface LandingPageProps {
  onLaunchDapp: () => void;
}

export default function LandingPage({ onLaunchDapp }: LandingPageProps) {
  // Demo Simulator State
  const [demoMessage, setDemoMessage] = useState("Disbursing 50 STRK for Q3 allocation");
  const [demoAmount, setDemoAmount] = useState("50");
  const [demoAttachPayment, setDemoAttachPayment] = useState(true);

  // Derived crypto values for live interactive demo
  const sampleRecipient = "0x01dc5a1c99182fa189382103e48810291ba81927a";
  const encryptedPayload = encryptTextToFelts(demoMessage, sampleRecipient);
  const channelId = encryptedPayload.channelId;

  // Feature Tab State
  const [activeTab, setActiveTab] = useState<"ecdh" | "memo" | "privacy">("ecdh");

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Navigation */}
        <nav className={styles.nav}>
          <a href="#" className={styles.brand}>
            <span className={styles.brandIcon}>STRK20</span>
            <span className={styles.brandName}>StarkWhisper</span>
          </a>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#faq" className={styles.navLink}>FAQ</a>
            <button onClick={onLaunchDapp} className={styles.launchBtn}>
              Launch App ↗
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <header className={styles.hero}>
          <div className={styles.pillBadge}>
            <span className={styles.pillDot}></span>
            <span>Built for the STRK20 Starknet Hackathon</span>
          </div>

          <h1 className={styles.heroTitle}>
            Send End-to-End Encrypted Messages & <span className={styles.heroAccent}>Private Money</span> on Starknet
          </h1>

          <p className={styles.heroSub}>
            StarkWhisper derives ephemeral channel keys using ECDH and executes atomic ZK-shielded transfers in a single transaction. Nobody watching the chain sees your messages, balances, or counterparties.
          </p>

          <div className={styles.heroActions}>
            <button onClick={onLaunchDapp} className={styles.ctaPrimary}>
              Launch Interactive dApp
            </button>
            <a
              href="https://github.com/dino1x/starkwhisper"
              target="_blank"
              rel="noreferrer"
              className={styles.ctaSecondary}
            >
              View GitHub Contract ↗
            </a>
          </div>

          <div className={styles.frictionText}>
            ✓ No signup required · Powered by STRK20 Privacy Pool · Zero metadata leakage
          </div>

          {/* Interactive Live Demo Simulator */}
          <div className={styles.demoCard}>
            <div className={styles.demoCardHeader}>
              <div className={styles.demoDots}>
                <span className={`${styles.dot} ${styles.dotRed}`}></span>
                <span className={`${styles.dot} ${styles.dotYellow}`}></span>
                <span className={`${styles.dot} ${styles.dotGreen}`}></span>
              </div>
              <span className={styles.demoTitle}>LIVE CRYPTOGRAPHIC ENCRYPTION SIMULATOR</span>
            </div>

            <div className={styles.demoGrid}>
              {/* Input Column */}
              <div className={styles.demoInputGroup}>
                <div>
                  <label className={styles.fieldLabel}>Recipient Address:</label>
                  <input
                    type="text"
                    readOnly
                    value={sampleRecipient}
                    className={styles.textInput}
                    style={{ width: "100%", fontSize: 12, fontFamily: "JetBrains Mono" }}
                  />
                </div>

                <div>
                  <label className={styles.fieldLabel}>Encrypted Message Payload:</label>
                  <textarea
                    rows={3}
                    value={demoMessage}
                    onChange={(e) => setDemoMessage(e.target.value)}
                    className={styles.textInput}
                    style={{ width: "100%" }}
                  />
                </div>

                <div className={styles.memoRow}>
                  <input
                    type="checkbox"
                    id="memoCheck"
                    checked={demoAttachPayment}
                    onChange={(e) => setDemoAttachPayment(e.target.checked)}
                  />
                  <label htmlFor="memoCheck" style={{ cursor: "pointer" }}>
                    Attach Private STRK Payment Memo ({demoAmount} STRK)
                  </label>
                </div>
              </div>

              {/* Encrypted Output Column */}
              <div className={styles.demoOutput}>
                <div className={styles.outputHeader}>
                  <span>ON-CHAIN CIPHERTEXT (CALLEDDATA FELT PACKING)</span>
                </div>

                <div>
                  <span className={styles.outputLabel}>Channel ID (Poseidon Hash):</span>
                  <span>{channelId}</span>
                </div>

                <div>
                  <span className={styles.outputLabel}>Ephemeral PubKey & Nonce:</span>
                  <span>{encryptedPayload.ephemeralPubkey.slice(0, 16)}... | {encryptedPayload.nonce.slice(0, 16)}...</span>
                </div>

                <div>
                  <span className={styles.outputLabel}>Ciphertext Felts [c0, c1, c2, c3]:</span>
                  <span>[{encryptedPayload.c0.slice(0, 10)}..., {encryptedPayload.c1.slice(0, 10)}...]</span>
                </div>

                {demoAttachPayment && (
                  <div className={styles.proofBadge}>
                    ✓ Atomic STRK Note Spend ({demoAmount} STRK) + Message Memo Bundled
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Social Proof Bar */}
        <section className={styles.proofSection}>
          <div className={styles.proofTitle}>POWERED BY STARKNET & STRK20 INFRASTRUCTURE</div>
          <div className={styles.proofLogos}>
            <div className={styles.logoItem}>Starknet Mainnet</div>
            <div className={styles.logoItem}>STRK20 Pool</div>
            <div className={styles.logoItem}>ECDH Key Agreement</div>
            <div className={styles.logoItem}>Argent X & Braavos</div>
          </div>
        </section>

        {/* Problem Section (PAS Framework) */}
        <section className={styles.problemSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>THE PRIVACY GAP ON PUBLIC LEADS</span>
            <h2 className={styles.sectionTitle}>Public Blockchains Expose Everything You Do</h2>
            <p className={styles.heroSub}>
              Standard dApps broadcast your addresses, balances, invoice details, and counterparties to every observer, bot, and competitor.
            </p>
          </div>

          <div className={styles.problemGrid}>
            <div className={styles.problemCard}>
              <h3 className={styles.cardTitle}>Public Balance Exposure</h3>
              <p className={styles.cardText}>
                Every time you pay someone from a public address, they can inspect your entire wallet history and total net worth on block explorers.
              </p>
            </div>

            <div className={styles.problemCard}>
              <h3 className={styles.cardTitle}>Transparent Payment Memos</h3>
              <p className={styles.cardText}>
                Invoice notes, contract negotiations, and business details attached to transactions remain permanently readable by anyone.
              </p>
            </div>

            <div className={styles.problemCard}>
              <h3 className={styles.cardTitle}>Counterparty Tracking</h3>
              <p className={styles.cardText}>
                Interactions create permanent public linkability between your identity and everyone you communicate or trade with.
              </p>
            </div>
          </div>
        </section>

        {/* Solution / Interactive Feature Tabs */}
        <section id="features" className={styles.featureSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>HOW STARKWHISPER FIXES THIS</span>
            <h2 className={styles.sectionTitle}>Zero-Knowledge Privacy Designed for Everyday Use</h2>
          </div>

          <div className={styles.tabList}>
            <button
              onClick={() => setActiveTab("ecdh")}
              className={`${styles.tabBtn} ${activeTab === "ecdh" ? styles.tabBtnActive : ""}`}
            >
              1. ECDH Key Agreement
            </button>
            <button
              onClick={() => setActiveTab("memo")}
              className={`${styles.tabBtn} ${activeTab === "memo" ? styles.tabBtnActive : ""}`}
            >
              2. Atomic Payment Memos
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`${styles.tabBtn} ${activeTab === "privacy" ? styles.tabBtnActive : ""}`}
            >
              3. Metadata-Resistant Storage
            </button>
          </div>

          <div className={styles.featureBox}>
            {activeTab === "ecdh" && (
              <>
                <div className={styles.featureContent}>
                  <h3 className={styles.featureTitle}>Client-Side ECDH Shared Secret Derivation</h3>
                  <p className={styles.featureText}>
                    StarkWhisper uses the recipient's public viewing key and an ephemeral keypair to derive a shared secret client-side. The message is encrypted before leaving your browser.
                  </p>
                  <div className={styles.featureCheckList}>
                    <div className={styles.checkItem}><span className={styles.checkIcon}>✓</span> Zero private key exposure to dApp or indexer</div>
                    <div className={styles.checkItem}><span className={styles.checkIcon}>✓</span> Fast client-side trial decryption</div>
                    <div className={styles.checkItem}><span className={styles.checkIcon}>✓</span> Continuous forward secrecy per ephemeral key</div>
                  </div>
                </div>
                <div className={styles.featureGraphic}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#111827" }}>
                    <div style={{ color: "#E63946", fontWeight: 700, marginBottom: 8 }}>ECDH KEY DERIVATION</div>
                    <div>S = sk_ephemeral × P_recipient</div>
                    <div>Key = KDF(S, channel_id)</div>
                    <div style={{ marginTop: 12, color: "#06D6A0" }}>✓ Ciphertext = Encrypt(Payload, Key)</div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "memo" && (
              <>
                <div className={styles.featureContent}>
                  <h3 className={styles.featureTitle}>Atomic Private Token Transfer + Encrypted Memo</h3>
                  <p className={styles.featureText}>
                    Attach private STRK token transfers to an encrypted message. The note spend and message posting execute inside the same `privacy_invoke` ZK transaction.
                  </p>
                  <div className={styles.featureCheckList}>
                    <div className={styles.checkItem}><span className={styles.checkIcon}>✓</span> Atomic execution: note spend + message memo</div>
                    <div className={styles.checkItem}><span className={styles.checkIcon}>✓</span> Recipient decrypts memo upon claiming private note</div>
                    <div className={styles.checkItem}><span className={styles.checkIcon}>✓</span> Single ZK proof fee for both payment & chat</div>
                  </div>
                </div>
                <div className={styles.featureGraphic}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#111827" }}>
                    <div style={{ color: "#E63946", fontWeight: 700, marginBottom: 8 }}>ATOMIC PRIVACY_INVOKE</div>
                    <div>Action[0]: Withdraw(50 STRK) → Anonymizer</div>
                    <div>Action[1]: OpenNote(50 STRK) → Recipient</div>
                    <div>Action[2]: Invoke(MessagingAnonymizer, Memo)</div>
                    <div style={{ marginTop: 12, color: "#06D6A0" }}>✓ Bundled into 1 STARK Proof</div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "privacy" && (
              <>
                <div className={styles.featureContent}>
                  <h3 className={styles.featureTitle}>On-Chain Anonymizer Contract Storage</h3>
                  <p className={styles.featureText}>
                    Messages are posted to the `MessagingAnonymizer.cairo` contract via `InvokeExternal`. On-chain observers see pool activity, but cannot connect sender, recipient, or text.
                  </p>
                  <div className={styles.featureCheckList}>
                    <div className={styles.checkItem}><span className={styles.checkIcon}>✓</span> No central servers or messaging backends</div>
                    <div className={styles.checkItem}><span className={styles.checkIcon}>✓</span> Oblivious HTTP (OHTTP) query privacy</div>
                    <div className={styles.checkItem}><span className={styles.checkIcon}>✓</span> Permanent decentralized availability</div>
                  </div>
                </div>
                <div className={styles.featureGraphic}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#111827" }}>
                    <div style={{ color: "#E63946", fontWeight: 700, marginBottom: 8 }}>METADATA MASKING</div>
                    <div>Sender: [ Shielded by Nullifier ]</div>
                    <div>Recipient: [ Concealed Lane ]</div>
                    <div>Payload: [ Encrypted Felts ]</div>
                    <div style={{ marginTop: 12, color: "#06D6A0" }}>✓ Zero Public Footprint</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className={styles.faqSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>FREQUENTLY ASKED QUESTIONS</span>
            <h2 className={styles.sectionTitle}>Everything You Need to Know</h2>
          </div>

          <div className={styles.faqGrid}>
            {[
              {
                q: "Does StarkWhisper store my private keys or messages on a central server?",
                a: "No. All encryption keys are derived client-side using ECDH key agreement. Messages are encrypted in your browser before being posted on-chain.",
              },
              {
                q: "Can someone watching the Starknet block explorer see who I sent a message to?",
                a: "No. Sender identity is shielded by the STRK20 Privacy Pool's ZK nullifiers, and recipient addresses are derived into opaque channel IDs.",
              },
              {
                q: "Do I need a new wallet to use StarkWhisper?",
                a: "No. StarkWhisper integrates directly with existing Starknet wallets like Argent X and Braavos using starknet.js v10.4.0.",
              },
              {
                q: "How do private payment memos work?",
                a: "When you send a message with an attached payment, both the private token transfer and the encrypted message payload are executed inside a single atomic ZK transaction.",
              },
            ].map((item, idx) => (
              <div key={idx} className={styles.faqItem} onClick={() => toggleFaq(idx)}>
                <div className={styles.faqQuestion}>
                  <span>{item.q}</span>
                  <span>{openFaq === idx ? "−" : "+"}</span>
                </div>
                {openFaq === idx && <div className={styles.faqAnswer}>{item.a}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Final Call to Action Banner */}
        <section className={styles.ctaBanner}>
          <h2 className={styles.bannerTitle}>Ready to Communicate in Complete Privacy?</h2>
          <p className={styles.bannerSub}>
            Experience metadata-resistant messaging and private payment memos on Starknet mainnet today.
          </p>
          <button onClick={onLaunchDapp} className={styles.ctaPrimary} style={{ fontSize: 18, padding: "18px 40px" }}>
            Launch StarkWhisper dApp
          </button>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div>© 2026 StarkWhisper · Built for the STRK20 Hackathon</div>
          <div className={styles.footerLinks}>
            <a href="https://github.com/dino1x/starkwhisper" target="_blank" rel="noreferrer" className={styles.footerLink}>
              GitHub
            </a>
            <a href="https://strk20.starknet.io/hackathon" target="_blank" rel="noreferrer" className={styles.footerLink}>
              Hackathon Hub
            </a>
            <a href="https://strk20-by-example.org" target="_blank" rel="noreferrer" className={styles.footerLink}>
              STRK20 Docs
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
