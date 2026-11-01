import { deepEqual, throws } from 'node:assert';
import { RRegex, RRegexSet } from 'rregex/lib/cf';

export const r_regex_to_string = {
	test: () => {
		deepEqual(new RRegex('a').toString(), 'a');
	},
};

export const r_regex_is_match = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.isMatch('abc'), true);
		deepEqual(regex.isMatch('def'), false);

		const text = 'I categorically deny having triskaidekaphobia.';
		const re = new RRegex('\\b\\w{13}\\b');
		deepEqual(re.isMatch(text), true);
	},
};

export const r_regex_is_match_at = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.isMatchAt('ab', 0), true);
		deepEqual(regex.isMatchAt('ab', 1), false);
		deepEqual(regex.isMatchAt('ab', 1), false);
		deepEqual(regex.isMatchAt('ab', 100), false);
		deepEqual(regex.isMatchAt('aba', 0), true);
		deepEqual(regex.isMatchAt('aba', 1), true);
		deepEqual(regex.isMatchAt('aba', 2), true);
		deepEqual(regex.isMatchAt('aba', 3), false);
		deepEqual(regex.isMatchAt('aba', 100), false);
		deepEqual(regex.isMatchAt('def', 0), false);

		const text = 'I categorically deny having triskaidekaphobia.';
		const re = new RRegex('\\b\\w{13}\\b');
		deepEqual(re.isMatchAt(text, 1), true);
		deepEqual(re.isMatchAt(text, 5), false);
	},
};

export const r_regex_find = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.find('abc'), { value: 'a', start: 0, end: 1 });
		deepEqual(regex.find('def'), undefined);

		const text = 'I categorically deny having triskaidekaphobia.';
		const re = new RRegex('\\b\\w{13}\\b');
		deepEqual(re.find(text), {
			value: 'categorically',
			start: 2,
			end: 15,
		});
	},
};

export const r_regex_find_at = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.find('abc'), { value: 'a', start: 0, end: 1 });
		deepEqual(regex.findAt('abc', 1), undefined);
		deepEqual(regex.findAt('abc', 100), undefined);
		deepEqual(regex.find('def'), undefined);

		const text = 'I categorically deny having triskaidekaphobia.';
		const re = new RRegex('\\b\\w{13}\\b');
		deepEqual(re.findAt(text, 1), {
			value: 'categorically',
			start: 2,
			end: 15,
		});

		deepEqual(re.findAt(text, 5), undefined);
	},
};

export const r_regex_find_all = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.findAll('abcabcabc'), [
			{ value: 'a', start: 0, end: 1 },
			{ value: 'a', start: 3, end: 4 },
			{ value: 'a', start: 6, end: 7 },
		]);
		deepEqual(regex.findAll('def'), []);

		const text = 'Retroactively relinquishing remunerations is reprehensible.';
		const re = new RRegex('\\b\\w{13}\\b');
		deepEqual(re.findAll(text), [
			{
				end: 13,
				start: 0,
				value: 'Retroactively',
			},
			{
				end: 27,
				start: 14,
				value: 'relinquishing',
			},
			{
				end: 41,
				start: 28,
				value: 'remunerations',
			},
			{
				end: 58,
				start: 45,
				value: 'reprehensible',
			},
		]);
	},
};

export const r_regex_captures_length = {
	test: () => {
		const re1 = new RRegex('(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})');
		deepEqual(re1.capturesLength(), 4);

		const re2 = new RRegex('foo');
		deepEqual(re2.capturesLength(), 1);

		const re3 = new RRegex('(foo)');
		deepEqual(re3.capturesLength(), 2);

		const re4 = new RRegex('(?<a>.(?<b>.))(.)(?:.)(?<c>.)');
		deepEqual(re4.capturesLength(), 5);
	},
};

export const r_regex_capture_names = {
	test: () => {
		const regex = new RRegex('(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})');
		deepEqual(regex.captureNames(), [null, 'y', 'm', 'd']);
	},
};

export const r_regex_captures = {
	test: () => {
		const regex = new RRegex('(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})');
		deepEqual(regex.captures(''), undefined);
		deepEqual(regex.captures('2012-03-14'), {
			get: [
				{ value: '2012-03-14', start: 0, end: 10 },
				{ value: '2012', start: 0, end: 4 },
				{ value: '03', start: 5, end: 7 },
				{ value: '14', start: 8, end: 10 },
			],
			name: {
				y: { value: '2012', start: 0, end: 4 },
				m: { value: '03', start: 5, end: 7 },
				d: { value: '14', start: 8, end: 10 },
			},
		});
	},
};

