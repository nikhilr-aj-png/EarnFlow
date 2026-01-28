"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Extend Window interface for types
declare global {
  interface Window {
    __isMonetagBlocked?: boolean;
    refreshMonetagAds?: () => void;
  }
}

export function MonetagScript() {
  const { userData } = useAuth();
  const [scripts] = useState({
    vignette: `<script>(function(s){s.dataset.zone='10533581',s.src='https://gizokraijaw.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>`,
    popunder: `<script>(function(s){s.dataset.zone='10533918',s.src='https://al5sm.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>`,
    inPagePush: `<script>(function(s){s.dataset.zone='10533944',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>`
  });

  // 💎 PREMIUM BYPASS: If user is premium, dont load any ads
  if (userData?.isPremium) return null;

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

    if (scripts.vignette) executeScripts(scripts.vignette, 'vignette');
    if (scripts.popunder) executeScripts(scripts.popunder, 'popunder');
    if (scripts.inPagePush) executeScripts(scripts.inPagePush, 'inpagepush');

    // Initial check: if no scripts after 3s, assume blocked or empty
    const timer = setTimeout(() => {
      if (!document.getElementById('script-executed-vignette') &&
        !document.getElementById('script-executed-popunder') &&
        !document.getElementById('script-executed-inpagepush')) {
        window.__isMonetagBlocked = true;
      }
    }, 3000);

    // Expose refresh function
    window.refreshMonetagAds = () => {
      console.log("Refreshing Monetag Ads...");
      if (scripts.vignette) executeScripts(scripts.vignette, 'vignette');
      if (scripts.popunder) executeScripts(scripts.popunder, 'popunder');
      if (scripts.inPagePush) executeScripts(scripts.inPagePush, 'inpagepush');
    };

    return () => {
      clearTimeout(timer);
      delete window.refreshMonetagAds;
    };
  }, [scripts]);

  return (
    <>
      <div id="monetag-vignette-container" dangerouslySetInnerHTML={{
        __html: scripts.vignette.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      }} />
      <div id="monetag-popunder-container" dangerouslySetInnerHTML={{
        __html: scripts.popunder.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      }} />
      <div id="monetag-inpagepush-container" dangerouslySetInnerHTML={{
        __html: scripts.inPagePush.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      }} />
    </>
  );
}
