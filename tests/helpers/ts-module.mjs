import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

/**
 * Load a TypeScript source file in a plain `node --test` run, together with everything it imports.
 *
 * The studio's lib files import each other without extensions ("./pitch") and import JSON without an attribute,
 * which the bundler accepts and Node does not. Tests used to patch one import at a time by hand, and broke each
 * time a lib file gained a new import. This follows relative imports itself: each file is transpiled, its relative
 * imports are swapped for data: URLs of the files they point at (JSON becomes a default export), and the result
 * is one self-contained data: URL to `import()`.
 *
 *   const pitch=await import(tsModule('app/flute-studio/lib/pitch.ts'));
 *
 * Options:
 *   stubs  {specifier: jsSource}  Replace an import, written exactly as in the source ("react", "./offlineMusic"),
 *                                 with a small module. Needed for packages (a data: module cannot reach
 *                                 node_modules) and for files a test should not run.
 *   edit   (source,file)=>source  Change a file's TypeScript before it is compiled.
 *   fresh  true                   Return a new module instance instead of the cached one (module-level state).
 */
const root=fileURLToPath(new URL('../..',import.meta.url));
const dataUrl=js=>`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX});
const IMPORT=/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"'\n]+)\2/g;
const CANDIDATES=['','.ts','.tsx','.json','.mjs','.js','/index.ts','/index.tsx'];

function resolveFile(from,specifier){
  const base=path.resolve(path.dirname(from),specifier);
  for(const end of CANDIDATES){const file=base+end;if(fs.existsSync(file)&&fs.statSync(file).isFile())return file}
  throw new Error(`tsModule: cannot find "${specifier}" imported from ${path.relative(root,from)}`);
}

export function tsModule(file,{stubs={},edit,fresh=false}={}){
  const cache=new Map(),open=new Set();
  const build=(absolute,top)=>{
    if(cache.has(absolute))return cache.get(absolute);
    if(open.has(absolute))throw new Error(`tsModule: circular import through ${path.relative(root,absolute)}; stub one side`);
    open.add(absolute);
    let js;
    if(absolute.endsWith('.json'))js=`export default ${fs.readFileSync(absolute,'utf8')};`;
    else{
      let source=fs.readFileSync(absolute,'utf8');
      if(edit)source=edit(source,path.relative(root,absolute));
      js=compile(source).replace(IMPORT,(whole,lead,quote,specifier)=>{
        if(Object.hasOwn(stubs,specifier))return `${lead}${JSON.stringify(dataUrl(stubs[specifier]))}`;
        if(!specifier.startsWith('.'))return whole;
        if(/\.(css|svg|png|jpg|mp3|wav)$/.test(specifier))return `${lead}${JSON.stringify(dataUrl('export default "";'))}`;
        return `${lead}${JSON.stringify(build(resolveFile(absolute,specifier),false))}`;
      });
    }
    if(top&&fresh)js+=`\n// ${Math.random()}`;
    const url=dataUrl(js);
    open.delete(absolute);
    if(!(top&&fresh))cache.set(absolute,url);
    return url;
  };
  return build(path.resolve(root,file),true);
}
