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

  return (
    <>
      {scripts.banner && <div dangerouslySetInnerHTML={{ __html: scripts.banner }} />}
      {scripts.interstitial && <div dangerouslySetInnerHTML={{ __html: scripts.interstitial }} />}
    </>
  );
}
