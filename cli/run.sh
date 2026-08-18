#!/usr/bin/env bash
# Step 2 — run the official suite with the yaml from step 1.
#
#   bash cli/run.sh --help
#   bash cli/run.sh --harness claude --effort high --model-name "Claude Sonnet" --list-input 3 --list-output 15
#
#   curl -fsSL https://raw.githubusercontent.com/danecwalker/metered/main/cli/run.sh | bash -s -- \
#         --harness claude --effort high --model-name "Claude Sonnet" --list-input 3 --list-output 15
set -euo pipefail

DEFAULT_REPO="danecwalker/metered"

say() { printf '%s\n' "$*" >&2; }
die() { say "run.sh: $*"; exit 1; }

EXAMPLE='bash cli/run.sh --harness claude --effort high --model-name "Claude Sonnet" --list-input 3 --list-output 15'
EFFORT_LEVELS='none | low | medium | high | xhigh | max | default'

print_help() {
  printf '%s\n' \
    "run.sh — step 2: run the official suite." \
    "" \
    "Required:" \
    "  --model-name <name>    display name" \
    "  --list-input <n>       \$/M input" \
    "" \
    "Accepted:" \
    "  --effort <level>       ${EFFORT_LEVELS}" \
    "  --harness <name>       key from metered-eval.yaml" \
    "  --list-output <n>      \$/M output" \
    "  --model-id <id>        substituted as {model}" \
    "" \
    "Example:" \
    "  ${EXAMPLE}" \
    "" \
    "If metered-eval.yaml is missing (step 1):" \
    "  bash cli/get.sh" \
    "" \
    "exit 0  sealed package written / help" \
    "exit 1  usage or runtime error"
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
  local repo="${METERED_REPO:-$DEFAULT_REPO}"
  need_git() { command -v git >/dev/null 2>&1 || die "need git on PATH"; }
  need_git
  say "cloning https://github.com/${repo}.git → $home"
  git clone --depth 1 --branch "${METERED_REF:-main}" "https://github.com/${repo}.git" "$home"
  printf '%s\n' "$home"
}

want_help=0
have_model_name=0
have_list_input=0
prev=""
for arg in "$@"; do
  case "$arg" in
    -h|--help|help) want_help=1 ;;
  esac
  if [[ "$prev" == "--model-name" && "$arg" != --* && -n "$arg" ]]; then
    have_model_name=1
  fi
  if [[ "$prev" == "--list-input" && "$arg" != --* && -n "$arg" ]]; then
    have_list_input=1
  fi
  prev="$arg"
done

if [[ "$want_help" -eq 1 ]]; then
  print_help
  exit 0
fi

HERE=$PWD
YAML="${METERED_YAML:-$HERE/metered-eval.yaml}"

if [[ "$have_model_name" -eq 0 ]]; then
  missing=(--model-name)
  say "run.sh: missing ${missing[*]}"
  say "example:"
  say "  $EXAMPLE"
  if [[ ! -f "$YAML" ]]; then
    say "no $YAML — first: bash cli/get.sh"
  fi
  exit 1
fi

command -v node >/dev/null 2>&1 || die "need node on PATH"
ROOT=$(resolve_root)
[[ -f "$YAML" ]] || die "no $YAML — next: bash cli/get.sh"

if [[ ! -d "$ROOT/node_modules" ]]; then
  command -v npm >/dev/null 2>&1 || die "need npm on PATH"
  (cd "$ROOT" && npm install)
fi

has_out=0
for arg in "$@"; do
  if [[ "$arg" == "--out" ]]; then
    has_out=1
    break
  fi
done

args=(run --config "$YAML")
if [[ "$has_out" -eq 0 ]]; then
  args+=(--out "$HERE")
fi
args+=("$@")

(cd "$ROOT" && npx tsx cli/metered-eval.ts "${args[@]}")
