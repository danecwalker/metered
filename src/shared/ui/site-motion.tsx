"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("[data-nav]");
    if (!nav) return;

    let scrolled = nav.hasAttribute("data-scrolled");
    let frame = 0;

    const apply = () => {
      frame = 0;
      const y = window.scrollY;
      const next = scrolled ? y > 6 : y > 20;
      if (next === scrolled) return;
      scrolled = next;
      nav.toggleAttribute("data-scrolled", next);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
