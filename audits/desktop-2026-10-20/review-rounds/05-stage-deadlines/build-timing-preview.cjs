/* Proposal-only renderer. Imports the existing Brisk DS without changing the app. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../../../..');
const repoRequire = Module.createRequire(path.join(root, 'package.json'));
const React = repoRequire('react');
const { renderToStaticMarkup } = repoRequire('react-dom/server');
const ts = repoRequire('typescript');
const cache = new Map();
const cssFiles = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  if (filename.endsWith('.module.css')) {
    const prefix = `ds-${path.basename(filename, '.module.css')}-`;
    const css = fs.readFileSync(filename, 'utf8');
    const names = [...new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => match[1]))];
    const mapping = Object.fromEntries(names.map(name => [name, prefix + name]));
    let scoped = css.replace(/:global\(([^)]+)\)/g, '$1').replace(/\.([a-zA-Z][\w-]*)/g, (match, name) => names.includes(name) && name !== 'ds-icon' ? '.' + mapping[name] : match);
    cssFiles.set(filename, scoped);
    return mapping;
  }
  const loaded = { exports: {} };
  cache.set(filename, loaded);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    // Render the approved portal markup inline for this isolated static preview.
    if (name === 'react-dom') return { ...repoRequire(name), createPortal: children => children };
    if (name.startsWith('.') || name.startsWith('@/')) {
      let resolved = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(filename), name);
      if (!fs.existsSync(resolved)) resolved += '.tsx';
      return load(resolved);
    }
    return repoRequire(name);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}
const ds = name => load(path.join(root, 'Brisk DS/src/app/components', name + '.tsx'));
const { Button } = ds('Button');
const { Input } = ds('Input');
const { Checkbox } = ds('Checkbox');
const { Radio } = ds('Radio');
const { Textarea } = ds('Textarea');
const { EditingDialog } = ds('EditingDialog');
const { BriskSelect } = ds('Select');
const { DsIcon } = load(path.join(root, 'src/components/video-review/DsIcon.tsx'));
const attrs = source => Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const element = (component, props, children) => renderToStaticMarkup(React.createElement(component, props, children));
let html = fs.readFileSync(path.join(__dirname, 'timing-preview-source.html'), 'utf8');
html = html.replace('<!--__SETTINGS_READ_FIRST__-->', () => fs.readFileSync(path.join(__dirname, 'settings-read-first-fragment.html'), 'utf8')).replace('/*__SETTINGS_READ_FIRST_BEHAVIOUR__*/', () => fs.readFileSync(path.join(__dirname, 'settings-read-first-behaviour.js'), 'utf8'));
html = html.replace(/<ds-icon\s+name="([^"]+)"\s*\/>/g, (_, name) => element(DsIcon, { name, size: 16 }));
html = html.replace(/<ds-button([^>]*)>([\s\S]*?)<\/ds-button>/g, (_, source, children) => {
  const props = attrs(source);
  props.size = 'S';
  if (props.disabled !== undefined) props.disabled = true;
  return element(Button, { ...props, dangerouslySetInnerHTML: { __html: children } });
});
html = html.replace(/<ds-input([^>]*)\/>/g, (_, source) => {
  const props = attrs(source);
  props.size = 'S';
  if (props.value !== undefined) { props.defaultValue = props.value; delete props.value; }
  if (props.readOnly !== undefined) props.readOnly = true;
  return element(Input, props);
});
html = html.replace(/<ds-checkbox([^>]*)>([\s\S]*?)<\/ds-checkbox>/g, (_, source, label) => {
  const props = attrs(source);
  const disabled = props.disabled !== undefined;
  delete props.disabled;
  // Retain the approved checked icon for local, non-hydrated preview state changes.
  const markup = element(Checkbox, { ...props, disabled, defaultChecked: true, wrapperClassName: 'candidate-choice', label: React.createElement('span', { className: 'candidate-content', dangerouslySetInnerHTML: { __html: label } }) });
  return markup.replace(' checked=""', '').replace('aria-checked="true"', 'aria-checked="false"');
});
html = html.replace(/<ds-radio([^>]*)>([\s\S]*?)<\/ds-radio>/g, (_, source, label) => {
  const props = attrs(source);
  if (props.checked !== undefined) { props.defaultChecked = true; delete props.checked; }
  return element(Radio, { ...props, label });
});
html = html.replace(/<ds-textarea([^>]*)>([\s\S]*?)<\/ds-textarea>/g, (_, source, content) => {
  const props = attrs(source);
  props.defaultValue = content;
  if (props.rows) props.rows = Number(props.rows);
  return element(Textarea, props);
});
html = html.replace(/<ds-editing-dialog([^>]*)>([\s\S]*?)<\/ds-editing-dialog>/g, (_, source, content) => {
  const props = attrs(source);
  const dialogId = props['dialog-id'];
  const cancel = React.createElement(Button, { size: 'S', variant: 'secondary', 'data-action': 'cancel-settings-editor' }, 'Cancel');
  const save = React.createElement(Button, { size: 'S', id: dialogId + '-save', 'data-action': 'save-settings-editor' }, 'Save');
  const reset = dialogId === 'exception-editor' ? React.createElement(Button, { size: 'S', variant: 'ghost', id: 'exception-reset', hidden: true, 'data-action': 'restore-shared' }, 'Use Studio defaults') : null;
  const previousDocument = global.document;
  global.document = { body: {} };
  let markup;
  try {
    markup = element(EditingDialog, { title: props.title, size: props.size || 'standard', onCancel: () => {}, actions: React.createElement(React.Fragment, null, reset, cancel, save) }, React.createElement('div', { className: 'stack', dangerouslySetInnerHTML: { __html: content } }));
  } finally { if (previousDocument === undefined) delete global.document; else global.document = previousDocument; }
  for (const match of [...markup.matchAll(/id="([^"]+)"/g)]) {
    if (match[1].startsWith('_R_') || match[1].startsWith(':R')) markup = markup.split(match[1]).join(dialogId + '-' + match[1]);
  }
  return markup.replace('<dialog ', '<dialog id="' + dialogId + '" ');
});

