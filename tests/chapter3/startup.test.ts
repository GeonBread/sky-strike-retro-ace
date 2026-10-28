import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
// Use fresh module graphs: importing engine first used to mask the browser's
// advanced-first initialization error, so every entry is tested in a new process.
for(const entry of ['advanced','patterns','render','engine'])test(`startup imports ${entry} first without a circular initialization failure`,()=>{
 const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',`await import('./src/game/chapter3/degreeon/${entry}.ts');const {patterns}=await import('./src/game/chapter3/degreeon/patterns.ts');const {Engine}=await import('./src/game/chapter3/degreeon/engine.ts');const e=new Engine({getContext:()=>({})},patterns);if(patterns.length!==41||!e.pattern)throw Error('Incomplete startup');`],{cwd:process.cwd(),encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr||result.error?.message);
});
