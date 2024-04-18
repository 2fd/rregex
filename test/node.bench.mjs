import { Bench } from 'tinybench';
import { RRegex } from '../lib/esm.mjs'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'

let data = await readFile(resolve(process.cwd(), './test/__data__/input-text.txt'), 'utf8');
data = data.slice(0, data.length / 10);
const email = new Bench({ time: 1000 });

email
  .add('RegExp: email', () => data.match('[\\w.+-]+@[\\w.-]+\\.[\\w.-]+'))
  .add('RRegex: email', () => new RRegex("[\\w\\.+-]+@[\\w\\.-]+\\.[\\w\\.-]+").find(data))

await email.warmup(); // make results more reliable, ref: https://github.com/tinylibs/tinybench/pull/50
await email.run();

const ip = new Bench({ time: 1000 });

ip
  .add('RegExp: IP', () => data.match('(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])'))
  .add('RRegex: IP', () => new RRegex("(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])").find(data))

await ip.warmup(); // make results more reliable, ref: https://github.com/tinylibs/tinybench/pull/50
await ip.run();

const uri = new Bench({ time: 1000 });

uri
  .add('RegExp: URI', () => data.match('[\\w]+:\\/\\/[^\\/\\s?#]+[^\\s?#]+(?:\\?[^\\s#]*)?(?:#[^\\s]*)?'))
  .add('RRegex: URI', () => new RRegex("[\\w]+://[^/\\s?#]+[^\\s?#]+(?:\\?[^\\s#]*)?(?:#[^\\s]*)?").find(data))

await uri.warmup(); // make results more reliable, ref: https://github.com/tinylibs/tinybench/pull/50
await uri.run();

console.log('');
console.log('Email benchmark: ');
console.table(email.table(), [ 'Task Name', 'ops/sec', 'Margin', 'Samples' ]);

console.log('');
console.log('IP benchmark: ');
console.table(ip.table(), [ 'Task Name', 'ops/sec', 'Margin', 'Samples' ]);

console.log('');
console.log('URI benchmark: ');
console.table(uri.table(), [ 'Task Name', 'ops/sec', 'Margin', 'Samples' ]);
console.log('');