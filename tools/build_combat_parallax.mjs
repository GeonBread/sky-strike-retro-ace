import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {transform} from 'esbuild';
const source=new URL('../src/game/render/combatParallax.ts',import.meta.url);
const target=new URL('../public/assets/runtime/combatParallax.js',import.meta.url);
const result=await transform(await readFile(source,'utf8'),{loader:'ts',format:'iife',globalName:'HobanuCombatParallax',target:'es2020',minify:true,legalComments:'none'});
await mkdir(new URL('.',target),{recursive:true});
await writeFile(target,'/* Generated from src/game/render/combatParallax.ts. */\n'+result.code);
