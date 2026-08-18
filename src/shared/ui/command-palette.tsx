"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CatalogLogo } from "@/shared/ui/catalog-logo";

type ModelHit = { slug: string; name: string; lab: string; labId?: string | null };

const PAGES = [
  { href: "/stacks", label: "Stacks", group: "Go" },
  { href: "/methodology", label: "Method", group: "Go" },
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

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pageHits = PAGES.filter((page) =>
      q ? page.label.toLowerCase().includes(q) : true,
    ).map((page) => ({ ...page, hint: "Page", labId: null as string | null }));
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
        labId: model.labId,
      }));
    return [...pageHits, ...modelHits];
  }, [models, query]);

  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setActive(0);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="text-ink-2 hover:text-ink inline-flex size-8 cursor-pointer items-center justify-center border-0 bg-transparent"
          aria-label="Search"
        >
          <Search className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="cmdk__overlay" />
        <Dialog.Content
          className="cmdk__panel"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="cmdk__field">
            <Search className="text-muted size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
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
              aria-controls="cmdk-list"
            />
            <kbd>esc</kbd>
          </div>
          <div className="cmdk__list" id="cmdk-list" role="listbox">
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
                    <span className="stack-lead" style={{ alignItems: "center" }}>
                      {item.group === "Models" ? (
                        <CatalogLogo kind="lab" id={item.labId} name={item.hint} size={16} />
                      ) : null}
                      <span>{item.label}</span>
                    </span>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
