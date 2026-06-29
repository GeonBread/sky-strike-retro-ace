import fs from 'fs';
let code = fs.readFileSync('src/game/engine.ts', 'utf8');

const regex = /else \{\s*\/\/\s*Normal horizontal and combos[\s\S]*?this\.triggerBossBulletCombos\(e\);\s*\}\s*\}/;

const newPhases = `} else if (e.phase === 3) {
           // Normal horizontal and combos
           e.x += e.vx * dt;
           if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;
           
           if (e.lastShot > 0.6) {
              e.lastShot = 0;
              this.triggerBossBulletCombos(e);
           }
        } else if (e.phase === 4) {
           // Spiral pattern
           e.x += e.vx * 0.2 * dt; 
           if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;
           if (e.lastShot > 0.1) {
              e.lastShot = 0;
              e.rapidFireCount++;
              const a = e.rapidFireCount * 0.4;
              const blt = new Bullet(); blt.x = e.x+e.width/2; blt.y = e.y+e.height/2;
              blt.vx = Math.cos(a)*200; blt.vy = Math.sin(a)*200;
              blt.isEnemy = true; blt.color = '#10b981'; blt.width=14; blt.height=14;
              this.bullets.push(blt);
           }
        } else if (e.phase === 5) {
           // Waving arcs
           e.x += e.vx * 0.8 * dt; 
           if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;
           if (e.lastShot > 0.6) {
              e.lastShot = 0;
              const cx = e.x+e.width/2; const cy = e.y+e.height;
              for(let i=0; i<7; i++) {
                 const a = Math.PI/2 + (i-3)*0.2 + (Math.sin(performance.now()*0.005) * 0.2);
                 const blt = new Bullet(); blt.x=cx; blt.y=cy;
                 blt.vx = Math.cos(a)*250; blt.vy=Math.sin(a)*250;
                 blt.isEnemy = true; blt.color = '#38bdf8'; blt.width=14; blt.height=14;
                 this.bullets.push(blt);
              }
           }
        } else {
           // Double Cross Target Shotgun
           e.x += e.vx * 0.5 * dt; 
           if (e.x < 15 || e.x > this.canvas.width - e.width - 15) e.vx *= -1;
           if (e.lastShot > 1.2) {
              e.lastShot = 0;
              const tx = this.player.x + this.player.width/2;
              const ty = this.player.y + this.player.height/2;
              const cx = e.x+e.width/2; const cy = e.y+e.height/2;
              const aToPlayer = Math.atan2(ty-cy, tx-cx);
              for(let i=0; i<7; i++) {
                 const a = aToPlayer + (i-3)*0.15;
                 const blt = new Bullet(); blt.x=cx; blt.y=cy;
                 blt.vx = Math.cos(a)*350; blt.vy=Math.sin(a)*350;
                 blt.isEnemy = true; blt.color = '#f43f5e'; blt.width=16; blt.height=16;
                 this.bullets.push(blt);
              }
           }
        }`;

code = code.replace(regex, newPhases);

fs.writeFileSync('src/game/engine.ts', code);
