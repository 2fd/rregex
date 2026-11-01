// Creates or updates the benchmark comment on a PR. Used by actions/github-script
// from the `benchmark` workflow (PRs from this repository) and from the
// `benchmark comment` workflow (PRs from forks and dependabot).
const fs = require('node:fs');

const MARKER = '<!-- rregex-benchmark -->';
const MAX_BODY = 65536;

/**
 * @param {object} options
 * @param {import('@octokit/rest').Octokit} options.github
 * @param {object} options.context
 * @param {object} options.core
 * @param {number} options.pr PR number
 * @param {string} options.sha head commit of the PR
 * @param {string} options.runUrl URL of the benchmark run
 * @param {boolean} options.success whether the benchmark run succeeded
 * @param {string} [options.reportPath] Markdown report (required on success)
 */
module.exports = async ({ github, context, core, pr, sha, runUrl, success, reportPath }) => {
  const { owner, repo } = context.repo;
  const short = sha.slice(0, 7);

  let report = success
    ? fs.readFileSync(reportPath, 'utf8')
    : [
        '## ⏱️ Benchmark results',
        '',
        '> [!CAUTION]',
        `> The benchmark failed for \`${short}\`. See the [workflow run](${runUrl}).`,
      ].join('\n');

  const footer = `\n\n<sub>[Workflow run](${runUrl}) · updated for \`${short}\`</sub>`;
  const limit = MAX_BODY - MARKER.length - footer.length - 1;
  if (report.length > limit) report = report.slice(0, limit - 20) + '\n\n…(truncated)';
  const body = `${MARKER}\n${report}${footer}`;

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pr,
    per_page: 100,
  });
  const existing = comments.find(
    (c) => c.user?.login === 'github-actions[bot]' && c.body?.startsWith(MARKER),
  );

  if (existing) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
    core.info(`Updated comment ${existing.html_url}`);
  } else {
    const { data } = await github.rest.issues.createComment({ owner, repo, issue_number: pr, body });
    core.info(`Created comment ${data.html_url}`);
  }
};
