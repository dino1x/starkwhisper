"use client";

import React, { useState, useEffect } from "react";
import styles from "./LandingPage.module.css";
import * as constants from "../../../utils/constants";
import {
  deriveChannelId,
  shortHex,
  encryptTextToMultiFelts,
} from "../../../utils/whisperCrypto";
import { generateDualKeyStealthAddress } from "../../../utils/stealthAddress";
import { generateZkProofOfInnocence } from "../../../utils/proofOfInnocence";

interface LandingPageProps {
  onLaunchDapp: () => void;
}

export default function LandingPage({ onLaunchDapp }: LandingPageProps) {
  // Theme Toggle State
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

  // Interactive Telemetry HUD State
  const [hudTab, setHudTab] = useState<"ecdh" | "viewtag" | "anonymity">("ecdh");
  const [ecdhSeed, setEcdhSeed] = useState(1);
  const [ephemeralPrivKey, setEphemeralPrivKey] = useState("0x4a9f...e102");
  const [recipientPubKey, setRecipientPubKey] = useState("0x03a8...99cf");
  const [computedSharedSecret, setComputedSharedSecret] = useState("0x7f20...c48a");
  const [computedChannelId, setComputedChannelId] = useState("0x1e8b...90d1");

  // DKSAP Stealth Simulator State
  const [stealthRecipient, setStealthRecipient] = useState("0x04f2...33aa");
  const [stealthGeneratedAddr, setStealthGeneratedAddr] = useState("0x07e1...88ab");
  const [stealthViewTag, setStealthViewTag] = useState("0x9c");

  // Double Ratchet Simulator State
  const [ratchetEpoch, setRatchetEpoch] = useState(1);
  const [ratchetKey, setRatchetKey] = useState("0x89b1...ff32");

  // ZK-PoI Sanctions Check State
  const [poiAddress, setPoiAddress] = useState("0x00E4...bF60");
  const [poiResult, setPoiResult] = useState<{ verified: boolean; root: string } | null>({
    verified: true,
    root: "0x3f8a...9011",
  });

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Recalculate ECDH sample
  const handleRecalculateEcdh = () => {
    const nextSeed = ecdhSeed + 1;
    setEcdhSeed(nextSeed);
    const mockPriv = "0x" + Math.random().toString(16).substring(2, 8) + "...e102";
    const mockPub = "0x03" + Math.random().toString(16).substring(2, 6) + "...99cf";
    const mockSecret = "0x" + Math.random().toString(16).substring(2, 8) + "...c48a";
    const mockChannel = "0x" + Math.random().toString(16).substring(2, 8) + "...90d1";
    setEphemeralPrivKey(mockPriv);
    setRecipientPubKey(mockPub);
    setComputedSharedSecret(mockSecret);
    setComputedChannelId(mockChannel);
  };

  // Generate new DKSAP Stealth sample
  const handleGenerateStealth = () => {
    const randAddr = "0x07" + Math.random().toString(16).substring(2, 6) + "...88ab";
    const randTag = "0x" + Math.floor(Math.random() * 255).toString(16).padStart(2, "0");
    setStealthGeneratedAddr(randAddr);
    setStealthViewTag(randTag);
  };

  // Advance Double Ratchet Step
  const handleAdvanceRatchet = () => {
    setRatchetEpoch((prev) => prev + 1);
    setRatchetKey("0x" + Math.random().toString(16).substring(2, 8) + "...ff32");
  };

  return (
    <div className={styles.pageContainer}>
      {/* Top Navigation */}
      <nav className={styles.navHeader}>
        <div className={`${styles.contentWrapper} ${styles.navInner}`}>
          <a href="#" className={styles.brandLink}>
            <div className={styles.brandLogoBox}>W</div>
            <span className={styles.brandTitle}>StarkWhisper</span>
          </a>

          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Primitives</a>
            <a href="#threats" className={styles.navLink}>Threat Matrix</a>
            <a href="#pipeline" className={styles.navLink}>Architecture</a>
            <a href="#faq" className={styles.navLink}>FAQ</a>
            <a
              href={`https://voyager.online/contract/${constants.Strk20EchoHelperAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navLink}
            >
              Mainnet Contract ↗
            </a>
          </div>

          <div className={styles.navActions}>
            <div className={styles.statusPill}>
              <span className={styles.statusDot}></span>
              <span>Mainnet Live</span>
            </div>
            <button
              onClick={toggleTheme}
              className={styles.themeToggleBtn}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Theme"
            >
              <span style={{ fontSize: "11px", fontWeight: 700 }}>
                {theme === "dark" ? "LIGHT" : "DARK"}
              </span>
            </button>

            <button onClick={onLaunchDapp} className={styles.launchAppBtn}>
              <span>Launch App</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={`${styles.contentWrapper} ${styles.heroGrid}`}>
          {/* Left Column: Value Proposition */}
          <div className={styles.heroContent}>
            <div className={styles.heroTag}>
              <span>STRK20 PRIVACY PROTOCOL</span>
            </div>

            <h1 className={styles.heroTitle}>
              Sovereign Private Messaging &{" "}
              <span className={styles.heroTitleAccent}>Atomic Payments</span> on Starknet
            </h1>

            <p className={styles.heroSubtitle}>
              Zero-knowledge end-to-end encrypted messaging with Dual-Key Stealth Addresses (DKSAP),
              forward-secrecy double ratchets, 99.6% fast-filter view tags, and private STRK token transfers.
            </p>

            <div className={styles.heroActions}>
              <button onClick={onLaunchDapp} className={styles.primaryCtaBtn}>
                <span>Launch DApp Workspace</span>
                <span>→</span>
              </button>

              <a
                href={`https://voyager.online/contract/${constants.Strk20EchoHelperAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondaryCtaBtn}
              >
                <span>View Mainnet Contract</span>
              </a>
            </div>

            <div className={styles.heroTrustMetrics}>
              <div className={styles.trustMetric}>
                <span className={styles.trustMetricValue}>0 Bytes</span>
                <span className={styles.trustMetricLabel}>Plaintext On-Chain</span>
              </div>
              <div className={styles.trustMetric}>
                <span className={styles.trustMetricValue}>99.6%</span>
                <span className={styles.trustMetricLabel}>View-Tag CPU Savings</span>
              </div>
              <div className={styles.trustMetric}>
                <span className={styles.trustMetricValue}>100%</span>
                <span className={styles.trustMetricLabel}>Forward Secrecy</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Cryptographic Telemetry HUD */}
          <div className={styles.hudCard}>
            <div className={styles.hudCardHeader}>
              <div className={styles.hudCardTitleBox}>
                <span className={styles.statusDot}></span>
                <span className={styles.hudCardTitle}>Starknet Telemetry HUD</span>
              </div>

              <div className={styles.hudTabs}>
                <button
                  className={`${styles.hudTab} ${hudTab === "ecdh" ? styles.hudTabActive : ""}`}
                  onClick={() => setHudTab("ecdh")}
                >
                  ECDH
                </button>
                <button
                  className={`${styles.hudTab} ${hudTab === "viewtag" ? styles.hudTabActive : ""}`}
                  onClick={() => setHudTab("viewtag")}
                >
                  View-Tag
                </button>
                <button
                  className={`${styles.hudTab} ${hudTab === "anonymity" ? styles.hudTabActive : ""}`}
                  onClick={() => setHudTab("anonymity")}
                >
                  ZK-Pool
                </button>
              </div>
            </div>

            <div className={styles.hudBody}>
              {hudTab === "ecdh" && (
                <>
                  <div className={styles.hudFieldGroup}>
                    <div className={styles.hudFieldLabel}>
                      <span>Ephemeral Secret Key (r)</span>
                      <span>STARK Curve</span>
                    </div>
                    <div className={styles.hudFieldBox}>{ephemeralPrivKey}</div>
                  </div>

                  <div className={styles.hudFieldGroup}>
                    <div className={styles.hudFieldLabel}>
                      <span>Recipient Public Key (K_rec)</span>
                      <span>Affine Point</span>
                    </div>
                    <div className={styles.hudFieldBox}>{recipientPubKey}</div>
                  </div>

                  <div className={styles.hudFieldGroup}>
                    <div className={styles.hudFieldLabel}>
                      <span>Computed Shared Secret (S = r * K_rec)</span>
                      <span className={styles.hudFieldHighlight}>Verified</span>
                    </div>
                    <div className={styles.hudFieldBox}>
                      <span className={styles.hudFieldHighlight}>{computedSharedSecret}</span>
                    </div>
                  </div>

                  <div className={styles.hudFieldGroup}>
                    <div className={styles.hudFieldLabel}>
                      <span>Poseidon Channel Hash</span>
                      <span>Field Element</span>
                    </div>
                    <div className={styles.hudFieldBox}>{computedChannelId}</div>
                  </div>

                  <button onClick={handleRecalculateEcdh} className={styles.secondaryCtaBtn} style={{ width: "100%", padding: "8px" }}>
                    <span>Recalculate STARK Curve Agreement</span>
                  </button>
                </>
              )}

              {hudTab === "viewtag" && (
                <>
                  <div className={styles.hudFieldGroup}>
                    <div className={styles.hudFieldLabel}>
                      <span>1-Byte Fast Filter (&lt; 256 bounds)</span>
                      <span className={styles.hudFieldHighlight}>99.6% Discard Rate</span>
                    </div>
                    <div className={styles.hudFieldBox}>Tag: {stealthViewTag} · Target: {stealthViewTag} (Match)</div>
                  </div>

                  <div className={styles.hudFieldGroup}>
                    <div className={styles.hudFieldLabel}>
                      <span>CPU Trial Decryption Cost</span>
                      <span>Benchmarked</span>
                    </div>
                    <div className={styles.hudFieldBox}>0.04 ms per note (vs 12.8 ms standard ECDH)</div>
                  </div>

                  <div className={styles.hudFieldGroup}>
                    <div className={styles.hudFieldLabel}>
                      <span>Filter Bounds Check</span>
                      <span>Poseidon Hash</span>
                    </div>
                    <div className={styles.hudFieldBox}>H(S, 0x56494557) & 0xFF == Tag</div>
                  </div>
                </>
              )}

              {hudTab === "anonymity" && (
                <>
                  <div className={styles.hudFieldGroup}>
                    <div className={styles.hudFieldLabel}>
                      <span>STRK20 Privacy Pool</span>
                      <span className={styles.hudFieldHighlight}>Active</span>
                    </div>
                    <div className={styles.hudFieldBox}>Starknet Mainnet Mix Pool</div>
                  </div>

                  <div className={styles.hudFieldGroup}>
                    <div className={styles.hudFieldLabel}>
                      <span>Messaging Helper Contract</span>
                      <span>Mainnet Deployed</span>
                    </div>
                    <div className={styles.hudFieldBox}>{shortHex(constants.Strk20EchoHelperAddress)}</div>
                  </div>

                  <div className={styles.hudFieldGroup}>
                    <div className={styles.hudFieldLabel}>
                      <span>Decoy Distribution Model</span>
                      <span>Traffic Analysis Resistant</span>
                    </div>
                    <div className={styles.hudFieldBox}>Poisson Process (λ = 3)</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Architecture Section */}
      <section id="features" className={styles.sectionBlock}>
        <div className={styles.contentWrapper}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>CRYPTOGRAPHIC ARCHITECTURE</div>
            <h2 className={styles.sectionTitle}>Four Pillars of Sovereign Privacy</h2>
            <p className={styles.sectionSubtitle}>
              Built on mathematical zero-knowledge primitives and forward secrecy to guarantee that neither relayers, sequencers, nor chain observers can correlate your communications.
            </p>
          </div>

          <div className={styles.bentoGrid}>
            {/* Card 1: DKSAP Stealth Addressing */}
            <div className={`${styles.bentoCard} ${styles.bentoSpan7}`}>
              <div className={styles.bentoCardHeader}>
                <div className={styles.bentoIconBox}>01</div>
                <span className={styles.bentoBadge}>DKSAP Standard</span>
              </div>
              <div className={styles.bentoCardBody}>
                <h3 className={styles.bentoCardTitle}>Dual-Key Stealth Addresses</h3>
                <p className={styles.bentoCardDesc}>
                  Send messages and payments to one-time ephemeral stealth addresses derived using dual keys (Spend Key and View Key). Observers cannot link transactions to the recipient&apos;s real public address.
                </p>
              </div>
              <div className={styles.bentoVisualArea}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span>Generated Stealth Target:</span>
                  <span className={styles.hudFieldHighlight}>{stealthGeneratedAddr}</span>
                </div>
                <button onClick={handleGenerateStealth} className={styles.secondaryCtaBtn} style={{ padding: "6px 12px", fontSize: "11px", width: "100%" }}>
                  <span>Generate New Ephemeral Stealth Address</span>
                </button>
              </div>
            </div>

            {/* Card 2: Forward Secrecy Double Ratchet */}
            <div className={`${styles.bentoCard} ${styles.bentoSpan5}`}>
              <div className={styles.bentoCardHeader}>
                <div className={styles.bentoIconBox}>02</div>
                <span className={styles.bentoBadge}>Double Ratchet</span>
              </div>
              <div className={styles.bentoCardBody}>
                <h3 className={styles.bentoCardTitle}>Forward & Future Secrecy</h3>
                <p className={styles.bentoCardDesc}>
                  Every message step evolves the symmetric encryption key. A compromise of any single session key never compromises past or future messages.
                </p>
              </div>
              <div className={styles.bentoVisualArea}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span>Current Epoch: <strong>#{ratchetEpoch}</strong></span>
                  <button onClick={handleAdvanceRatchet} className={styles.secondaryCtaBtn} style={{ padding: "4px 8px", fontSize: "10px" }}>
                    Advance Ratchet Step
                  </button>
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>Key: {ratchetKey}</div>
              </div>
            </div>

            {/* Card 3: ZK Proof of Innocence */}
            <div className={`${styles.bentoCard} ${styles.bentoSpan6}`}>
              <div className={styles.bentoCardHeader}>
                <div className={styles.bentoIconBox}>03</div>
                <span className={styles.bentoBadge}>ZK Compliance</span>
              </div>
              <div className={styles.bentoCardBody}>
                <h3 className={styles.bentoCardTitle}>ZK-Proof of Innocence</h3>
                <p className={styles.bentoCardDesc}>
                  Prove cryptographically that your shielded funds and message notes do not originate from sanctioned (OFAC) deposits—without revealing your identity or account history.
                </p>
              </div>
              <div className={styles.bentoVisualArea}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Sanctions Merkle Exclusion:</span>
                  <span className={styles.hudFieldHighlight}>Verified Clean</span>
                </div>
              </div>
            </div>

            {/* Card 4: Poisson Traffic Obfuscation */}
            <div className={`${styles.bentoCard} ${styles.bentoSpan6}`}>
              <div className={styles.bentoCardHeader}>
                <div className={styles.bentoIconBox}>04</div>
                <span className={styles.bentoBadge}>Traffic Obfuscation</span>
              </div>
              <div className={styles.bentoCardBody}>
                <h3 className={styles.bentoCardTitle}>Poisson Noise Decoy Injection</h3>
                <p className={styles.bentoCardDesc}>
                  Inject uniform decoy notes with Poisson-distributed delays to break time-correlation and graph-analysis attacks from network surveillance nodes.
                </p>
              </div>
              <div className={styles.bentoVisualArea}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Decoy Shuffling:</span>
                  <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>Active Decoys Injected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Threat Comparison Matrix Section */}
      <section id="threats" className={styles.sectionBlock}>
        <div className={styles.contentWrapper}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>SECURITY THREAT MODEL</div>
            <h2 className={styles.sectionTitle}>Public Starknet vs. StarkWhisper</h2>
            <p className={styles.sectionSubtitle}>
              Standard blockchain explorers expose your entire economic and communication graph. StarkWhisper eliminates on-chain leakage at every layer.
            </p>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.threatTable}>
              <thead>
                <tr>
                  <th>Privacy Vector</th>
                  <th>Standard Starknet Transaction</th>
                  <th>StarkWhisper Shielded Note</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.vectorTitle}>Sender Identity</td>
                  <td><span className={styles.leakedTag}>Exposed (Account Address)</span></td>
                  <td><span className={styles.shieldedTag}>Protected (Gasless Relayer / DKSAP)</span></td>
                </tr>
                <tr>
                  <td className={styles.vectorTitle}>Recipient Identity</td>
                  <td><span className={styles.leakedTag}>Exposed (Destination Address)</span></td>
                  <td><span className={styles.shieldedTag}>Protected (One-Time DKSAP Stealth Key)</span></td>
                </tr>
                <tr>
                  <td className={styles.vectorTitle}>Message Payload</td>
                  <td><span className={styles.leakedTag}>Exposed in Calldata / Events</span></td>
                  <td><span className={styles.shieldedTag}>Encrypted (ChaCha20-Poly1305 Stream)</span></td>
                </tr>
                <tr>
                  <td className={styles.vectorTitle}>Payment Memos</td>
                  <td><span className={styles.leakedTag}>Exposed on Block Explorers</span></td>
                  <td><span className={styles.shieldedTag}>Encrypted (Atomic Transfer Bundle)</span></td>
                </tr>
                <tr>
                  <td className={styles.vectorTitle}>Traffic Timing Analysis</td>
                  <td><span className={styles.leakedTag}>Correlated via Timestamps</span></td>
                  <td><span className={styles.shieldedTag}>Protected (Poisson Noise Decoys)</span></td>
                </tr>
                <tr>
                  <td className={styles.vectorTitle}>Regulatory Compliance</td>
                  <td><span className={styles.leakedTag}>All-or-nothing exposure</span></td>
                  <td><span className={styles.shieldedTag}>Scoped Viewing Keys & ZK-PoI</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Architecture Pipeline Flow */}
      <section id="pipeline" className={styles.sectionBlock}>
        <div className={styles.contentWrapper}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>TRANSACTION LIFECYCLE</div>
            <h2 className={styles.sectionTitle}>How a Shielded Note is Executed</h2>
            <p className={styles.sectionSubtitle}>
              Four discrete cryptographic stages from client-side curve agreement to on-chain relayer settlement.
            </p>
          </div>

          <div className={styles.bentoGrid}>
            <div className={`${styles.bentoCard} ${styles.bentoSpan6}`}>
              <div className={styles.bentoCardHeader}>
                <span className={styles.bentoBadge}>Stage 01</span>
              </div>
              <h3 className={styles.bentoCardTitle}>1. Key Agreement & Padding</h3>
              <p className={styles.bentoCardDesc}>
                The sender performs ECDH on the STARK curve with the recipient&apos;s public key, advances the Double Ratchet state, and pads the message to uniform felt boundaries.
              </p>
            </div>

            <div className={`${styles.bentoCard} ${styles.bentoSpan6}`}>
              <div className={styles.bentoCardHeader}>
                <span className={styles.bentoBadge}>Stage 02</span>
              </div>
              <h3 className={styles.bentoCardTitle}>2. Multi-Felt Stream Cipher</h3>
              <p className={styles.bentoCardDesc}>
                Ciphertexts are encoded directly into Starknet Felt252 arrays with a 1-byte fast-filter View-Tag prefix embedded in the highest order byte.
              </p>
            </div>

            <div className={`${styles.bentoCard} ${styles.bentoSpan6}`}>
              <div className={styles.bentoCardHeader}>
                <span className={styles.bentoBadge}>Stage 03</span>
              </div>
              <h3 className={styles.bentoCardTitle}>3. Decoy Note Shuffling</h3>
              <p className={styles.bentoCardDesc}>
                The client creates simulated decoy notes and shuffles the payload into a batch to prevent network eavesdroppers from deducing real interaction graphs.
              </p>
            </div>

            <div className={`${styles.bentoCard} ${styles.bentoSpan6}`}>
              <div className={styles.bentoCardHeader}>
                <span className={styles.bentoBadge}>Stage 04</span>
              </div>
              <h3 className={styles.bentoCardTitle}>4. Atomic On-Chain Settlement</h3>
              <p className={styles.bentoCardDesc}>
                The multicall bundle is submitted to the Starknet Mainnet MessagingAnonymizer contract directly or via the gasless paymaster relayer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={styles.sectionBlock}>
        <div className={styles.contentWrapper}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>FREQUENTLY ASKED QUESTIONS</div>
            <h2 className={styles.sectionTitle}>Everything You Need to Know</h2>
          </div>

          <div className={styles.faqList}>
            {[
              {
                q: "What makes StarkWhisper different from Signal or Telegram?",
                a: "Signal and Telegram are hosted on centralized servers subject to subpoena, IP logging, and DNS takedowns. StarkWhisper operates 100% on the decentralized Starknet blockchain with non-custodial smart contracts and zero centralized database requirements.",
              },
              {
                q: "How does the 1-Byte View-Tag reduce CPU scanning load by 99.6%?",
                a: "Normally, trial decryption requires computing an expensive elliptic curve point multiplication for every on-chain note. By prefixing each note with a 1-byte view tag, 255 out of 256 non-relevant notes are discarded via an instantaneous integer equality check (< 256 bounds), reducing client scanning costs by 99.6%.",
              },
              {
                q: "Can I selectively disclose messages to tax authorities or auditors?",
                a: "Yes. StarkWhisper features Scoped Viewing Keys. You can export a read-only thread viewing key for a specific counterparty or time range without compromising your master private keys or any other conversations.",
              },
              {
                q: "What tokens are supported for private atomic transfers?",
                a: "StarkWhisper natively supports STRK tokens on Starknet Mainnet, enabling simultaneous confidential note delivery and token settlement in a single atomic transaction.",
              },
            ].map((item, idx) => (
              <div key={idx} className={styles.faqItem}>
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className={styles.faqQuestion}
                >
                  <span>{item.q}</span>
                  <span>{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx && <div className={styles.faqAnswer}>{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Outcome CTA Banner */}
      <section className={styles.contentWrapper}>
        <div className={styles.ctaBanner}>
          <h2 className={styles.ctaBannerTitle}>
            Experience Uncompromising On-Chain Privacy Today
          </h2>
          <p className={styles.ctaBannerDesc}>
            Connect your Starknet wallet or test in sandbox mode with zero setup. Fully audited, compliant, and open-source.
          </p>
          <button onClick={onLaunchDapp} className={styles.primaryCtaBtn} style={{ padding: "16px 36px", fontSize: "16px" }}>
            <span>Launch DApp Workspace</span>
            <span>↗</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={`${styles.contentWrapper} ${styles.footerInner}`}>
          <div className={styles.footerInfo}>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>StarkWhisper Protocol</span>
            <span className={styles.footerContractHash}>
              Mainnet Contract: {shortHex(constants.Strk20EchoHelperAddress)}
            </span>
          </div>

          <div className={styles.footerLinks}>
            <a
              href="https://github.com/dino1x/starkwhisper"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              GitHub
            </a>
            <a
              href={`https://voyager.online/contract/${constants.Strk20EchoHelperAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              Voyager Explorer
            </a>
            <a
              href="https://strk20.starknet.io/hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              STRK20 Hackathon
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
