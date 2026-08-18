"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("metered-theme", next);
    } catch {
      /* private mode */
    }
  }

  return (
    <button
      type="button"
      className="text-ink-2 hover:text-ink inline-flex size-8 cursor-pointer items-center justify-center border-0 bg-transparent"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
