"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * LastFridgeRedirect
 *
 * Invisible side-effect island rendered on the root `/` page.
 * On mount, reads `localStorage['lastFridgeId']`. If present, replaces
 * the current history entry with `/fridges/<id>` so the back-stack is
 * not polluted.  Does nothing on first visit (no stored value).
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
