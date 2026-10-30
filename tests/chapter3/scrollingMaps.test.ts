import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {drawScrollingMapDown} from '../../src/game/render/scrollingMap';
const ctx=()=>{const draws:any[][]=[];return {draws,save(){},restore(){},beginPath(){},rect(){},clip(){},drawImage(...a:any[]){draws.push(a);}};};
const image=(w=682,h=2048)=>({complete:true,naturalWidth:w,naturalHeight:h}) as HTMLImageElement;
test('long maps preserve their full natural proportions instead of squeezing into one screen',()=>{
 const c=ctx(),im=image();assert.equal(drawScrollingMapDown(c as any,im,922,960,0),true);assert.equal(c.draws.length,3);for(const a of c.draws){assert.ok(Math.abs(a[3]-922)<1e-9);assert.ok(Math.abs(a[4]/a[3]-2048/682)<1e-10);assert.ok(a[4]>960*2);}
});
test('a fixed point moves downward by the existing 8 pixels each second',()=>{
 const a=ctx(),b=ctx(),im=image();drawScrollingMapDown(a as any,im,922,960,1);drawScrollingMapDown(b as any,im,922,960,2);for(let i=0;i<3;i++)assert.ok(Math.abs(b.draws[i][2]-a.draws[i][2]-8)<1e-9);
});
test('both supplied aspect ratios cover the entire viewport across loop boundaries and landscape/portrait sizes',()=>{
 for(const [iw,ih] of [[682,2048],[887,1774]])for(const [w,h] of [[922,960],[1600,900],[700,1500]]){
  const im=image(iw,ih),period=Math.max(w/iw,h/ih)*ih/8;
  for(const t of [0,.01,period-.01,period,period+.01,period*10+.5]){
   const c=ctx();drawScrollingMapDown(c as any,im,w,h,t);
   for(let y=0;y<h;y+=11)assert.ok(c.draws.some(a=>a[1]<=.001&&a[1]+a[3]>=w-.001&&a[2]<=y+.001&&a[2]+a[4]>=y-.001));
  }
 }
});
test('loading or invalid images leave fallback drawing to the original runtime',()=>{
 const c=ctx();assert.equal(drawScrollingMapDown(c as any,null,922,960,0),false);assert.equal(drawScrollingMapDown(c as any,{...image(),complete:false} as any,922,960,0),false);assert.equal(c.draws.length,0);
});
test('embedded CH3 wave uses the same aspect-preserving downward geometry as native runtimes',()=>{
 const html=readFileSync(new URL('../../src/embedded/chapter3Wave.html',import.meta.url),'utf8');
 const code=html.slice(html.indexOf('function drawParallaxLayer('),html.indexOf('function drawBG(){'));
 for(const t of [0,10,500]){
  const a=ctx(),b=ctx(),im=image();const call=new Function('ctx','W','H','mapScroll',code+';return drawParallaxLayer;')(a,922,960,t);call(im,8,1);drawScrollingMapDown(b as any,im,922,960,t);
  assert.deepEqual(a.draws,b.draws);
 }
 assert.match(html,/assets\/chapter3\/combat\/backgrounds\/chapter3_wave_map.png/);
 assert.doesNotMatch(html,/CHAPTER1_BG_IMAGES/);
});
test('each supplied map is delivered byte-for-byte to its own chapter/combat path',()=>{
 const expected=[["public/assets/chapter1/combat/backgrounds/chapter1_wave_map.png", "4e267df670fb5c75ed99435eeab3542817958ee93936b97c05cf901059e6d789"], ["public/assets/chapter2/combat/backgrounds/chapter2_wave_map.png", "c153b9f8532386f56ddea09c6f8130ceaed8a64a20f68de282756e120162403b"], ["public/assets/chapter3/combat/backgrounds/chapter3_wave_map.png", "d7f9c09495354f2e924babc02bbcb928d0e723c8cf4afd8935982266e52ce461"], ["public/assets/chapter2/combat/boss/backgrounds/chapter2_boss_map.png", "ec03cca2a6276faf64ddb53bca734d63fde1cfd4860ee0830a583169d1381a67"], ["public/assets/chapter3/combat/boss/backgrounds/chapter3_boss_map.png", "7b5237e063beae824a07f9aaa01eaf32badf923892330814fc94a42e24562127"]];
 for(const [path,sha] of expected){const data=readFileSync(new URL('../../'+path,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),sha,path);}
});
