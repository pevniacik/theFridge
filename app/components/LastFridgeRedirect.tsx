"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * LastFridgeRedirect
 *
 * Invisible side-effect island rendered on the root landing page.
 * On mount, reads `localStorage['lastFridgeId']`. If a value is present,
 * performs a `router.replace` (not push — avoids polluting back-stack)
 * to the last visited fridge context. When no value is stored (first visit),
 * the component does nothing and the normal landing page renders.
 *
 * Inspection: Check `localStorage.getItem('lastFridgeId')` in DevTools console.
 * Failure state: If the stored ID refers to a deleted fridge, the fridge page
 * renders its not-found UI with recovery links — no redirect loop occurs.
 */
export default function LastFridgeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const lastId = localStorage.getItem("lastFridgeId");
    if (lastId) {
      router.replace(`/fridges/${lastId}`);
    }
  }, [router]);

  return null;
}
