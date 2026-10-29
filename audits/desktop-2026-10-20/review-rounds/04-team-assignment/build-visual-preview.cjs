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
const { Tabs } = ds('Tabs');
const { BriskSelect } = ds('Select');
const { DsIcon } = load(path.join(root, 'src/components/video-review/DsIcon.tsx'));
const attrs = source => Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const element = (component, props, children) => renderToStaticMarkup(React.createElement(component, props, children));
let html = fs.readFileSync(path.join(__dirname, 'visual-preview-source.html'), 'utf8');
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
html = html.replace(/<ds-people-tabs>([\s\S]*?)<\/ds-people-tabs>/, (_, children) => element(Tabs, { label: 'Team source', value: 'freelancers', options: [{ value: 'staff', label: 'Staff' }, { value: 'freelancers', label: 'Freelancers' }], onValueChange: () => {} }, React.createElement('div', { dangerouslySetInnerHTML: { __html: children } })));
html = html.replace('<ds-role-select />', element(BriskSelect, { id: 'preview-role', ariaLabel: 'Project role', placeholder: 'Choose role', value: 'Shooter', clearable: false, options: ['Producer', 'Editor', 'Shooter'].map(value => ({ value, label: value })), onChange: () => {} }));
const globals = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
const baseTokens = fs.readFileSync(path.join(root, 'styles/brisk-tokens.css'), 'utf8').match(/:root\s*\{([\s\S]*?)\n\}/)[1];
const tokens = baseTokens + globals.match(/:root\s*\{([\s\S]*?)\n\}/)[1];
const typography = globals.slice(globals.indexOf('.heading-3xs'), globals.indexOf('.heading-3xs') + 7000).match(/\.(?:heading|label|paragraph)[\s\S]*?\n\}/g).join('\n');
let dsCSS = [...cssFiles.values()].join('\n') + fs.readFileSync(path.join(root, 'Brisk DS/src/app/components/Select.css'), 'utf8') + '\n' + typography;
dsCSS = dsCSS.replace(/(^|\})(\s*)([^@{}][^{}]*)\{/g, (match, close, space, selectors) => `${close}${space}${selectors.split(',').map(selector => '#brisk-team-preview ' + selector.trim()).join(', ')} {`);
html = html.replace('/*__BRISK_TOKENS__*/', tokens).replace('/*__DS_STYLES__*/', dsCSS);
// Inline approved assets so the local and in-conversation previews need no app requests.
html = html.replace(/\/brisk-icons\/[a-z0-9-]+\.svg/g, iconPath => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'public', iconPath)).toString('base64'));
const fontCSS = fs.readFileSync(path.join(root, '.next/static/css/app/layout.css'), 'utf8');
const latinFont = fontCSS.match(/\/\* latin \*\/[\s\S]*?url\(([^)]+)\)/);
const fontFile = latinFont ? path.basename(latinFont[1].replace(/["']/g, '')) : '636a5ac981f94f8b-s.p.woff2';
html = html.replace('__BRISK_FONT__', fs.readFileSync(path.join(root, '.next/static/media', fontFile)).toString('base64'));
const destination = '/Users/gclt1/.codex/visualizations/2026/10/20/01a1587f-4447-76b0-a90a-ef4a8d1bc011/team-assignment-preview.html';
fs.writeFileSync(destination, html);
console.log(JSON.stringify({ destination, bytes: Buffer.byteLength(html), importedDS: ['Button', 'Input', 'Checkbox', 'Tabs', 'BriskSelect', 'DsIcon'], applicationChanges: false }));
