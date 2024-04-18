import { RRegex } from '../lib/esm.mjs'

const file = await Deno.readFile('./test/__data__/input-text.txt', 'utf8');
let data = new TextDecoder("utf-8").decode(file)
data = data.slice(0, data.length / 10);

Deno.bench('RegExp', {group: 'email' }, () => data.match('[\\w.+-]+@[\\w.-]+\\.[\\w.-]+'))
Deno.bench('RRegex', {group: 'email' }, () => new RRegex("[\\w\\.+-]+@[\\w\\.-]+\\.[\\w\\.-]+").find(data))

Deno.bench('RegExp', {group: 'ip' }, () => data.match('(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])'))
Deno.bench('RRegex', {group: 'ip' }, () => new RRegex("(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])").find(data))

Deno.bench('RegExp', {group: 'uri' }, () => data.match('[\\w]+:\\/\\/[^\\/\\s?#]+[^\\s?#]+(?:\\?[^\\s#]*)?(?:#[^\\s]*)?'))
Deno.bench('RRegex', {group: 'uri' }, () => new RRegex("[\\w]+://[^/\\s?#]+[^\\s?#]+(?:\\?[^\\s#]*)?(?:#[^\\s]*)?").find(data))
