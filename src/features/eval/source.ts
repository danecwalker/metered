/** owner/name. Override with NEXT_PUBLIC_GITHUB_REPO for a fork. */
export const EVAL_GITHUB_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO ?? "danecwalker/metered";

export function evalBootstrap(repo = EVAL_GITHUB_REPO) {
  const localInit = "bash cli/get.sh";
  const localRun =
    'bash cli/run.sh --harness claude --effort high --model-name "Claude Sonnet" --model-id claude-sonnet-4-6 --list-input 3 --list-output 15';
  const raw = `https://raw.githubusercontent.com/${repo}/main/cli`;
  const initRemote = `curl -fsSL ${raw}/get.sh | bash`;
  const runRemote = `curl -fsSL ${raw}/run.sh | bash -s -- --harness claude --effort high --model-name "Claude Sonnet" --model-id claude-sonnet-4-6 --list-input 3 --list-output 15`;
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
