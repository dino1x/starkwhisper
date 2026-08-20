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
    return <StarkWhisperApp onBackToLanding={handleBackToLanding} />;
  }

  return <LandingPage onLaunchDapp={handleLaunchDapp} />;
}
