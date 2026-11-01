// Creates or updates a report comment on a PR (one comment per marker, kept up
// to date). Used by actions/github-script from the `benchmark` workflow (PRs
// from this repository) and from the `benchmark comment` workflow (PRs from
// forks and dependabot).
const fs = require('node:fs');

const MAX_BODY = 65536;

/**
 * @param {object} options
 * @param {import('@octokit/rest').Octokit} options.github
 * @param {object} options.context
 * @param {object} options.core
 * @param {string} options.marker HTML comment that identifies the comment
 * @param {string} options.title heading of the failure message
 * @param {number} options.pr PR number
 * @param {string} options.sha head commit of the PR
 * @param {string} options.runUrl URL of the workflow run
 * @param {boolean} options.success whether the job that wrote the report succeeded
 * @param {string} [options.reportPath] Markdown report (required on success)
 * @param {boolean} [options.create] false: only update an existing comment
 */
module.exports = async ({
  github,
  context,
  core,
  marker,
  title,
  pr,
  sha,
  runUrl,
  success,
  reportPath,
  create = true,
}) => {
  const { owner, repo } = context.repo;
  const short = sha.slice(0, 7);

  let report = success
    ? fs.readFileSync(reportPath, 'utf8')
    : [
        `## ${title}`,
        '',
        '> [!CAUTION]',
        `> The check failed for \`${short}\`. See the [workflow run](${runUrl}).`,
      ].join('\n');

  const footer = `\n\n<sub>[Workflow run](${runUrl}) · updated for \`${short}\`</sub>`;
  const limit = MAX_BODY - marker.length - footer.length - 1;
  if (report.length > limit) report = report.slice(0, limit - 20) + '\n\n…(truncated)';
  const body = `${marker}\n${report}${footer}`;

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pr,
    per_page: 100,
  });
  const existing = comments.find(
    (c) => c.user?.login === 'github-actions[bot]' && c.body?.startsWith(marker),
  );

  if (existing) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
    core.info(`Updated comment ${existing.html_url}`);
  } else if (create) {
    const { data } = await github.rest.issues.createComment({ owner, repo, issue_number: pr, body });
    core.info(`Created comment ${data.html_url}`);
  } else {
    core.info('Nothing to report and no comment to update, skipping.');
  }
};
