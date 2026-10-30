import {drawScrollingMapDown} from './scrollingMap';
import {getCombatParallax} from './combatParallax';
type BackgroundRenderEngine = any;
/** Campus map, large cloud, one small-cloud variant, then one gold-fragment variant. */
export function renderChapter1ParallaxBackgroundSystem(engine:BackgroundRenderEngine,isBoss:boolean):boolean{
 const image=engine.chapter1BackgroundLayers?.[0] as HTMLImageElement|undefined;
 if(!image?.complete||!image.naturalWidth||!image.naturalHeight)return false;
 const {ctx,canvas}=engine,time=engine.backgroundTime??0;
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle='#02050a';ctx.fillRect(0,0,canvas.width,canvas.height);
 drawScrollingMapDown(ctx,image,canvas.width,canvas.height,time,8);
 if(!isBoss)getCombatParallax(engine,'wave12').draw(ctx,canvas.width,canvas.height,time);
 if(isBoss){ctx.fillStyle='rgba(3,7,18,.06)';ctx.fillRect(0,0,canvas.width,canvas.height);}
 ctx.restore();return true;
}

/**
 * Current combat background renderer. Non-Chapter-1 behaviour is preserved.
 */
export function renderBackgroundSystem(engine: BackgroundRenderEngine): void {
  const tier = engine.getCombatTier();
  const isBoss = engine.bossActive || engine.state === "BOSSCUTSCENE";
  if (tier === 1 && engine.renderChapter1ParallaxBackground(isBoss)) return;

  const time = performance.now();
  const topColors = isBoss
    ? tier >= 4
      ? ["#18051f", "#581c87", "#020617"]
      : tier === 3
        ? ["#12081f", "#2e1065", "#020617"]
        : tier === 2
          ? ["#111827", "#4c0519", "#020617"]
          : ["#111827", "#1e293b", "#020617"]
    : tier >= 4
      ? ["#06121f", "#4a044e", "#020617"]
      : tier === 3
        ? ["#07111f", "#312e81", "#020617"]
        : tier === 2
          ? ["#07111f", "#164e63", "#020617"]
          : ["#020617", "#0f172a", "#020617"];

  const gradient = engine.ctx.createLinearGradient(0, 0, 0, engine.canvas.height);
  gradient.addColorStop(0, topColors[0]);
  gradient.addColorStop(0.45, topColors[1]);
  gradient.addColorStop(1, topColors[2]);
  engine.ctx.fillStyle = gradient;
  engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);

  const starCount = isBoss ? 68 : 44 + tier * 10;
  for (let i = 0; i < starCount; i++) {
    const sx = (time * (0.025 + tier * 0.006) + i * 147) % engine.canvas.width;
    const sy = (time * 0.13 * ((i % 4) + 1) + i * 254) % engine.canvas.height;
    engine.ctx.globalAlpha = 0.18 + (i % 5) * 0.12;
    engine.ctx.fillStyle = tier >= 4 && i % 4 === 0
      ? "#f0abfc"
      : tier === 3 && i % 6 === 0
        ? "#c084fc"
        : tier === 2 && i % 5 === 0
          ? "#22d3ee"
          : "#ffffff";
    engine.ctx.fillRect(sx, sy, 1 + (i % 3), 1 + (i % 3));
  }

  engine.ctx.globalAlpha = isBoss ? 0.22 : 0.12;
  engine.ctx.strokeStyle = tier >= 4
    ? "#e879f9"
    : tier === 3
      ? "#a855f7"
      : tier === 2
        ? "#06b6d4"
        : "#334155";
  engine.ctx.lineWidth = 1;
  const gridStep = tier >= 4 ? 32 : tier === 3 ? 38 : tier === 2 ? 48 : 60;
  const drift = (time * 0.035) % gridStep;
  for (let y = -gridStep; y < engine.canvas.height + gridStep; y += gridStep) {
    engine.ctx.beginPath();
    engine.ctx.moveTo(0, y + drift);
    engine.ctx.lineTo(engine.canvas.width, y + drift + (isBoss ? 20 : 8));
    engine.ctx.stroke();
  }

  if (isBoss) {
    engine.ctx.globalAlpha = 0.16;
    engine.ctx.fillStyle = tier >= 4
      ? "#e879f9"
      : tier === 3
        ? "#a855f7"
        : tier === 2
          ? "#f43f5e"
          : "#38bdf8";
    for (let i = 0; i < 5 + tier * 2; i++) {
      const x = ((time * 0.05 + i * 91) % (engine.canvas.width + 120)) - 60;
      engine.ctx.fillRect(x, 0, 2, engine.canvas.height);
    }
  }

  engine.ctx.globalAlpha = 1;
}
