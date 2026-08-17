#!/usr/bin/env bash
# Step 1 — write metered-eval.yaml from the CLIs on this machine.
#
#   bash cli/get.sh
#   bash cli/get.sh --force
#   bash cli/get.sh --help
#
#   curl -fsSL https://raw.githubusercontent.com/danecwalker/metered/main/cli/get.sh | bash
set -euo pipefail

# Used only when this file is piped (no checkout). Override to clone a fork.
DEFAULT_REPO="danecwalker/metered"

say() { printf '%s\n' "$*" >&2; }
die() { say "get.sh: $*"; exit 1; }

NEXT_RUN='bash cli/run.sh --harness <name> --effort high --model-name "…" --list-input 3 --list-output 15'

print_help() {
  printf '%s\n' \
    "get.sh — step 1: write metered-eval.yaml from the CLIs on this machine." \
    "" \
    "  bash cli/get.sh" \
    "  bash cli/get.sh --force            overwrite existing yaml" \
    "  METERED_FORCE=1 bash cli/get.sh    same" \
    "" \
    "Then (step 2):" \
    "  ${NEXT_RUN}" \
    "" \
    "exit 0  yaml written or already present / help" \
    "exit 1  error"
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "need $1 on PATH"
}

resolve_root() {
  local here=""
  if [[ -n "${BASH_SOURCE[0]:-}" && "${BASH_SOURCE[0]}" != "bash" && "${BASH_SOURCE[0]}" != "/dev/stdin" && -f "${BASH_SOURCE[0]}" ]]; then
    here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
    if [[ -f "$here/metered-eval.ts" && -d "$here/../data/scenarios" ]]; then
      cd "$here/.." && pwd
      return
    fi
  fi
  if [[ -f "$PWD/cli/metered-eval.ts" && -d "$PWD/data/scenarios" ]]; then
    pwd
    return
  fi
  local home="${METERED_HOME:-$HOME/.metered}"
  if [[ -f "$home/cli/metered-eval.ts" ]]; then
    printf '%s\n' "$home"
    return
  fi
  local repo="${1:-${METERED_REPO:-$DEFAULT_REPO}}"
  need git
  say "cloning https://github.com/${repo}.git → $home"
  git clone --depth 1 --branch "${METERED_REF:-main}" "https://github.com/${repo}.git" "$home"
  printf '%s\n' "$home"
}

print_next() {
  say ""
  say "step 2 — run an eval:"
  say "  curl -fsSL https://raw.githubusercontent.com/${METERED_REPO:-$DEFAULT_REPO}/main/cli/run.sh | bash -s -- \\"
  say "    --harness <name> --effort high --model-name \"…\" --list-input 3 --list-output 15"
  say "or, from this repo:"
  say "  $NEXT_RUN"
}

FORCE=0
if [[ "${METERED_FORCE:-}" == "1" ]]; then
  FORCE=1
fi
REPO_ARG=""
for arg in "$@"; do
  case "$arg" in
    -h|--help|help)
      print_help
      exit 0
      ;;
    --force)
      FORCE=1
      ;;
    -*)
      die "unknown flag $arg — next: bash cli/get.sh --help"
      ;;
    *)
      if [[ -n "$REPO_ARG" ]]; then
        die "unexpected argument $arg — next: bash cli/get.sh --help"
      fi
      REPO_ARG="$arg"
      ;;
  esac
done

DEST="${METERED_YAML:-$PWD/metered-eval.yaml}"

if [[ -f "$DEST" && "$FORCE" -eq 0 ]]; then
  say "yaml          $DEST"
  say "already exists."
  say "overwrite: bash cli/get.sh --force"
  say "       or: METERED_FORCE=1 bash cli/get.sh"
  print_next
  exit 0
fi

need node
ROOT=$(resolve_root "$REPO_ARG")
say "metered root  $ROOT"
say "yaml          $DEST"

if [[ ! -d "$ROOT/node_modules" ]]; then
  need npm
  say "npm install (first time)"
  (cd "$ROOT" && npm install)
fi

args=(init --out "$DEST" --examples)
if [[ "$FORCE" -eq 1 ]]; then
  args+=(--force)
fi
(cd "$ROOT" && npx tsx cli/metered-eval.ts "${args[@]}")
print_next
