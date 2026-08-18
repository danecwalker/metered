/** Suite repo users clone. Override with NEXT_PUBLIC_SUITE_REPO for a fork. */
export const SUITE_GITHUB_REPO =
  process.env.NEXT_PUBLIC_SUITE_REPO ?? "danecwalker/metered-suite";

export function evalBootstrap(repo = SUITE_GITHUB_REPO) {
  const clone = `git clone https://github.com/${repo}.git\ncd metered-suite`;
  const run = "python3 -m metered_suite   # Docker required";
  return {
    repo,
    init: clone,
    run,
    initRemote: clone,
    runRemote: run,
    initBlock: `${clone}\n# edit main.py: harness, model, effort, flags`,
    runBlock: run,
  };
}
