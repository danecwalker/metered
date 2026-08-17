# Metered

A **preview** public index of **finished work** as **`$ / M ET`**, by **model × harness**.

`$ / M ET` is only defined after a **complete published run** — every official task passed, then an admin published the sealed package. Incomplete runs stay visible; they do not rank as cheap. Failed attempts and retries stay in the bill.

Evals are **local only**. The web app never accepts provider API keys. Method: `/methodology`.

```
1 MU = 4 Unicode characters (NFC, LF)
Fertility = native tokens / MU
True Price = list price × fertility
```

## Run

Needs [Node.js](https://nodejs.org/) LTS.

```bash
cp .env.example .env.local
# Replace ADMIN_PASSWORD and ADMIN_SECRET.
# Placeholders in .env.example are rejected on purpose. Do not commit real values.
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin is `/admin` (password from `ADMIN_PASSWORD`). The first request creates `data/metered.db` and seeds a small published set.

```bash
npm test
npx tsc --noEmit
npm run build
```

`.env.local` and `data/*.db` are gitignored. Leave them out of git.

## Eval (local only)

On the machine that already has the harness CLI and any provider keys:

```bash
bash cli/get.sh
bash cli/run.sh --harness claude --effort high --model-name "Claude Sonnet" --list-input 3 --list-output 15
```

`--effort` is required for a distinct row (`none | low | medium | high | xhigh | max | default`). Same model, different effort, different stack.

`get.sh` writes `metered-eval.yaml` from the CLIs on that machine. `run.sh` retries each official task until it passes or hits `max_attempts`, then writes a sealed `*.metered.json`. Keys never leave that machine.

Upload the sealed file at `/eval`. Suite-verified means the official prompts and totals check out. An admin still publishes it at `/admin/submissions` before it can rank.

**`$ / M ET` needs a complete published run** of `work-2026.08-complete`. A 1/5 package is not cheaper than a 5/5 finish.

## Deploy

This is a standard Next.js app (not a static export). Point a [Vercel](https://vercel.com/docs/frameworks/nextjs) project at the repo, or run it as Node:

```bash
npm ci
npm run build
npm start
```

Set the same variables as `.env.example` on the host (`ADMIN_PASSWORD`, `ADMIN_SECRET`, `DATABASE_URL`). `/eval` already points `curl | bash` at `danecwalker/metered`. Set `NEXT_PUBLIC_GITHUB_REPO` only for a fork.

`DATABASE_URL=file:./data/metered.db` is fine on a Node host with a disk. Serverless filesystems are ephemeral — use a persistent libSQL URL there if the index should survive deploys. No public hostname is bundled; use whatever host you attach.

## Admin

1. Sign in at `/admin` after replacing the example secrets.
2. **Add model** — name, lab, slug, tokenizer.
   - `o200k_base` / `cl100k_base` can count the basket locally.
   - `manual` is for Anthropic, Google, and anyone else: paste native token counts per slice.
3. Add an endpoint (provider, SKU, list `$/M` input and output).
4. Count the basket or enter slice token counts.
5. Publish the model and the endpoint.
6. Review `/eval` packages at `/admin/submissions`. Publishing writes a work run onto the index.

Draft rows stay off the public index.

In production, `ADMIN_PASSWORD` must be at least 12 characters and `ADMIN_SECRET` at least 24. Documented example values are rejected in every environment.

## Basket

Frozen files live in `data/basket/` (`basket-2026.08-preview`). Official task pastes live in `data/scenarios/`. Changing those files is a new index version.

Seeded non-OpenAI fertilities are **estimates** from [TensorZero, April 2026](https://www.tensorzero.com/blog/stop-comparing-price-per-million-tokens-the-hidden-llm-api-costs/), labeled on the site. Replace them with official lab counts before treating the index as canonical.
