/** Suite repo users clone. Override with NEXT_PUBLIC_SUITE_REPO for a fork. */
export const SUITE_GITHUB_REPO =
  process.env.NEXT_PUBLIC_SUITE_REPO ?? "danecwalker/metered-suite";

export function evalBootstrap(repo = SUITE_GITHUB_REPO) {
  const clone = `git clone https://github.com/${repo}.git\ncd metered-suite`;
  const init = "python3 -m metered_suite init";
  const run =
    "python3 -m metered_suite <harness> --model <sku> --effort max\n# Docker required. Harness names come from harness.yaml";
  return {
    repo,
    clone,
    init,
    run,
    initRemote: clone,
    runRemote: run,
    cloneBlock: clone,
    initBlock: `${clone}\n${init}`,
    runBlock: run,
  };
}
