"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type ModelHit = { slug: string; name: string; lab: string };

const PAGES = [
  { href: "/", label: "Stacks", group: "Go" },
  { href: "/methodology", label: "Method", group: "Go" },
  { href: "/compare", label: "Paste text", group: "Go" },
  { href: "/eval", label: "Run an eval", group: "Go" },
];

export function CommandPalette({ models }: { models: ModelHit[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function openPalette() {
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  function closePalette() {
    setOpen(false);
  }

  function updateQuery(value: string) {
    setQuery(value);
    setActive(0);
  }

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pageHits = PAGES.filter((page) =>
      q ? page.label.toLowerCase().includes(q) : true,
    ).map((page) => ({ ...page, hint: "Page" }));
    const modelHits = models
      .filter((model) =>
        q
          ? `${model.name} ${model.lab} ${model.slug}`.toLowerCase().includes(q)
          : true,
      )
      .slice(0, 12)
      .map((model) => ({
        href: `/models/${model.slug}`,
        label: model.name,
        group: "Models",
        hint: model.lab,
      }));
    return [...pageHits, ...modelHits];
  }, [models, query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function go(href: string) {
    closePalette();
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        className="searchpill"
        aria-label="Search (Command K)"
        onClick={openPalette}
      >
        <span className="searchpill__label">Search</span>
        <kbd>⌘</kbd>
        <kbd>K</kbd>
      </button>
      {open ? (
        <div className="cmdk">
          <button
            type="button"
            className="cmdk__backdrop"
            aria-label="Close search"
            onClick={closePalette}
          />
          <div
            className="cmdk__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
          >
            <div className="cmdk__field">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closePalette();
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActive((value) => Math.min(items.length - 1, value + 1));
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActive((value) => Math.max(0, value - 1));
                  }
                  if (event.key === "Enter" && items[active]) {
                    event.preventDefault();
                    go(items[active].href);
                  }
                }}
                placeholder="Jump to a model or page"
                aria-autocomplete="list"
              />
              <kbd>esc</kbd>
            </div>
            <div className="cmdk__list" role="listbox">
              {items.length === 0 ? (
                <p className="cmdk__group">No matches</p>
              ) : (
                items.map((item, index) => (
                  <div key={item.href + item.label}>
                    {item.group !== items[index - 1]?.group ? (
                      <p className="cmdk__group">{item.group}</p>
                    ) : null}
                    <button
                      type="button"
                      className="cmdk__item"
                      role="option"
                      aria-selected={index === active}
                      data-active={index === active}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(item.href)}
                    >
                      <span>{item.label}</span>
                      <span className="model-meta">{item.hint}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="cmdk__foot">
              <span>↑↓ move</span>
              <span>↵ open</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
