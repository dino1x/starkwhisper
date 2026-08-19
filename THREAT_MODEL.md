# StarkWhisper Privacy Threat Model & Cryptographic Security Specification

**Version:** 1.0.0  
**Target:** STRK20 Private Sprint / Starknet Mainnet & Sepolia  
**Standard Compliance:** ERC-5564 (Dual-Key Stealth Addresses) & STRK20 Privacy Pool Standard  

---

## 1. System Overview

StarkWhisper provides metadata-resistant, end-to-end encrypted messaging and confidential payment memos on Starknet. It decouples sender identity, recipient identity, message content, and payload length from public on-chain observers while preserving verifiable compliance capabilities through scoped auditor viewing keys.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                STARKWHISPER ARCHITECTURE                               │
├───────────────────────┬───────────────────────────┬────────────────────────────────────┤
│     SENDER PRIVACY    │     RECIPIENT PRIVACY     │          PAYLOAD SECURITY          │
├───────────────────────┼───────────────────────────┼────────────────────────────────────┤
│ • STRK20 Privacy Pool │ • Dual-Key Stealth Address│ • Multi-Felt Stream Cipher         │
│ • ZK Note Spend Proof │ • 1-Byte View-Tag Filter  │ • Uniform 8-Felt Padding           │
│ • Nullifier Tracking  │ • Unlinked One-Time P     │ • Signal-Style Double Ratchet      │
└───────────────────────┴───────────────────────────┴────────────────────────────────────┘
```

---

## 2. Adversary Model & Threat Actors

We evaluate StarkWhisper against four distinct adversary classes:

| Adversary Class | Capabilities | Goal |
|---|---|---|
| **Passive On-Chain Observer** | Monitors all public transactions, events, calldata, and state transitions on Starknet. | Reconstruct the communication graph (who talks to whom, when, and payload sizes). |
| **Malicious RPC / Indexer** | Controls the Starknet JSON-RPC node or block explorer used by the client. | Correlate client IP address with specific recipient addresses, viewing queries, or balance lookups. |
| **Active Network Attacker** | Intercepts, delays, or injects network traffic at the peer-to-peer or relayer layer. | Conduct traffic analysis, message replay, or deanonymization via packet timing. |
| **Compromised Auditor** | Obtains a user-exported compliance viewing key. | Attempt to decrypt unauthorized conversation threads or steal funds. |

---

## 3. Privacy Guarantees: What is Hidden vs. What Leaks

```
┌─────────────────────────────────────────────────────────┬─────────────────────────────────────────┐
│                     WHAT IS HIDDEN                      │               WHAT LEAKS                │
├─────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
│ • Sender Public Address (Unlinked via ZK Note Spend)    │ • On-Chain Block Timestamp              │
│ • Recipient Public Address (DKSAP One-Time Key P)       │ • Transaction Fee & Gas Consumption     │
│ • Message Plaintext (STARK-Curve ECDH + Stream Cipher)  │ • Anonymity Set Size (k pool notes)     │
│ • Exact Payload Length (Uniform 8-Felt Block Padding)   │ • Event Emission Height                 │
│ • Relationship Between Multiple Messages (Ratchet)      │                                         │
└─────────────────────────────────────────────────────────┴─────────────────────────────────────────┘
```

### 3.1 What is Cryptographically Hidden

1. **Sender Anonymity ($k$-Anonymity Set)**:
   - Senders spend an unlinked note in the STRK20 privacy pool.
   - The on-chain contract receives the call from the pool router or an unlinked burner invocation; no signature or public key belonging to the sender is revealed on-chain.
2. **Recipient Unlinkability (DKSAP)**:
   - For every message, the sender generates an ephemeral key pair $(r, R = r \cdot G)$ and derives a one-time stealth address:
     $$P = B + \text{Poseidon}(r \cdot A) \cdot G$$
   - Third-party observers cannot associate $P$ with the recipient's meta-address $(A, B)$.
3. **Payload Confidentiality & Side-Channel Padding**:
   - Plaintext messages are encrypted using a symmetric key derived from the ECDH shared secret $S = r \cdot A$.
   - Messages are quantized into **uniform 8-felt buckets** (248 bytes per bucket), preventing eavesdroppers from guessing message content based on ciphertext length.
4. **Forward & Backward Secrecy**:
   - Key derivation utilizes a double-ratchet state advancement: compromise of key $K_i$ does not compromise past messages $K_{<i}$ or future messages $K_{>i}$.

### 3.2 What Is Observable & Mitigation Strategy

1. **Transaction Timestamp & Block Number**:
   - *Leakage*: The exact block when a `WhisperPublished` event is emitted is public.
   - *Mitigation*: Clients can batch disclosures or use delayed relayers to decouple message drafting from block inclusion.
2. **RPC Query Correlation**:
   - *Leakage*: Querying an RPC node for a specific stealth address $P$ leaks interest to the node operator.
   - *Mitigation*: StarkWhisper uses **1-Byte View-Tags** and **Garbled Bloom Filter Local PIR** so clients download candidate event batches locally and evaluate them without querying single addresses.
3. **Global Pool Activity**:
   - *Leakage*: The total number of transactions in the privacy pool ($N$) is publicly countable.
   - *Mitigation*: The app displays the active anonymity set size ($N$) to inform users of current privacy depth.

---

## 4. Cryptographic Primitives & Parameters

| Primitive | Implementation | Parameter / Field |
|---|---|---|
| **Base Curve** | STARK Curve (Cairo friendly) | Order $q = 2^{251} + 17 \cdot 2^{192} + 1$ |
| **Hash Function** | Poseidon Hash | 252-bit prime field $\mathbb{F}_p$ |
| **Stealth Address** | DKSAP (Dual-Key) | Spend Key $(b, B)$, View Key $(a, A)$ |
| **Fast Filter** | 1-Byte View-Tag | $v = \text{Poseidon}(S) \bmod 256$ (99.6% CPU reduction) |
| **Symmetric Cipher** | Multi-Felt Stream Cipher | Counter-mode with Poseidon keystream |
| **Padding Scheme** | PKCS#7 Variant on Felts | Aligned to 8-felt boundaries |
| **Compliance** | Scoped Viewing Key | $K_{\text{audit}} = \text{Poseidon}(S, \text{channel\_id})$ |

---

## 5. Auditor Viewing Key & Selective Compliance

A major flaw in naive privacy protocols is the "all-or-nothing" dilemma: either complete transparency or total non-compliance.

StarkWhisper implements **Scoped Auditor Viewing Keys**:
- A user can disclose $K_{\text{audit}} = \text{Poseidon}(S, \text{channel\_id})$ for a specific conversation thread or invoice.
- **Auditor Capabilities**:
  - The auditor can decrypt plaintexts and verify payment amounts for that designated channel only.
- **Auditor Invariants**:
  - The auditor **CANNOT** spend any funds from the stealth address.
  - The auditor **CANNOT** decrypt other conversation threads.
  - The auditor **CANNOT** forge messages or sign transactions on the user's behalf.

---

## 6. Security Invariants & Assumptions

1. **Computational Diffie-Hellman (CDH) Assumption**: It is computationally infeasible to compute $S = r \cdot a \cdot G$ given only $R = r \cdot G$ and $A = a \cdot G$ on the STARK curve.
2. **Poseidon Preimage Resistance**: Given $h = \text{Poseidon}(x_1, x_2)$, finding $x_1, x_2$ requires $\mathcal{O}(2^{128})$ operations.
3. **ZK Soundness**: The STRK20 Privacy Pool zero-knowledge proofs cannot be forged by an adversary without knowledge of a valid unspent note commitment.