export const r_regex_captures_all = {
	test: () => {
		const regex = new RRegex('(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})');
		deepEqual(regex.capturesAll(''), []);
		deepEqual(regex.capturesAll('2012-03-14'), [
			{
				get: [
					{ value: '2012-03-14', start: 0, end: 10 },
					{ value: '2012', start: 0, end: 4 },
					{ value: '03', start: 5, end: 7 },
					{ value: '14', start: 8, end: 10 },
				],
				name: {
					y: { value: '2012', start: 0, end: 4 },
					m: { value: '03', start: 5, end: 7 },
					d: { value: '14', start: 8, end: 10 },
				},
			},
		]);

		deepEqual(regex.capturesAll('2012-03-14, 2013-01-01 and 2014-07-05'), [
			{
				get: [
					{ value: '2012-03-14', start: 0, end: 10 },
					{ value: '2012', start: 0, end: 4 },
					{ value: '03', start: 5, end: 7 },
					{ value: '14', start: 8, end: 10 },
				],
				name: {
					y: { value: '2012', start: 0, end: 4 },
					m: { value: '03', start: 5, end: 7 },
					d: { value: '14', start: 8, end: 10 },
				},
			},
			{
				get: [
					{ value: '2013-01-01', start: 12, end: 22 },
					{ value: '2013', start: 12, end: 16 },
					{ value: '01', start: 17, end: 19 },
					{ value: '01', start: 20, end: 22 },
				],
				name: {
					y: { value: '2013', start: 12, end: 16 },
					m: { value: '01', start: 17, end: 19 },
					d: { value: '01', start: 20, end: 22 },
				},
			},
			{
				get: [
					{ value: '2014-07-05', start: 27, end: 37 },
					{ value: '2014', start: 27, end: 31 },
					{ value: '07', start: 32, end: 34 },
					{ value: '05', start: 35, end: 37 },
				],
				name: {
					y: { value: '2014', start: 27, end: 31 },
					m: { value: '07', start: 32, end: 34 },
					d: { value: '05', start: 35, end: 37 },
				},
			},
		]);
	},
};

export const r_regex_replace = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.replace('abcabcabc', 'z'), 'zbcabcabc');
		deepEqual(regex.replace('defdefdef', 'z'), 'defdefdef');

		{
			const re = new RRegex('[^01]+');
			deepEqual(re.replace('1078910', ''), '1010');
		}

		{
			const re = new RRegex('(?P<last>[^,\\s]+),\\s+(?P<first>\\S+)');
			const result = re.replace('Springsteen, Bruce', '$first $last');
			deepEqual(result, 'Bruce Springsteen');
		}

		{
			const re = new RRegex('(?P<first>\\w+)\\s+(?P<second>\\w+)');
			const result = re.replace('deep fried', '${first}_$second');
			deepEqual(result, 'deep_fried');
		}
	},
};

export const r_regex_replace_all = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.replaceAll('abcabcabc', 'z'), 'zbczbczbc');
		deepEqual(regex.replaceAll('defdefdef', 'z'), 'defdefdef');
	},
};

export const r_regex_replacen = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.replacen('abcabcabc', 2, 'z'), 'zbczbcabc');
		deepEqual(regex.replacen('defdefdef', 2, 'z'), 'defdefdef');
	},
};

export const r_regex_split = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.split('abcabcabc'), ['', 'bc', 'bc', 'bc']);
		deepEqual(regex.split('defdefdef'), ['defdefdef']);

		const re = new RRegex('[ \\t]+');
		const fields = re.split('a b \t  c\td    e');
		deepEqual(fields, ['a', 'b', 'c', 'd', 'e']);
	},
};

export const r_regex_splitn = {
	test: () => {
		const regex = new RRegex(',');
		deepEqual(regex.splitn('a,b,c', 0), []);
		deepEqual(regex.splitn('a,b,c', 1), ['a,b,c']);
		deepEqual(regex.splitn('a,b,c', 2), ['a', 'b,c']);
		deepEqual(regex.splitn('a,b,c', 3), ['a', 'b', 'c']);
		deepEqual(regex.splitn('a,b,c', 4), ['a', 'b', 'c']);
		deepEqual(regex.splitn('a,b,c', 5), ['a', 'b', 'c']);
		deepEqual(regex.splitn('abc', 0), []);
		deepEqual(regex.splitn('abc', 1), ['abc']);
		deepEqual(regex.splitn('abc', 2), ['abc']);
		deepEqual(regex.splitn('abc', 3), ['abc']);

		const re = new RRegex('\\W+');
		const fields = re.splitn('Hey! How are you?', 3);
		deepEqual(fields, ['Hey', 'How', 'are you?']);
	},
};

