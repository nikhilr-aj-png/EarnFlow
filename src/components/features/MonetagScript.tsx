"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    const executeScripts = (html: string) => {
      if (!html) return;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const scripts = doc.querySelectorAll("script");

      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        if (oldScript.innerHTML) {
          newScript.innerHTML = oldScript.innerHTML;
        }
        document.body.appendChild(newScript);
      });
    };

    if (scripts.banner) executeScripts(scripts.banner);
    if (scripts.interstitial) executeScripts(scripts.interstitial);
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
