#!/usr/bin/env node
// Compares the public API of two rregex builds: the type declarations in
// lib/ (*.d.ts, *.d.mts, *.d.cts) and the entry points of package.json
// (`exports`, `main`, `module`, `types`, `browser`). Writes a Markdown report
// with one diff for each change; files with the same change share one diff.
//
// Usage:
//   node bin/api-diff.mjs --base <lib dir> --head <lib dir> \
//     [--base-package <package.json>] [--head-package <package.json>] \
//     [--base-label <text>] [--head-label <text>] \
//     [--markdown <file>] [--json <file>]
//
// The JSON file has `changed: true` when the API changed. Needs `git`.

import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    base: { type: 'string' },
    head: { type: 'string' },
    'base-package': { type: 'string' },
    'head-package': { type: 'string' },
    'base-label': { type: 'string', default: 'base' },
    'head-label': { type: 'string', default: 'head' },
    markdown: { type: 'string' },
    json: { type: 'string' },
  },
});

if (!args.base || !args.head) {
  console.error('Usage: api-diff.mjs --base <lib dir> --head <lib dir> [options]');
  process.exit(2);
}

// the comment limit of GitHub is 65536 chars, keep room for the footer
const MAX_MARKDOWN = 60000;
const ENTRY_FIELDS = ['main', 'module', 'types', 'browser', 'exports'];
const DTS = /\.d\.[cm]?ts$/;

/** Unified diff of two files (null: the file does not exist), without the headers. */
function diff(base, head) {
  const { status, stdout, stderr } = spawnSync(
    'git',
    ['diff', '--no-index', '--no-color', '--unified=3', '--', base ?? '/dev/null', head ?? '/dev/null'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  // 0: same content, 1: different, anything else: git failed
  if (status !== 0 && status !== 1) throw new Error(`git diff failed (${status}): ${stderr}`);
  const lines = stdout.split('\n');
  const start = lines.findIndex((line) => line.startsWith('@@'));
  return start === -1 ? '' : lines.slice(start).join('\n').trimEnd();
}

const listDts = async (dir) => (await readdir(dir)).filter((name) => DTS.test(name));

const dirs = { base: resolve(args.base), head: resolve(args.head) };
const names = {
  base: new Set(await listDts(dirs.base)),
  head: new Set(await listDts(dirs.head)),
};
const all = [...new Set([...names.base, ...names.head])].sort();

/**
 * Changes, grouped by identical diff: { files, status, diff }. The line
 * numbers of the hunks do not count, as the entry points have the same
 * declarations at different lines. A removed file keeps no diff: its content
 * is the base, not a change to review.
 */
const groups = new Map();
const add = (file, status, body) => {
  const key = `${status}\n${body.replace(/^@@ [^@]+ @@/gm, '@@')}`;
  if (!groups.has(key)) groups.set(key, { files: [], status, diff: body });
  groups.get(key).files.push(file);
};

for (const name of all) {
  const base = names.base.has(name) ? join(dirs.base, name) : null;
  const head = names.head.has(name) ? join(dirs.head, name) : null;
  if (!head) {
    add(name, 'removed', '');
    continue;
  }
  const body = diff(base, head);
  if (body) add(name, base ? 'modified' : 'added', body);
}

// the entry points of package.json, as formatted JSON
if (args['base-package'] && args['head-package']) {
  const tmp = await mkdtemp(join(tmpdir(), 'rregex-api-'));
  try {
    const entries = async (file) => {
      const pkg = JSON.parse(await readFile(file, 'utf8'));
      return JSON.stringify(Object.fromEntries(ENTRY_FIELDS.map((key) => [key, pkg[key]])), null, 2) + '\n';
    };
    const base = join(tmp, 'base.json');
    const head = join(tmp, 'head.json');
    await writeFile(base, await entries(args['base-package']));
    await writeFile(head, await entries(args['head-package']));
    const body = diff(base, head);
    if (body) add('package.json', 'modified', body);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

const changes = [...groups.values()];

// ----- report -----

/** A code fence longer than any run of backticks in the text (JSDoc has ``` examples). */
const fence = (text) => '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map(([m]) => m.length + 1)));
const count = (body, sign) => body.split('\n').filter((line) => line.startsWith(sign)).length;
const files = (list) => list.map((file) => `\`${file}\``).join(', ');
const verb = { added: 'New file', removed: 'Removed file', modified: 'Changed' };

const lines = ['## 🧩 Public API changes', ''];
lines.push(
  `Comparing the type declarations and the \`package.json\` entry points of **head** ${args['head-label']} ` +
    `against **base** ${args['base-label']}.`,
  '',
);

if (!changes.length) {
  lines.push('> [!NOTE]', '> No changes in the public API.');
} else {
  const total = changes.reduce((sum, change) => sum + change.files.length, 0);
  lines.push(
    '> [!IMPORTANT]',
    `> The public API changes in **${total} file(s)**. In the diffs, lines that start with ` +
      '`+` are added and lines that start with `-` are removed.',
    '',
  );

  const truncated = [];
  for (const change of changes) {
    if (change.status === 'removed') {
      lines.push(`### ${verb.removed}: ${files(change.files)}`, '');
      continue;
    }
    const added = count(change.diff, '+');
    const removed = count(change.diff, '-');
    const ticks = fence(change.diff);
    const block = [
      `### ${verb[change.status]}: ${files(change.files)}`,
      '',
      `<sub>${added} line(s) added (+), ${removed} line(s) removed (-)` +
        (change.files.length > 1 ? `; line numbers of \`${change.files[0]}\`` : '') +
        '</sub>',
      '',
      `${ticks}diff`,
      change.diff,
      ticks,
      '',
    ];
    const size = block.reduce((sum, line) => sum + line.length + 1, 0);
    if (lines.join('\n').length + size > MAX_MARKDOWN) {
      truncated.push(...change.files);
      continue;
    }
    lines.push(...block);
  }
  if (truncated.length) {
    lines.push(
      '> [!WARNING]',
      `> The diffs of ${files(truncated)} are too long for this comment. ` +
        'The `api.json` file of the `api` artifact of the workflow run has all the diffs.',
      '',
    );
  }
}

const markdown = lines.join('\n').trimEnd() + '\n';
const json = { changed: changes.length > 0, changes };

if (args.markdown) await writeFile(args.markdown, markdown);
if (args.json) await writeFile(args.json, JSON.stringify(json, null, 2) + '\n');
if (!args.markdown) process.stdout.write(markdown);

if (process.env.GITHUB_ACTIONS && changes.length) {
  for (const change of changes) {
    console.log(`::notice title=Public API change::${verb[change.status]}: ${change.files.join(', ')}`);
  }
}
