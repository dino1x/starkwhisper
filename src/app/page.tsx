"use client";

import React, { useState } from "react";
import LandingPage from "./components/landing/LandingPage";
import StarkWhisperApp from "./components/messaging/StarkWhisperApp";

export default function Page() {
  const [showDapp, setShowDapp] = useState(false);

  if (showDapp) {
    return (
      <div>
        {/* Top Back Navigation Bar to return to Landing Page */}
        <div
          style={{
            backgroundColor: "#111111",
            color: "#ffffff",
            padding: "8px 24px",
            borderBottom: "1px solid #262626",
            fontSize: "12px",
            fontFamily: '"JetBrains Mono", monospace',
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setShowDapp(false)}
            style={{
              background: "#c53400",
              color: "#ffffff",
              border: "none",
              padding: "4px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            ← Back to Landing Page
          </button>
          <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>
            StarkWhisper Workspace · STRK20 Privacy Pool
          </span>
        </div>
        <StarkWhisperApp />
      </div>
    );
  }

  return <LandingPage onLaunchDapp={() => setShowDapp(true)} />;
}
