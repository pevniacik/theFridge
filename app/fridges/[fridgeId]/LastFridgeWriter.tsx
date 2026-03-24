"use client";

import { useEffect } from "react";

interface Props {
  fridgeId: string;
}

/**
 * LastFridgeWriter
 *
 * Invisible side-effect island rendered on every fridge context page.
 * On mount (and whenever fridgeId changes), persists the current fridge
 * ID to `localStorage['lastFridgeId']` so that `LastFridgeRedirect` on
 * the root page can route directly back to it on next open.
 */
export default function LastFridgeWriter({ fridgeId }: Props) {
  useEffect(() => {
    localStorage.setItem("lastFridgeId", fridgeId);
  }, [fridgeId]);

  return null;
}
