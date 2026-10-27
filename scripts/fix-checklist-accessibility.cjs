const fs = require('node:fs');
const path = require('node:path');
const ts = require('../meatshop-main/node_modules/typescript');
const roots = ['finance','products','orders','chat','reviews','promotions','settings'].map(name => path.resolve(__dirname, '../meatshop-main/src/modules', name));
const tags = new Set(['input','Input','textarea','Textarea','select','PasswordInput']);
const labels = { X: 'Fechar', Trash: 'Excluir', Trash2: 'Excluir', Pencil: 'Editar', Edit: 'Editar', Edit2: 'Editar', Search: 'Buscar', Plus: 'Adicionar', ChevronLeft: 'Anterior', ChevronRight: 'Proximo', Eye: 'Visualizar', Menu: 'Abrir menu' };
let count = 0;
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith('.tsx') && !file.endsWith('.spec.tsx')) update(file);
  }
}
function update(file) {
  const source = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const attribute = (node, name) => node.attributes.properties.find(value => value.name?.getText(tree) === name);
  const opening = node => ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
  const add = (node, name, value) => { if (!attribute(node, name)) edits.push({ at: node.tagName.end, text: ` ${name}="${value}"` }); };
  function visit(node) {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(tree);
      if (tag === 'label' && !attribute(node.openingElement, 'htmlFor') && ts.isJsxElement(node.parent)) {
        const children = node.parent.children;
        const next = children.slice(children.indexOf(node)+1).find(value => !ts.isJsxText(value) || value.text.trim());
        const target = next && opening(next);
        if (target && tags.has(target.tagName.getText(tree))) {
          const current = attribute(target, 'id');
          const id = current?.initializer && ts.isStringLiteral(current.initializer) ? current.initializer.text : `field-${path.basename(file,'.tsx')}-${node.pos}`;
          if (!current || ts.isStringLiteral(current.initializer)) { add(node.openingElement, 'htmlFor', id); add(target, 'id', id); }
        }
      }
      if (tag === 'fieldset') {
        const legend = node.children.find(value => ts.isJsxElement(value) && value.openingElement.tagName.getText(tree) === 'legend');
        if (legend) {
          const legendId = `legend-${path.basename(file,'.tsx')}-${node.pos}`;
          add(legend.openingElement, 'id', legendId);
          for (const child of node.children) { const input = opening(child); if (input && tags.has(input.tagName.getText(tree))) add(input,'aria-labelledby',legendId); }
        }
      }
      if (tag === 'button' && !attribute(node.openingElement,'aria-label') && !attribute(node.openingElement,'aria-labelledby')) {
        const children = node.children.filter(value => !ts.isJsxText(value) || value.text.trim());
        if (children.length === 1) { const icon = opening(children[0]); const text = icon && labels[icon.tagName.getText(tree)]; if (text) add(node.openingElement,'aria-label',text); }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  let result = source;
  for (const edit of edits.sort((a,b)=>b.at-a.at)) result = result.slice(0,edit.at)+edit.text+result.slice(edit.at);
  result = result.replace(/text-\[(?:[0-9]|1[01])px\]/g, 'text-xs');
  if (result !== source) { fs.writeFileSync(file,result); count++; }
}
for (const root of roots) walk(root);
console.log(`Accessibility associations and minimum font size updated in ${count} files`);
