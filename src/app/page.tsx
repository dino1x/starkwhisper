"use client";

import React, { useState, useEffect, useCallback } from "react";
import LandingPage from "./components/landing/LandingPage";
import StarkWhisperApp from "./components/messaging/StarkWhisperApp";

export default function Page() {
  const [showDapp, setShowDapp] = useState(false);

  // Sync with URL Hash / Query Parameter & browser history
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash === "#dapp" || hash === "#app" || params.get("dapp") === "true") {
        setShowDapp(true);
      } else {
        setShowDapp(false);
      }
    };

    // Check initial route on mount
    handleLocationChange();

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const handleLaunchDapp = useCallback(() => {
    setShowDapp(true);
    try {
      if (window.location.hash !== "#dapp") {
        window.history.pushState({ view: "dapp" }, "", "#dapp");
      }
    } catch {}
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  const handleBackToLanding = useCallback(() => {
    setShowDapp(false);
    try {
      window.history.pushState({ view: "landing" }, "", window.location.pathname);
    } catch {}
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  if (showDapp) {
    return (
      <div>
        {/* Top Back Navigation Bar to return to Landing Page */}
        <div
          style={{
            backgroundColor: "#111111",
            color: "#ffffff",
            padding: "10px 24px",
            borderBottom: "1px solid #262626",
            fontSize: "13px",
            fontFamily: '"JetBrains Mono", monospace',
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <button
            onClick={handleBackToLanding}
            style={{
              background: "#E63946",
              color: "#ffffff",
              border: "none",
              padding: "6px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 700,
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              touchAction: "manipulation",
              fontSize: "12px",
            }}
          >
            ← Back to Landing Page
          </button>
          <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px" }}>
            StarkWhisper Workspace · STRK20 Privacy Pool
          </span>
        </div>
        <StarkWhisperApp />
      </div>
    );
  }

  return <LandingPage onLaunchDapp={handleLaunchDapp} />;
}

