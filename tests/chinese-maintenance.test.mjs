import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const text=fs.readFileSync(new URL('../app/flute-studio/i18n/translations.ts',import.meta.url),'utf8');
const compiled=ts.transpile(text,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {translations:{en,zh}}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('Chinese dictionary preserves English structure and translates every roadmap teaching label',()=>{
 function walk(a,b,path=''){for(const key of Object.keys(a)){assert.ok(key in b,path+'.'+key);if(a[key]&&typeof a[key]==='object')walk(a[key],b[key],path+'.'+key)}}
 walk(en,zh);
 assert.match(zh.roadmap.title,/[\u3400-\u9fff]/);
 for(const region of zh.roadmap.regions){assert.match(region.title,/[\u3400-\u9fff]/);assert.match(region.description,/[\u3400-\u9fff]/);for(const skill of region.skills){assert.match(skill.title,/[\u3400-\u9fff]/);assert.match(skill.description,/[\u3400-\u9fff]/)}}
 assert.equal(zh.roadmap.learnedCount(2,5),'已标记 2 / 5');
});