const globals = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
const baseTokens = fs.readFileSync(path.join(root, 'styles/brisk-tokens.css'), 'utf8').match(/:root\s*\{([\s\S]*?)\n\}/)[1];
const tokens = baseTokens + globals.match(/:root\s*\{([\s\S]*?)\n\}/)[1];
const typography = globals.slice(globals.indexOf('.heading-3xs'), globals.indexOf('.heading-3xs') + 7000).match(/\.(?:heading|label|paragraph)[\s\S]*?\n\}/g).join('\n');
let dsCSS = [...cssFiles.values()].join('\n') + fs.readFileSync(path.join(root, 'Brisk DS/src/app/components/Select.css'), 'utf8') + '\n' + typography;
dsCSS = dsCSS.replace(/(^|\})(\s*)([^@{}][^{}]*)\{/g, (match, close, space, selectors) => `${close}${space}${selectors.split(',').map(selector => '#brisk-timing-preview ' + selector.trim()).join(', ')} {`);
html = html.replace('/*__BRISK_TOKENS__*/', tokens).replace('/*__DS_STYLES__*/', dsCSS);
// Inline approved assets so the local and in-conversation previews need no app requests.
html = html.replace(/\/brisk-icons\/[a-z0-9-]+\.svg/g, iconPath => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'public', iconPath)).toString('base64'));
const fontCSS = fs.readFileSync(path.join(root, '.next/static/css/app/layout.css'), 'utf8');
const latinFont = fontCSS.match(/\/\* latin \*\/[\s\S]*?url\(([^)]+)\)/);
const fontFile = latinFont ? path.basename(latinFont[1].replace(/["']/g, '')) : '636a5ac981f94f8b-s.p.woff2';
html = html.replace('__BRISK_FONT__', fs.readFileSync(path.join(root, '.next/static/media', fontFile)).toString('base64'));
const destination = '/Users/gclt1/.codex/visualizations/2026/10/20/01a1587f-4447-76b0-a90a-ef4a8d1bc011/stage-deadlines-preview.html';
fs.writeFileSync(destination, html);
console.log(JSON.stringify({ destination, bytes: Buffer.byteLength(html), importedDS: ['Button', 'Input', 'Radio', 'Textarea', 'EditingDialog', 'DsIcon'], applicationChanges: false }));
