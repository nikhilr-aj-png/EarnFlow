"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function MonetagScript() {
  const [scriptTag, setScriptTag] = useState<string | null>(null);

  useEffect(() => {
    const fetchScript = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "ads"));
        if (snap.exists() && snap.data().monetagZoneTag) {
          setScriptTag(snap.data().monetagZoneTag);
        }
      } catch (e) {
        console.error("Failed to load Monetag Script:", e);
      }
    };
    fetchScript();
  }, []);

  if (!scriptTag) return null;

  return (
    <div dangerouslySetInnerHTML={{ __html: scriptTag }} />
  );
}
