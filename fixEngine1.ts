import fs from 'fs';
let code = fs.readFileSync('src/game/engine.ts', 'utf8');

// 1. Box and Entity Hitbox support
code = code.replace(
  `interface Box { x: number; y: number; width: number; height: number; }`,
  `interface Box { x: number; y: number; width: number; height: number; hitWidth?: number; hitHeight?: number; }`
);

code = code.replace(
  `  height: number = 0;`,
  `  height: number = 0;\n  hitWidth?: number;\n  hitHeight?: number;`
);

code = code.replace(
  `  bombs: number = 3;`,
  `  bombs: number = 3;\n  tilt: number = 0;`
);

// 2. Player initialization (scale up, positioning)
code = code.replace(
  `    this.player.width = 24;\n    this.player.height = 24;\n    this.player.x = this.canvas.width / 2 - 12;\n    this.player.y = this.canvas.height - 80;`,
  `    this.player.width = 48;\n    this.player.height = 48;\n    this.player.hitWidth = 10;\n    this.player.hitHeight = 10;\n    this.player.x = this.canvas.width / 2 - 24;\n    this.player.y = this.canvas.height - 100;`
);

// 3. Boss BGM trigger
code = code.replace(
  `      this.bossActive = true;\n      this.state = 'BOSSCUTSCENE';`,
  `      this.bossActive = true;\n      this.state = 'BOSSCUTSCENE';\n      sfx.startBossBgm();`
);

// 4. intersects logic
const oldIntersects = `  intersects(r1: Box, r2: Box) {
    return !(r2.x > r1.x + r1.width || 
             r2.x + r2.width < r1.x || 
             r2.y > r1.y + r1.height ||
             r2.y + r2.height < r1.y);
  }`;
const newIntersects = `  intersects(r1: Box, r2: Box) {
    const w1 = r1.hitWidth || r1.width;
    const h1 = r1.hitHeight || r1.height;
    const ox1 = r1.hitWidth ? (r1.width - r1.hitWidth)/2 : 0;
    const oy1 = r1.hitHeight ? (r1.height - r1.hitHeight)/2 : 0;
    const rx1 = r1.x + ox1;
    const ry1 = r1.y + oy1;

    const w2 = r2.hitWidth || r2.width;
    const h2 = r2.hitHeight || r2.height;
    const ox2 = r2.hitWidth ? (r2.width - r2.hitWidth)/2 : 0;
    const oy2 = r2.hitHeight ? (r2.height - r2.hitHeight)/2 : 0;
    const rx2 = r2.x + ox2;
    const ry2 = r2.y + oy2;

    return !(rx2 > rx1 + w1 || 
             rx2 + w2 < rx1 || 
             ry2 > ry1 + h1 ||
             ry2 + h2 < ry1);
  }`;
code = code.replace(oldIntersects, newIntersects);

// 5. Player logic: tilting
code = code.replace(
  `    this.player.x += dx;\n    this.player.y += dy;`,
  `    this.player.x += dx;\n    this.player.y += dy;\n    const targetTilt = this.input.left ? -1 : (this.input.right ? 1 : 0);\n    this.player.tilt += (targetTilt - this.player.tilt) * 15 * dt;`
);

// Wait, need to check if there are multiple "this.player.x += dx;"
fs.writeFileSync('src/game/engine.ts', code);
