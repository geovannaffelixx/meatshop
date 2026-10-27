const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('../meatshop-backend/node_modules/typescript');
const tracked = execFileSync('git',['-c','core.safecrlf=false','diff','--name-only','--diff-filter=ACM'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'}).trim().split(/\r?\n/);
const untracked = execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'}).trim().split(/\r?\n/);
const rows=[];
for(const file of new Set([...tracked,...untracked])) {
 if(!/^meatshop-backend\/src\/.+\.ts$/.test(file) || file.endsWith('.spec.ts')) continue;
 const source=fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
 const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 function visit(node) {
  if((ts.isFunctionDeclaration(node)||ts.isMethodDeclaration(node)||ts.isConstructorDeclaration(node)||ts.isArrowFunction(node)||ts.isFunctionExpression(node))&&node.body) {
   const lines=node.body.getText(tree).split(/\r?\n/).filter(line=>line.trim()&&!/^\s*(\/\/|\*|\/\*)/.test(line)).length;
   if(lines>40) rows.push({file,line:tree.getLineAndCharacterOfPosition(node.getStart(tree)).line+1,name:node.name?.getText(tree)|| (ts.isConstructorDeclaration(node)?'constructor':'callback'),lines});
  }
  ts.forEachChild(node,visit);
 }
 visit(tree);
}
fs.writeFileSync(path.resolve(__dirname,'../docs/CHECKLIST_FUNCTION_LENGTH.json'),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows.map(row=>({name:row.name,lines:row.lines,file:row.file})),null,2));
process.exitCode=rows.length?1:0;
