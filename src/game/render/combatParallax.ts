/** Decorative layers only: these clocks and random choices never touch combat RNG. */
export type ParallaxScene = 'wave12' | 'wave3' | 'boss2' | 'boss3';
type Range = readonly [number, number];
type LaneConfig = {
  id: string; assets: readonly string[]; speed: Range; opacity: Range;
  chance?: number; duration?: Range; gap?: Range; exclude?: string;
};
const root = '/assets/common/combat/parallax/';
const asset = (path: string) => root + path;
export const PARALLAX_PROFILES: Record<ParallaxScene, readonly LaneConfig[]> = {
  wave12: [
    {id:'large-cloud',assets:[asset('wave12/cloud_large.png')],speed:[14,14],opacity:[.36,.36]},
    {id:'small-cloud',assets:[asset('wave12/cloud_small_1.png'),asset('wave12/cloud_small_2.png')],speed:[24,24],opacity:[.57,.57]},
    {id:'purification',assets:[asset('wave12/purification_1.png'),asset('wave12/purification_2.png')],speed:[19,43],opacity:[.58,.74]},
  ],
  wave3: [
    {id:'night-cloud',assets:[1,2,3].map(n=>asset(`wave3/cloud_${n}.png`)),speed:[14,19],opacity:[.34,.43]},
    {id:'near-night-cloud',assets:[1,2,3].map(n=>asset(`wave3/cloud_${n}.png`)),speed:[29,40],opacity:[.23,.34],chance:.5,duration:[16,27],gap:[8,17],exclude:'night-cloud'},
    {id:'corruption',assets:[asset('wave3/corruption.png')],speed:[25,46],opacity:[.6,.78],chance:.7,duration:[20,35],gap:[9,19]},
  ],
  boss2: [
    {id:'boss-cloud',assets:[asset('boss2/cloud_1.png'),asset('boss2/cloud_2.png')],speed:[133,164],opacity:[.29,.4],chance:.8,duration:[18,32],gap:[7,15]},
    {id:'boss-fragments',assets:[asset('boss2/fragments_1.png'),asset('boss2/fragments_2.png')],speed:[183,234],opacity:[.52,.7],chance:.8,duration:[15,25],gap:[5,12]},
  ],
  boss3: [
    {id:'relics',assets:[asset('boss3/relic_gold.png'),asset('boss3/relic_ruins.png')],speed:[195,270],opacity:[.55,.74],chance:.85,duration:[16,27],gap:[5,12]},
  ],
};
export type ParallaxFrame = { id:string; asset:string; speed:number; opacity:number; distance:number; phase:number };
type Lane = { config:LaneConfig; random:()=>number; active:boolean; asset:string; speed:number; opacity:number; phase:number; start:number; next:number };
const smooth = (n:number) => {n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};
const seeded = (seed:number) => () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const between = (random:()=>number,range:Range) => range[0]+random()*(range[1]-range[0]);
const defaultImage = (src:string):HTMLImageElement|null => {if(typeof Image==='undefined')return null;const image=new Image();image.src=src;return image;};

export class CombatParallax {
  private lanes:Lane[]=[];
  private images=new Map<string,HTMLImageElement|null>();
  private lastTime=-1;
  constructor(public readonly scene:ParallaxScene,private random:()=>number=Math.random,loadImage:(src:string)=>HTMLImageElement|null=defaultImage){
    for(const config of PARALLAX_PROFILES[scene])for(const src of config.assets)if(!this.images.has(src))this.images.set(src,loadImage(src));
    this.reset();
  }
  /** A mandatory variant is selected once per run; optional appearances select again after fading out. */
  reset(at=0){
    this.lastTime=at;
    this.lanes=PARALLAX_PROFILES[this.scene].map(config=>({config,random:seeded(Math.floor(this.random()*4294967296)),active:false,asset:'',speed:0,opacity:0,phase:0,start:0,next:0}));
    for(const lane of this.lanes)this.begin(lane,at);
  }
  private begin(lane:Lane,at:number){
    const {config,random}=lane;
    lane.active=config.chance===undefined||random()<config.chance;
    lane.start=at;
    if(!lane.active){lane.next=at+between(random,config.gap!);return;}
    const excluded=this.lanes.find(other=>other.config.id===config.exclude)?.asset;
    const choices=config.assets.filter(src=>src!==excluded);
    lane.asset=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
    lane.speed=between(random,config.speed);lane.opacity=between(random,config.opacity);lane.phase=random();
    lane.next=config.chance===undefined?Infinity:at+between(random,config.duration!);
  }
  /** Sampling twice at the same timestamp is side-effect free, including during shard rendering. */
  sample(time:number):ParallaxFrame[]{
    time=Math.max(0,Number.isFinite(time)?time:0);
    if(time<this.lastTime)this.reset();
    this.lastTime=time;
    const frames:ParallaxFrame[]=[];
    for(const lane of this.lanes){
      while(time>=lane.next){
        const at=lane.next;
        if(lane.active){lane.active=false;lane.next=at+between(lane.random,lane.config.gap!);}
        else this.begin(lane,at);
      }
      if(!lane.active)continue;
      const fade=lane.config.chance===undefined?1:smooth((time-lane.start)/1.5)*smooth((lane.next-time)/1.8);
      frames.push({id:lane.config.id,asset:lane.asset,speed:lane.speed,opacity:lane.opacity*fade,distance:(time-lane.start)*lane.speed,phase:lane.phase});
    }
    return frames;
  }
  draw(ctx:CanvasRenderingContext2D,width:number,height:number,time:number){
    if(width<=0||height<=0)return;
    for(const frame of this.sample(time)){
      const image=this.images.get(frame.asset);
      if(!image?.complete||!image.naturalWidth||!image.naturalHeight||frame.opacity<=0)continue;
      const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight),dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;
      const x=(width-dw)/2,offset=((frame.distance+frame.phase*dh)%dh+dh)%dh;
      ctx.save();ctx.globalAlpha*=frame.opacity;ctx.globalCompositeOperation='source-over';
      ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
      for(const y of [offset-dh,offset,offset-2*dh])ctx.drawImage(image,x,y,dw,dh);
      ctx.restore();
    }
  }
}

const runtimes=new WeakMap<object,Map<ParallaxScene,CombatParallax>>();
export function getCombatParallax(owner:object,scene:ParallaxScene){
  let scenes=runtimes.get(owner);if(!scenes){scenes=new Map();runtimes.set(owner,scenes);}
  let runtime=scenes.get(scene);if(!runtime){runtime=new CombatParallax(scene);scenes.set(scene,runtime);}return runtime;
}
