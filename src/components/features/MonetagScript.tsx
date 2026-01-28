"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Extend Window interface for types
declare global {
  interface Window {
    __isMonetagBlocked?: boolean;
  }
}

export function MonetagScript() {
  const [scripts, setScripts] = useState<{ banner: string, interstitial: string }>({ banner: "", interstitial: "" });

  useEffect(() => {
    const fetchScript = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "ads"));
        if (snap.exists()) {
          const data = snap.data();
          setScripts({
            banner: data.monetagZoneTag || "",
            interstitial: data.monetagInterstitialTag || ""
          });
        }
      } catch (e) {
        console.error("Failed to load Monetag Scripts:", e);
      }
    };
    fetchScript();
  }, []);

  useEffect(() => {
    // Helper to execute scripts from HTML
    const executeScripts = (html: string, id: string) => {
      if (!html || document.getElementById(`script-executed-${id}`)) return;

      const doc = new DOMParser().parseFromString(html, "text/html");
      const scripts = doc.querySelectorAll("script");

      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        newScript.id = `script-executed-${id}`;

        // Detection: set global blocked state if script fails
        newScript.onerror = () => {
          console.warn(`Monetag Script ${id} was blocked.`);
          window.__isMonetagBlocked = true;
        };

        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        if (oldScript.innerHTML) {
          newScript.innerHTML = oldScript.innerHTML;
        }
        document.body.appendChild(newScript);
      });
    };

    if (scripts.banner) executeScripts(scripts.banner, 'banner');
    if (scripts.interstitial) executeScripts(scripts.interstitial, 'interstitial');

    // Initial check: if no scripts after 3s, assume blocked or empty
    const timer = setTimeout(() => {
      if (!scripts.interstitial && !scripts.banner) return;
      if (!document.getElementById('script-executed-interstitial') && !document.getElementById('script-executed-banner')) {
        window.__isMonetagBlocked = true;
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [scripts]);

  return (
    <>
      <div id="monetag-banner-container" dangerouslySetInnerHTML={{
        __html: scripts.banner.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      }} />
      <div id="monetag-interstitial-container" dangerouslySetInnerHTML={{
        __html: scripts.interstitial.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      }} />
    </>
  );
}