export const r_regex_shortest_match = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.shortestMatch('abcabcabc'), 1);
		deepEqual(regex.shortestMatch('bcabcabc'), 3);
		deepEqual(regex.shortestMatch('cabcabc'), 2);
		deepEqual(regex.shortestMatch('defdefdef'), undefined);

		const text = 'aaaaa';
		const pos = new RRegex('a+');
		deepEqual(pos.shortestMatch(text), 1);
	},
};

export const r_regex_shortest_match_at = {
	test: () => {
		const regex = new RRegex('a');
		deepEqual(regex.shortestMatchAt('abcabca', 0), 1);
		deepEqual(regex.shortestMatchAt('abcabca', 1), 4);
		deepEqual(regex.shortestMatchAt('abcabca', 2), 4);
		deepEqual(regex.shortestMatchAt('abcabca', 3), 4);
		deepEqual(regex.shortestMatchAt('abcabca', 4), 7);
		deepEqual(regex.shortestMatchAt('abcabca', 5), 7);
		deepEqual(regex.shortestMatchAt('abcabca', 6), 7);
		deepEqual(regex.shortestMatchAt('abcabca', 7), undefined);
		deepEqual(regex.shortestMatchAt('abcabca', 100), undefined);
		deepEqual(regex.shortestMatchAt('defdefdef', 0), undefined);
		deepEqual(regex.shortestMatchAt('defdefdef', 1), undefined);
		deepEqual(regex.shortestMatchAt('defdefdef', 2), undefined);
	},
};

export const regex_syntax_hir_empty = {
	test: () => {
		const regex = new RRegex('');
		deepEqual(regex.syntax(), {
			'@name': 'regex_syntax::hir::Hir',
			'@type': 'struct',
			kind: {
				'@name': 'regex_syntax::hir::HirKind',
				'@type': 'enum',
				'@variant': 'Empty',
			},
		});
	},
};

export const regex_syntax_hir_literal = {
	test: () => {
		const regex = new RRegex('abc');
		deepEqual(regex.syntax(), {
			'@name': 'regex_syntax::hir::Hir',
			'@type': 'struct',
			kind: {
				'@name': 'regex_syntax::hir::HirKind',
				'@type': 'enum',
				'@variant': 'Literal',
				'@values': [
					{
						'@name': 'regex_syntax::hir::Literal',
						'@type': 'struct',
						'@values': [new Uint8Array(['a'.charCodeAt(0), 'b'.charCodeAt(0), 'c'.charCodeAt(0)])],
					},
				],
			},
		});
	},
};

