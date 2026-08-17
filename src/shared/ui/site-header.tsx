import Link from "next/link";
import { listPublishedModelsForSearch } from "@/features/catalog/queries";
import { CommandPalette } from "@/shared/ui/command-palette";

const MARK = "Metered";

export async function SiteHeader() {
  const models = await listPublishedModelsForSearch();

  return (
    <header className="nav" data-nav>
      <span className="nav__line" />
      <div className="wrap nav__inner">
        <Link className="wordmark" href="/" aria-label="Metered">
          <span className="wordmark__track">
            {MARK.split("").map((char, index) => (
              <span key={`${char}${index}`} className="wordmark__char" data-wordmark-char>
                {char}
              </span>
            ))}
          </span>
        </Link>
        <nav className="nav__links" aria-label="Primary">
          <Link className="nav__link" href="/">
            Stacks
          </Link>
          <Link className="nav__link" href="/methodology">
            Method
          </Link>
          <Link className="nav__link" href="/compare">
            Paste text
          </Link>
          <Link className="nav__link" href="/eval">
            Eval
          </Link>
        </nav>
        <div className="nav__right">
          <CommandPalette models={models} />
        </div>
      </div>
    </header>
  );
}
