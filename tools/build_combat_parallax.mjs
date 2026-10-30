import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {transform} from 'esbuild';
const source=new URL('../src/game/render/combatParallax.ts',import.meta.url);
const target=new URL('../public/assets/runtime/combatParallax.js',import.meta.url);
const result=await transform(await readFile(source,'utf8'),{loader:'ts',format:'iife',globalName:'HobanuCombatParallax',target:'es2020',minify:true,legalComments:'none'});
await mkdir(new URL('.',target),{recursive:true});
await writeFile(target,'/* Generated from src/game/render/combatParallax.ts. */\n'+result.code);
// The embedded wave is a standalone HTML asset. It must boot without another script request.
const htmlPath=new URL('../src/embedded/chapter3Wave.html',import.meta.url);
const start='<!-- COMBAT_PARALLAX_RUNTIME_START -->',end='<!-- COMBAT_PARALLAX_RUNTIME_END -->';
const block=start+'\n<script>\n'+result.code.replace(/<\/script/gi,'<\\/script')+'</script>\n'+end;
const html=await readFile(htmlPath,'utf8');
const next=html.includes(start)?html.slice(0,html.indexOf(start))+block+html.slice(html.indexOf(end)+end.length):html.replace('<script src="/assets/runtime/combatParallax.js"></script>',block);
if(next!==html)await writeFile(htmlPath,next);