export const regex_syntax_hir_class = {
	test: () => {
		const unicode = new RRegex('\\d');
		deepEqual(unicode.syntax(), {
			'@name': 'regex_syntax::hir::Hir',
			'@type': 'struct',
			kind: {
				'@name': 'regex_syntax::hir::HirKind',
				'@type': 'enum',
				'@values': [
					{
						'@name': 'regex_syntax::hir::Class',
						'@type': 'enum',
						'@values': [
							{
								'@name': 'regex_syntax::hir::ClassUnicode',
								'@type': 'struct',
								ranges: [
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '9',
										len: 10,
										start: '0',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '٩',
										len: 10,
										start: '٠',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '۹',
										len: 10,
										start: '۰',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '߉',
										len: 10,
										start: '߀',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '९',
										len: 10,
										start: '०',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '৯',
										len: 10,
										start: '০',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '੯',
										len: 10,
										start: '੦',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '૯',
										len: 10,
										start: '૦',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '୯',
										len: 10,
										start: '୦',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '௯',
										len: 10,
										start: '௦',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '౯',
										len: 10,
										start: '౦',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '೯',
										len: 10,
										start: '೦',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '൯',
										len: 10,
										start: '൦',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '෯',
										len: 10,
										start: '෦',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '๙',
										len: 10,
										start: '๐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '໙',
										len: 10,
										start: '໐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '༩',
										len: 10,
										start: '༠',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '၉',
										len: 10,
										start: '၀',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '႙',
										len: 10,
										start: '႐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '៩',
										len: 10,
										start: '០',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '᠙',
										len: 10,
										start: '᠐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '᥏',
										len: 10,
										start: '᥆',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '᧙',
										len: 10,
										start: '᧐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '᪉',
										len: 10,
										start: '᪀',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '᪙',
										len: 10,
										start: '᪐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '᭙',
										len: 10,
										start: '᭐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '᮹',
										len: 10,
										start: '᮰',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '᱉',
										len: 10,
										start: '᱀',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '᱙',
										len: 10,
										start: '᱐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '꘩',
										len: 10,
										start: '꘠',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '꣙',
										len: 10,
										start: '꣐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '꤉',
										len: 10,
										start: '꤀',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '꧙',
										len: 10,
										start: '꧐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '꧹',
										len: 10,
										start: '꧰',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '꩙',
										len: 10,
										start: '꩐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '꯹',
										len: 10,
										start: '꯰',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '９',
										len: 10,
										start: '０',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𐒩',
										len: 10,
										start: '𐒠',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𐴹',
										len: 10,
										start: '𐴰',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑁯',
										len: 10,
										start: '𑁦',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑃹',
										len: 10,
										start: '𑃰',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑄿',
										len: 10,
										start: '𑄶',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑇙',
										len: 10,
										start: '𑇐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑋹',
										len: 10,
										start: '𑋰',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑑙',
										len: 10,
										start: '𑑐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑓙',
										len: 10,
										start: '𑓐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑙙',
										len: 10,
										start: '𑙐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑛉',
										len: 10,
										start: '𑛀',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑜹',
										len: 10,
										start: '𑜰',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑣩',
										len: 10,
										start: '𑣠',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑥙',
										len: 10,
										start: '𑥐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑱙',
										len: 10,
										start: '𑱐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑵙',
										len: 10,
										start: '𑵐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑶩',
										len: 10,
										start: '𑶠',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𑽙',
										len: 10,
										start: '𑽐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𖩩',
										len: 10,
										start: '𖩠',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𖫉',
										len: 10,
										start: '𖫀',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𖭙',
										len: 10,
										start: '𖭐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𝟿',
										len: 50,
										start: '𝟎',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𞅉',
										len: 10,
										start: '𞅀',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𞋹',
										len: 10,
										start: '𞋰',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𞓹',
										len: 10,
										start: '𞓰',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '𞥙',
										len: 10,
										start: '𞥐',
									},
									{
										'@name': 'regex_syntax::hir::ClassUnicodeRange',
										'@type': 'struct',
										end: '🯹',
										len: 10,
										start: '🯰',
									},
								],
							},
						],
						'@variant': 'Unicode',
					},
				],
				'@variant': 'Class',
			},
		});

		const bytes = new RRegex('(?-u)\\d');
		deepEqual(bytes.syntax(), {
			'@name': 'regex_syntax::hir::Hir',
			'@type': 'struct',
			kind: {
				'@name': 'regex_syntax::hir::HirKind',
				'@type': 'enum',
				'@variant': 'Class',
				'@values': [
					{
						'@name': 'regex_syntax::hir::Class',
						'@type': 'enum',
						'@variant': 'Bytes',
						'@values': [
							{
								'@name': 'regex_syntax::hir::ClassBytes',
								'@type': 'struct',
								ranges: [
									{
										'@name': 'regex_syntax::hir::ClassBytesRange',
										'@type': 'struct',
										start: 48,
										end: 57,
										len: 10,
									},
								],
							},
						],
					},
				],
			},
		});
	},
};

export const regex_syntax_hir_look = {
	test: () => {
		const regex = new RRegex('^$');
		deepEqual(regex.syntax(), {
			'@name': 'regex_syntax::hir::Hir',
			'@type': 'struct',
			kind: {
				'@name': 'regex_syntax::hir::HirKind',
				'@type': 'enum',
				'@variant': 'Concat',
				'@values': [
					[
						{
							'@name': 'regex_syntax::hir::Hir',
							'@type': 'struct',
							kind: {
								'@name': 'regex_syntax::hir::HirKind',
								'@type': 'enum',
								'@variant': 'Look',
								'@values': [
									{
										'@name': 'regex_syntax::hir::Look',
										'@type': 'enum',
										'@variant': 'Start',
									},
								],
							},
						},
						{
							'@name': 'regex_syntax::hir::Hir',
							'@type': 'struct',
							kind: {
								'@name': 'regex_syntax::hir::HirKind',
								'@type': 'enum',
								'@variant': 'Look',
								'@values': [
									{
										'@name': 'regex_syntax::hir::Look',
										'@type': 'enum',
										'@variant': 'End',
									},
								],
							},
						},
					],
				],
			},
		});
	},
};

