/** owner/name, e.g. acme/metered. Used only for the curl | bash copy. */
export const EVAL_GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "";

export function evalBootstrap(repo = EVAL_GITHUB_REPO) {
  const localInit = "bash cli/get.sh";
  const localRun =
    'bash cli/run.sh --harness claude --effort high --model-name "Claude Sonnet" --model-id claude-sonnet-4-6 --list-input 3 --list-output 15';
  if (!repo) {
    return {
      repo: "",
      init: localInit,
      run: localRun,
      initRemote: "",
      runRemote: "",
      initBlock: `${localInit}\n# after this repo is on GitHub:\n# curl -fsSL https://raw.githubusercontent.com/OWNER/metered/main/cli/get.sh \\\n#   | METERED_REPO=OWNER/metered bash`,
      runBlock: `${localRun}\n# or:\n# curl -fsSL https://raw.githubusercontent.com/OWNER/metered/main/cli/run.sh \\\n#   | METERED_REPO=OWNER/metered bash -s -- --harness claude --effort high \\\n#     --model-name "Claude Sonnet" --list-input 3 --list-output 15`,
    };
  }
  const raw = `https://raw.githubusercontent.com/${repo}/main/cli`;
  const initRemote = `curl -fsSL ${raw}/get.sh | METERED_REPO=${repo} bash`;
  const runRemote = `curl -fsSL ${raw}/run.sh | METERED_REPO=${repo} bash -s -- --harness claude --effort high --model-name "Claude Sonnet" --model-id claude-sonnet-4-6 --list-input 3 --list-output 15`;
  return {
    repo,
    init: localInit,
    run: localRun,
    initRemote,
    runRemote,
    initBlock: `${initRemote}\n# or, in a checkout:\n${localInit}`,
    runBlock: runRemote,
  };
}
