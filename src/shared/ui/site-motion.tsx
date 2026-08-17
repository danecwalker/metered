"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = document.querySelector<HTMLElement>("[data-nav]");
    if (!nav) return;

    const onScroll = () => {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (reduce) {
      return () => window.removeEventListener("scroll", onScroll);
    }

    let killed = false;
    let ctx: { revert: () => void } | undefined;

    void import("gsap").then(({ default: gsap }) => {
      if (killed) return;
      ctx = gsap.context(() => {
        const bar = nav.querySelector(".nav__line");
        const chars = nav.querySelectorAll("[data-wordmark-char]");
        const links = nav.querySelectorAll(".nav__link");
        const pill = nav.querySelector(".searchpill");

        gsap.from(bar, {
          scaleX: 0,
          duration: 0.7,
          ease: "power3.out",
          transformOrigin: "left center",
        });
        if (chars.length) {
          gsap.from(chars, {
            yPercent: 40,
            duration: 0.55,
            stagger: 0.035,
            ease: "power3.out",
            delay: 0.08,
          });
        }
        if (links.length) {
          gsap.from(links, {
            y: 6,
            duration: 0.45,
            stagger: 0.05,
            ease: "power3.out",
            delay: 0.18,
          });
        }
        if (pill) {
          gsap.from(pill, {
            y: 4,
            duration: 0.4,
            ease: "power3.out",
            delay: 0.28,
          });
        }

        const hero = document.querySelector("[data-hero]");
        if (hero) {
          gsap.from(hero.querySelectorAll("[data-hero-item]"), {
            y: 10,
            duration: 0.65,
            stagger: 0.08,
            ease: "power3.out",
            delay: 0.2,
          });
        }
      });
    });

    return () => {
      killed = true;
      ctx?.revert();
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return null;
}
