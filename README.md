# Metered

A **preview** public index of **finished work** as **`$ / MU`**, by **model × harness**.

`$ / MU` is only defined after a **complete published run**: every official task passed, then an admin published the sealed package. Incomplete runs stay visible; they do not rank as cheap. Failed attempts and retries stay in the bill.

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

Open [http://localhost:3000](http://localhost:3000). Admin is `/admin` (password from `ADMIN_PASSWORD`). The first request creates tables in Postgres and seeds a small published set. Local `DATABASE_URL` is in `.env.example`. Production gets one from `buidl add postgres`.

```bash
npm test
npx tsc --noEmit
npm run build
```

`.env.local` is gitignored. Leave it out of git.

## Eval (local only)

The official jobs live in [metered-suite](https://github.com/danecwalker/metered-suite). Clone that repo, edit only `main.py` so it calls your harness, then run. Docker is required: the agent works in an isolated checkout and a hidden verifier grades a git patch with no network.

```bash
git clone https://github.com/danecwalker/metered-suite
cd metered-suite
# edit main.py
python3 -m metered_suite
```

Upload the sealed `*.metered.json` at `/eval`. Suite-verified means the official jobs, answers, and totals check out. An admin still publishes at `/admin/submissions` before a row can rank.

**`$ / MU` needs a complete published run** of `work-2026.08-py3` **and** real token counts from that harness’s CLI adapter. A failed job is not cheaper than a finish. Zero usage is not a $0 rank.

## Deploy

This is a standard Next.js app (not a static export). Point a [Vercel](https://vercel.com/docs/frameworks/nextjs) project at the repo, or run it as Node:

```bash
npm ci
npm run build
npm start
```

`buidl add postgres` writes `accessories.postgres` and puts `POSTGRES_PASSWORD` plus `DATABASE_URL` in `.buidl/secrets`. A first `buidl deploy` creates Postgres if it is missing. The app reads `DATABASE_URL` the same way [community-counter](https://github.com/danecwalker/buidl/tree/main/examples/community-counter) does. `/eval` already points `curl | bash` at `danecwalker/metered`. Set `NEXT_PUBLIC_GITHUB_REPO` only for a fork.

## Admin

1. Sign in at `/admin` after replacing the example secrets.
2. **Add model**: name, lab, slug, tokenizer.
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
