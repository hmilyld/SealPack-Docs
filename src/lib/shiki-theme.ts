/**
 * 代码高亮的配色。
 *
 * 站点的底色是纸白（#f7f4ee）与墨黑（#17140f），默认的 github-light / one-dark
 * 一进来就会在页面中间贴一块蓝色，所以这里按站点自己的调色板写了两套主题。
 * 只覆盖有意义的 token —— 剩下的落到 foreground。
 */

type TokenRule = {
  scope: string | string[];
  settings: { foreground?: string; fontStyle?: string };
};

const paper: TokenRule[] = [
  {
    scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
    settings: { foreground: '#8d8375', fontStyle: 'italic' },
  },
  {
    scope: [
      'string',
      'string.quoted',
      'string.template',
      'punctuation.definition.string',
      'string.regexp',
    ],
    settings: { foreground: '#4f6b3a' },
  },
  {
    scope: [
      'constant.numeric',
      'constant.language',
      'constant.character.escape',
      'support.constant',
    ],
    settings: { foreground: '#9a5b1e' },
  },
  {
    scope: [
      'keyword',
      'keyword.control',
      'storage',
      'storage.type',
      'storage.modifier',
      'keyword.operator.new',
    ],
    settings: { foreground: '#b0352a' },
  },
  {
    scope: ['entity.name.function', 'support.function', 'meta.function-call'],
    settings: { foreground: '#2f5d73' },
  },
  {
    scope: [
      'entity.name.type',
      'entity.name.class',
      'entity.name.struct',
      'support.type',
      'support.class',
      'entity.other.inherited-class',
    ],
    settings: { foreground: '#7a4a2c' },
  },
  {
    scope: ['variable', 'variable.other', 'variable.parameter', 'meta.object-literal.key'],
    settings: { foreground: '#211d18' },
  },
  {
    scope: ['entity.name.tag', 'punctuation.definition.tag'],
    settings: { foreground: '#b0352a' },
  },
  {
    scope: ['entity.other.attribute-name', 'support.type.property-name'],
    settings: { foreground: '#2f5d73' },
  },
  {
    scope: ['keyword.operator', 'punctuation', 'meta.brace', 'punctuation.separator'],
    settings: { foreground: '#6f665c' },
  },
  { scope: ['markup.heading', 'markup.bold'], settings: { fontStyle: 'bold' } },
  { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
  { scope: ['invalid'], settings: { foreground: '#b0352a' } },
];

const ink: TokenRule[] = [
  {
    scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
    settings: { foreground: '#6f6558', fontStyle: 'italic' },
  },
  {
    scope: [
      'string',
      'string.quoted',
      'string.template',
      'punctuation.definition.string',
      'string.regexp',
    ],
    settings: { foreground: '#a8c07f' },
  },
  {
    scope: [
      'constant.numeric',
      'constant.language',
      'constant.character.escape',
      'support.constant',
    ],
    settings: { foreground: '#e0a35e' },
  },
  {
    scope: [
      'keyword',
      'keyword.control',
      'storage',
      'storage.type',
      'storage.modifier',
      'keyword.operator.new',
    ],
    settings: { foreground: '#e8735f' },
  },
  {
    scope: ['entity.name.function', 'support.function', 'meta.function-call'],
    settings: { foreground: '#7fc4d8' },
  },
  {
    scope: [
      'entity.name.type',
      'entity.name.class',
      'entity.name.struct',
      'support.type',
      'support.class',
      'entity.other.inherited-class',
    ],
    settings: { foreground: '#d7b48a' },
  },
  {
    scope: ['variable', 'variable.other', 'variable.parameter', 'meta.object-literal.key'],
    settings: { foreground: '#e9e2d6' },
  },
  {
    scope: ['entity.name.tag', 'punctuation.definition.tag'],
    settings: { foreground: '#e8735f' },
  },
  {
    scope: ['entity.other.attribute-name', 'support.type.property-name'],
    settings: { foreground: '#7fc4d8' },
  },
  {
    scope: ['keyword.operator', 'punctuation', 'meta.brace', 'punctuation.separator'],
    settings: { foreground: '#a89d8e' },
  },
  { scope: ['markup.heading', 'markup.bold'], settings: { fontStyle: 'bold' } },
  { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
  { scope: ['invalid'], settings: { foreground: '#e8735f' } },
];

export const paperTheme = {
  name: 'sealpack-paper',
  type: 'light' as const,
  colors: {
    'editor.background': '#f1ede4',
    'editor.foreground': '#211d18',
  },
  tokenColors: paper,
};

export const inkTheme = {
  name: 'sealpack-ink',
  type: 'dark' as const,
  colors: {
    'editor.background': '#17140f',
    'editor.foreground': '#e9e2d6',
  },
  tokenColors: ink,
};
