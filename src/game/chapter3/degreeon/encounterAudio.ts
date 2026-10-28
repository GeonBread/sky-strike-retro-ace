import type {StorySound} from './encounter';
/** Procedural low-frequency cues: no downloads and no autoplay before a user gesture. */
export class EncounterAudio{
 private ctx:AudioContext|null=null;private lastGlyph=-1;enabled=true;
 unlock(){if(!this.enabled)return;try{this.ctx??=new AudioContext();void this.ctx.resume().catch(()=>{});}catch{}}
 play(kind:StorySound){const c=this.ctx;if(!this.enabled||!c||c.state!=='running')return;
  const now=c.currentTime;if(kind==='glyph'){if(now-this.lastGlyph<.055)return;this.lastGlyph=now;}const config:Record<StorySound,[number,number,number]>={glyph:[72,.055,.018],weight:[46,.32,.10],resolve:[180,1.3,.09],charge:[38,2.8,.10],awaken:[31,1.6,.18],victory:[220,1.8,.09]},[frequency,duration,volume]=config[kind];
  for(let i=0;i<(kind==='awaken'||kind==='victory'?3:1);i++){const o=c.createOscillator(),g=c.createGain();o.type=kind==='glyph'?'sine':'triangle';o.frequency.setValueAtTime(frequency*(1+i*.5),now);o.frequency.exponentialRampToValueAtTime(kind==='resolve'||kind==='victory'?frequency*1.5:Math.max(22,frequency*.6),now+duration);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume/(i+1),now+.025);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(c.destination);o.start(now);o.stop(now+duration+.05);}
 }
 close(){void this.ctx?.close().catch(()=>{});this.ctx=null;}
}
