"use client";

import { useEffect, useRef } from "react";

// Register activity at most once per hour per session to avoid spamming the DB
const PING_THROTTLE_MS = 1000 * 60 * 60; 

export default function FamilyPing() {
  const pinged = useRef(false);

  useEffect(() => {
    // Only run on the client, and only once per mount
    if (pinged.current) return;

    const lastPing = localStorage.getItem("micaso_last_ping");
    const now = Date.now();

    if (!lastPing || now - parseInt(lastPing, 10) > PING_THROTTLE_MS) {
      pinged.current = true;
      localStorage.setItem("micaso_last_ping", now.toString());
      
      // Perform ping in the background
      fetch("/api/caso/ping", { method: "POST" }).catch(() => {
        // Silently ignore errors to avoid disrupting the user experience
        console.error("Failed to ping family activity");
      });
    }
  }, []);

  // Invisible component
  return null;
}
