import fs from 'fs';
let code = fs.readFileSync('src/game/engine.ts', 'utf8');

// Homing timer
code = code.replace(/b\.homingTimer = 3\.0/g, 'b.homingTimer = 0.8');
code = code.replace(/blt\.homingTimer = 3\.0/g, 'blt.homingTimer = 0.8');

// Bullet rendering size
const oldBulletRender = `    this.bullets.forEach(b => {
      this.ctx.save();
      this.ctx.fillStyle = b.color;
      this.ctx.shadowColor = b.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(b.x, b.y, b.width, b.height);
      this.ctx.restore();
    });`;
const newBulletRender = `    this.bullets.forEach(b => {
      this.ctx.save();
      this.ctx.fillStyle = b.color;
      this.ctx.shadowColor = b.color;
      this.ctx.shadowBlur = 10;
      if (b.isEnemy) {
        const vw = b.width * 1.5;
        const vh = b.height * 1.5;
        this.ctx.fillRect(b.x - (vw - b.width)/2, b.y - (vh - b.height)/2, vw, vh);
      } else {
        this.ctx.fillRect(b.x, b.y, b.width, b.height);
      }
      this.ctx.restore();
    });`;
code = code.replace(oldBulletRender, newBulletRender);

// Player rendering
const oldPlayerRender = `    // Player Rendering
    if (this.player.invulnTimer <= 0 || Math.floor(performance.now() / 80) % 2 === 0) {
      this.ctx.save();
      if (this.player.invulnTimer > 0) this.ctx.globalAlpha = 0.45;

      const px = this.player.x;
      const py = this.player.y;
      const pw = this.player.width;
      const ph = this.player.height;

      this.ctx.fillStyle = shipColors[this.player.color];
      this.ctx.beginPath();
      this.ctx.moveTo(px + pw/2, py);
      this.ctx.lineTo(px + pw, py + ph);
      this.ctx.lineTo(px + pw/2, py + ph - 8);
      this.ctx.lineTo(px, py + ph);
      this.ctx.closePath();
      this.ctx.fill();

      // Core
      this.ctx.fillStyle = '#67e8f9';
      this.ctx.beginPath();
      this.ctx.arc(px + pw/2, py + ph/2 + 2, 4, 0, Math.PI*2);
      this.ctx.fill();

      // Engine Thruster
      this.ctx.fillStyle = '#f97316';
      this.ctx.fillRect(px + pw/2 - 4, py + ph - 4, 8, Math.random() * 12 + 6);
      this.ctx.fillStyle = '#facc15';
      this.ctx.fillRect(px + pw/2 - 2, py + ph - 4, 4, Math.random() * 6 + 3);

      this.ctx.restore();
    }`;

const newPlayerRender = `    // Player Rendering
    if (this.player.invulnTimer <= 0 || Math.floor(performance.now() / 80) % 2 === 0) {
      this.ctx.save();
      if (this.player.invulnTimer > 0) this.ctx.globalAlpha = 0.45;

      const px = this.player.x;
      const py = this.player.y;
      const pw = this.player.width;
      const ph = this.player.height;

      this.ctx.translate(px + pw/2, py + ph/2);
      this.ctx.rotate(this.player.tilt * 0.4);
      this.ctx.translate(-(px + pw/2), -(py + ph/2));

      this.ctx.fillStyle = shipColors[this.player.color];
      this.ctx.beginPath();
      this.ctx.moveTo(px + pw/2, py);
      this.ctx.lineTo(px + pw, py + ph);
      this.ctx.lineTo(px + pw/2, py + ph - 10);
      this.ctx.lineTo(px, py + ph);
      this.ctx.closePath();
      this.ctx.fill();

      // Cockpit styling
      this.ctx.fillStyle = '#64748b';
      this.ctx.fillRect(px + 4, py + ph - 16, 6, 14);
      this.ctx.fillRect(px + pw - 10, py + ph - 16, 6, 14);

      // Core
      this.ctx.fillStyle = '#67e8f9';
      this.ctx.beginPath();
      this.ctx.arc(px + pw/2, py + ph/2 + 2, 5, 0, Math.PI*2);
      this.ctx.fill();

      // Engine Thruster
      this.ctx.fillStyle = '#f97316';
      this.ctx.fillRect(px + pw/2 - 6, py + ph - 8, 12, Math.random() * 16 + 8);
      this.ctx.fillStyle = '#facc15';
      this.ctx.fillRect(px + pw/2 - 3, py + ph - 8, 6, Math.random() * 10 + 4);

      this.ctx.restore();
    }`;

code = code.replace(oldPlayerRender, newPlayerRender);

// Boss phases replacement
// Wait, boss phases were 1 to 3 before.
// We need to replace it.
const bossPatternRegex = /if \(e\.patternTimer > e\.phaseDuration\) \{([\s\S]*?)turrets\n\s*\}/;
code = code.replace(bossPatternRegex, `if (e.patternTimer > e.phaseDuration) {
           e.phase = Math.floor(Math.random() * 6) + 1; // 1 to 6
           e.patternTimer = 0;
           e.phaseDuration = Math.random() * 3 + 4; // 4 to 7s
           e.rapidFireCount = 0;
           e.spawnPoint = Math.floor(Math.random() * 3) + 2; // 2 to 4 turrets
        }`);

fs.writeFileSync('src/game/engine.ts', code);