export const regex_syntax_hir_repetition = {
	test: () => {
		const oneOrMore = new RRegex('a+');
		deepEqual(oneOrMore.syntax(), {
			'@name': 'regex_syntax::hir::Hir',
			'@type': 'struct',
			kind: {
				'@name': 'regex_syntax::hir::HirKind',
				'@type': 'enum',
				'@variant': 'Repetition',
				'@values': [
					{
						'@name': 'regex_syntax::hir::Repetition',
						'@type': 'struct',
						greedy: true,
						min: 1,
						max: undefined,
						sub: {
							'@name': 'regex_syntax::hir::Hir',
							'@type': 'struct',
							kind: {
								'@name': 'regex_syntax::hir::HirKind',
								'@type': 'enum',
								'@variant': 'Literal',
								'@values': [
									{
										'@name': 'regex_syntax::hir::Literal',
										'@type': 'struct',
										'@values': [new Uint8Array(['a'.charCodeAt(0)])],
									},
								],
							},
						},
					},
				],
			},
		});

		const betweenTwoAndFour = new RRegex('a{2,4}');
		deepEqual(betweenTwoAndFour.syntax(), {
			'@name': 'regex_syntax::hir::Hir',
			'@type': 'struct',
			kind: {
				'@name': 'regex_syntax::hir::HirKind',
				'@type': 'enum',
				'@variant': 'Repetition',
				'@values': [
					{
						'@name': 'regex_syntax::hir::Repetition',
						'@type': 'struct',
						greedy: true,
						min: 2,
						max: 4,
						sub: {
							'@name': 'regex_syntax::hir::Hir',
							'@type': 'struct',
							kind: {
								'@name': 'regex_syntax::hir::HirKind',
								'@type': 'enum',
								'@variant': 'Literal',
								'@values': [
									{
										'@name': 'regex_syntax::hir::Literal',
										'@type': 'struct',
										'@values': [new Uint8Array(['a'.charCodeAt(0)])],
									},
								],
							},
						},
					},
				],
			},
		});
	},
};

export const regex_syntax_hir_capture = {
	test: () => {
		const regex = new RRegex('(?<test>a)');
		deepEqual(regex.syntax(), {
			'@name': 'regex_syntax::hir::Hir',
			'@type': 'struct',
			kind: {
				'@name': 'regex_syntax::hir::HirKind',
				'@type': 'enum',
				'@variant': 'Capture',
				'@values': [
					{
						'@name': 'regex_syntax::hir::Capture',
						'@type': 'struct',
						index: 1,
						name: 'test',
						sub: {
							'@name': 'regex_syntax::hir::Hir',
							'@type': 'struct',
							kind: {
								'@name': 'regex_syntax::hir::HirKind',
								'@type': 'enum',
								'@variant': 'Literal',
								'@values': [
									{
										'@name': 'regex_syntax::hir::Literal',
										'@type': 'struct',
										'@values': [new Uint8Array(['a'.charCodeAt(0)])],
									},
								],
							},
						},
					},
				],
			},
		});
	},
};

export const regex_syntax_empty_character_class = {
	test: () => {
		throws(() => new RRegex('[a&&b]'), /empty character classes are not allowed/);
	},
};

export const r_regex_set_is_match = {
	test: () => {
		let set = new RRegexSet(['\\w+', '\\d+']);
		deepEqual(set.isMatch('foo'), true);
		deepEqual(set.isMatch('☃'), false);
	},
};

export const r_regex_set_matches = {
	test: () => {
		let set = new RRegexSet(['\\w+', '\\d+', '\\pL+', 'foo', 'bar', 'barfoo', 'foobar']);
		deepEqual(set.matches('foobar'), [0, 2, 3, 4, 6]);
	},
};

export const match_utf8_aeoeue = {
	test: () => {
		const re = new RRegex('ä');
		const m = re.find('äöü'); // { start: 0, end: 2 }
		deepEqual('äöü'.slice(m.start, m.end), 'äö');

		const buff = new TextEncoder().encode('äöü');
		const slice = buff.slice(m.start, m.end);
		deepEqual(new TextDecoder().decode(slice), 'ä');
	},
};

export const match_greek = {
	test: () => {
		const re = new RRegex('\\p{Greek}+');
		const hay = 'Greek: αβγδ';
		const m = re.find(hay);
		deepEqual(m.start, 7);
		deepEqual(m.end, 15);
		deepEqual(m.value, 'αβγδ');
	},
};

export const captures_toady = {
	test: () => {
		const re = new RRegex('(?<first>\\w)(\\w)(?:\\w)\\w(?<last>\\w)');
		const caps = re.captures('toady');
		deepEqual(caps.get[0].value, 'toady');
		deepEqual(caps.name['first'].value, 't');
		deepEqual(caps.get[2].value, 'o');
		deepEqual(caps.name['last'].value, 'y');
	},
};
