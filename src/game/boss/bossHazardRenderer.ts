/**
 * 보스 해저드 렌더러
 *
 * 이 파일은 engine.ts에 있던 보스 패턴 해저드와 보스 클리어 오버레이 렌더링을 분리한 파일이다.
 * 보스 전기장, 그리드 레이저, 자폭 드론, 안전지대, 압축장, 미로, 클리어 문구의 시각 디자인을 수정할 때 이 파일을 수정한다.
 * 해저드의 이동, 충돌 판정, 생성 타이밍은 bossPatternHazardSystem.ts에서 처리한다.
 */

type BossHazardRenderRuntime = any;

/**
 * 현재 보스 해저드 상태 배열을 읽어 전기장, 레이저, 드론, 장판, 압축장, 전기 미로를 캔버스에 그린다.
 */
export function renderBossPatternHazards(engine: BossHazardRenderRuntime) {
  const now = performance.now();

  engine.bossElectricTrails.forEach((trail) => {
    const alpha = Math.max(0, trail.life / trail.maxLife);
    engine.ctx.save();
    engine.ctx.globalAlpha = alpha;
    engine.ctx.shadowColor = "#38bdf8";
    engine.ctx.shadowBlur = 18;
    engine.ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    engine.ctx.lineWidth = trail.width;
    engine.ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = trail.x1 + (trail.x2 - trail.x1) * t + (Math.random() - 0.5) * 13;
      const y = trail.y1 + (trail.y2 - trail.y1) * t + (Math.random() - 0.5) * 13;
      if (i === 0) engine.ctx.moveTo(x, y);
      else engine.ctx.lineTo(x, y);
    }
    engine.ctx.stroke();
    engine.ctx.strokeStyle = "#ffffff";
    engine.ctx.lineWidth = Math.max(3, trail.width * 0.22);
    engine.ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const x = trail.x1 + (trail.x2 - trail.x1) * t + (Math.random() - 0.5) * 7;
      const y = trail.y1 + (trail.y2 - trail.y1) * t + (Math.random() - 0.5) * 7;
      if (i === 0) engine.ctx.moveTo(x, y);
      else engine.ctx.lineTo(x, y);
    }
    engine.ctx.stroke();
    engine.ctx.restore();
  });

  if (engine.bossEntity?.phase === 20) {
    const boss = engine.bossEntity;
    const px = engine.player.x + engine.player.width / 2;
    const py = engine.player.y + engine.player.height / 2;
    boss.satellites.forEach((missile, index) => {
      if (!missile.active) return;
      const mx = missile.x + missile.width / 2;
      const my = missile.y + missile.height / 2;
      const armed = index === boss.burstCount;
      const blink = Math.floor(now / 110) % 2 === 0;
      engine.ctx.save();
      engine.ctx.globalAlpha = armed ? 1 : 0.55;
      engine.ctx.strokeStyle = armed && blink ? "#facc15" : "#38bdf8";
      engine.ctx.setLineDash(armed ? [8, 6] : [3, 8]);
      engine.ctx.lineWidth = armed ? 2.2 : 1.0;
      engine.ctx.beginPath();
      engine.ctx.moveTo(mx, my);
      engine.ctx.lineTo(px, py);
      engine.ctx.stroke();
      engine.ctx.setLineDash([]);
      engine.ctx.translate(mx, my);
      const angle = Math.atan2(py - my, px - mx) + Math.PI / 2;
      engine.ctx.rotate(angle);
      engine.ctx.shadowColor = armed ? "#a3e635" : "#22d3ee";
      engine.ctx.shadowBlur = armed ? 20 : 10;
      engine.ctx.fillStyle = armed && blink ? "#a3e635" : "#020617";
      engine.ctx.strokeStyle = armed ? "#ffffff" : "#22d3ee";
      engine.ctx.lineWidth = 2;
      engine.ctx.beginPath();
      engine.ctx.moveTo(0, -21);
      engine.ctx.lineTo(10, -4);
      engine.ctx.lineTo(7, 15);
      engine.ctx.lineTo(3, 9);
      engine.ctx.lineTo(0, 22);
      engine.ctx.lineTo(-3, 9);
      engine.ctx.lineTo(-7, 15);
      engine.ctx.lineTo(-10, -4);
      engine.ctx.closePath();
      engine.ctx.fill();
      engine.ctx.stroke();
      engine.ctx.strokeStyle = armed ? "#0f172a" : "#67e8f9";
      engine.ctx.lineWidth = 1.2;
      engine.ctx.beginPath();
      engine.ctx.moveTo(-7, -3);
      engine.ctx.lineTo(7, -3);
      engine.ctx.moveTo(-5, 8);
      engine.ctx.lineTo(5, 8);
      engine.ctx.stroke();
      engine.ctx.restore();
    });
  }

  if (engine.bossEntity?.phase === 28) {
    const boss = engine.bossEntity;
    const cycle = (boss.shootTimer || 0) % 4.6;
    const cx = boss.x + boss.width / 2;
    const cy = boss.y + boss.height / 2;
    const laserAngle = boss.laserAngle !== undefined ? boss.laserAngle : Math.PI / 2;
    const degree30 = Math.PI / 6;
    const offsets = [0, -degree30, degree30];

    engine.ctx.save();
    offsets.forEach((offset, index) => {
      const angle = laserAngle + offset;
      const firing =
        (offset === 0 && cycle >= 2.35 && cycle < 2.7) ||
        (Math.abs(offset) === degree30 && cycle >= 2.95 && cycle < 3.3);
      const prepping = cycle >= 1.35 && cycle < 2.35;
      const waiting = cycle < 3.3 && !firing;
      if (!firing && !waiting) return;

      if (firing) {
        const hue = (performance.now() * 0.1 + index * 45) % 360;
        engine.ctx.strokeStyle = `hsla(${hue}, 85%, 60%, 0.88)`;
        engine.ctx.lineWidth = 40;
        engine.ctx.shadowColor = `hsla(${hue}, 90%, 50%, 0.9)`;
        engine.ctx.shadowBlur = 24;
        engine.ctx.setLineDash([]);
      } else {
        const centerBias = offset === 0 ? 1 : 0.65;
        const blink = Math.floor(performance.now() / (prepping ? 70 : 130) + index) % 2 === 0;
        engine.ctx.strokeStyle = prepping
          ? (blink ? `rgba(255, 255, 255, ${0.68 * centerBias})` : `rgba(244, 63, 94, ${0.56 * centerBias})`)
          : `rgba(56, 189, 248, ${0.42 * centerBias})`;
        engine.ctx.lineWidth = prepping ? (offset === 0 ? 5 : 3.8) : (offset === 0 ? 2.2 : 1.45);
        engine.ctx.shadowColor = prepping ? "#f43f5e" : "#38bdf8";
        engine.ctx.shadowBlur = prepping ? 18 : 5;
        engine.ctx.setLineDash(prepping ? [] : [7, 6]);
      }

      engine.ctx.beginPath();
      engine.ctx.moveTo(cx, cy);
      engine.ctx.lineTo(cx + Math.cos(angle) * 3000, cy + Math.sin(angle) * 3000);
      engine.ctx.stroke();

      if (firing) {
        engine.ctx.strokeStyle = "#ffffff";
        engine.ctx.lineWidth = 11;
        engine.ctx.setLineDash([]);
        engine.ctx.beginPath();
        engine.ctx.moveTo(cx, cy);
        engine.ctx.lineTo(cx + Math.cos(angle) * 3000, cy + Math.sin(angle) * 3000);
        engine.ctx.stroke();
      }
    });
    engine.ctx.restore();
  }

  engine.bossGridLasers.forEach((laser) => {
    const firing = laser.age >= laser.warnTime;
    engine.ctx.save();
    const drawElectricPath = (width: number, color: string, alpha: number, jitter: number) => {
      engine.ctx.globalAlpha = alpha;
      engine.ctx.strokeStyle = color;
      engine.ctx.lineWidth = width;
      engine.ctx.beginPath();
      const step = 28;
      const max = laser.axis === "x" ? engine.canvas.height : engine.canvas.width;
      for (let t = 0; t <= max + step; t += step) {
        const wobble = (Math.random() - 0.5) * jitter;
        const x = laser.axis === "x" ? laser.pos + wobble : t;
        const y = laser.axis === "x" ? t : laser.pos + wobble;
        if (t === 0) engine.ctx.moveTo(x, y);
        else engine.ctx.lineTo(x, y);
      }
      engine.ctx.stroke();
    };

    if (!firing) {
      const pulse = 0.44 + Math.sin(now * 0.035) * 0.18;
      engine.ctx.setLineDash([10, 7]);
      drawElectricPath(2.4, "#67e8f9", pulse, 5);
      engine.ctx.setLineDash([]);
      drawElectricPath(1.2, "#a3e635", 0.32, 9);
    } else {
      engine.ctx.shadowColor = "#22d3ee";
      engine.ctx.shadowBlur = 24;
      drawElectricPath(laser.width + 18, "rgba(34, 211, 238, 0.32)", 0.95, 13);
      drawElectricPath(laser.width * 0.72, "rgba(163, 230, 53, 0.74)", 0.88, 9);
      drawElectricPath(Math.max(4, laser.width * 0.28), "#ffffff", 0.95, 5);
    }
    engine.ctx.restore();
  });

  engine.bossTimedExplosions.forEach((zone) => {
    const firing = zone.age >= zone.warnTime;
    const progress = firing
      ? Math.min(1, (zone.age - zone.warnTime) / zone.fireTime)
      : Math.min(1, zone.age / zone.warnTime);
    engine.ctx.save();
    if (!firing) {
      engine.ctx.globalAlpha = 0.35 + Math.sin(now * 0.035) * 0.18;
      engine.ctx.strokeStyle = zone.color;
      engine.ctx.lineWidth = 2.4;
      engine.ctx.setLineDash([7, 5]);
      engine.ctx.beginPath();
      engine.ctx.arc(zone.x, zone.y, zone.radius * (0.65 + progress * 0.35), 0, Math.PI * 2);
      engine.ctx.stroke();
      engine.ctx.setLineDash([]);
      engine.ctx.strokeStyle = "#ffffff";
      engine.ctx.globalAlpha = 0.25;
      engine.ctx.beginPath();
      engine.ctx.moveTo(zone.x - zone.radius * 0.75, zone.y);
      engine.ctx.lineTo(zone.x + zone.radius * 0.75, zone.y);
      engine.ctx.moveTo(zone.x, zone.y - zone.radius * 0.75);
      engine.ctx.lineTo(zone.x, zone.y + zone.radius * 0.75);
      engine.ctx.stroke();
    } else {
      const radius = zone.radius * (0.75 + progress * 0.45);
      const grad = engine.ctx.createRadialGradient(zone.x, zone.y, 2, zone.x, zone.y, radius);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.32, zone.color);
      grad.addColorStop(1, "rgba(249, 115, 22, 0)");
      engine.ctx.globalAlpha = 1 - progress * 0.55;
      engine.ctx.fillStyle = grad;
      engine.ctx.beginPath();
      engine.ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
      engine.ctx.fill();
    }
    engine.ctx.restore();
  });

  engine.bossTailMines.forEach((mine) => {
    const firing = mine.age >= mine.warnTime;
    const progress = firing
      ? Math.min(1, (mine.age - mine.warnTime) / mine.fireTime)
      : Math.min(1, mine.age / mine.warnTime);
    engine.ctx.save();
    if (!firing) {
      const pulse = Math.floor(now / 80) % 2 === 0;
      engine.ctx.globalAlpha = pulse ? 0.8 : 0.32;
      engine.ctx.fillStyle = "#38bdf8";
      engine.ctx.shadowColor = "#38bdf8";
      engine.ctx.shadowBlur = 10;
      engine.ctx.beginPath();
      engine.ctx.arc(mine.x, mine.y, 3 + progress * 6, 0, Math.PI * 2);
      engine.ctx.fill();
      engine.ctx.strokeStyle = "rgba(255,255,255,0.55)";
      engine.ctx.lineWidth = 1.2;
      engine.ctx.beginPath();
      engine.ctx.arc(mine.x, mine.y, mine.radius * (0.4 + progress * 0.45), 0, Math.PI * 2);
      engine.ctx.stroke();
    } else {
      engine.ctx.globalAlpha = 1 - progress * 0.45;
      engine.ctx.fillStyle = "rgba(14, 165, 233, 0.34)";
      engine.ctx.shadowColor = "#38bdf8";
      engine.ctx.shadowBlur = 16;
      engine.ctx.beginPath();
      engine.ctx.arc(mine.x, mine.y, mine.radius * (0.75 + progress * 0.35), 0, Math.PI * 2);
      engine.ctx.fill();
      engine.ctx.strokeStyle = "#ffffff";
      engine.ctx.lineWidth = 2;
      engine.ctx.beginPath();
      engine.ctx.arc(mine.x, mine.y, mine.radius * 0.42, 0, Math.PI * 2);
      engine.ctx.stroke();
    }
    engine.ctx.restore();
  });

  engine.bossSuicideDrones.forEach((drone) => {
    if (drone.age < 0) return;
    engine.ctx.save();
    const spawnPulse = 18 + Math.sin((drone.age + drone.order) * 10) * 4;
    if (drone.state === "spawn" || drone.state === "wait") {
      engine.ctx.strokeStyle = "rgba(34, 211, 238, 0.7)";
      engine.ctx.lineWidth = 2;
      engine.ctx.setLineDash([8, 5]);
      engine.ctx.beginPath();
      engine.ctx.arc(drone.x, drone.y, spawnPulse, 0, Math.PI * 2);
      engine.ctx.stroke();
      engine.ctx.setLineDash([]);
    }
    engine.ctx.translate(drone.x, drone.y);
    engine.ctx.rotate(now * 0.004 + drone.order);
    engine.ctx.shadowColor = drone.state === "chase" ? "#fb7185" : "#22d3ee";
    engine.ctx.shadowBlur = drone.state === "chase" ? 16 : 10;
    engine.ctx.fillStyle = drone.state === "chase" ? "#7f1d1d" : "#111827";
    engine.ctx.strokeStyle = drone.state === "chase" ? "#fb7185" : "#22d3ee";
    engine.ctx.lineWidth = 2;
    engine.ctx.beginPath();
    engine.ctx.moveTo(0, -16);
    engine.ctx.lineTo(13, -4);
    engine.ctx.lineTo(8, 14);
    engine.ctx.lineTo(0, 9);
    engine.ctx.lineTo(-8, 14);
    engine.ctx.lineTo(-13, -4);
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.stroke();
    engine.ctx.fillStyle = "#ffffff";
    engine.ctx.beginPath();
    engine.ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    engine.ctx.fill();
    engine.ctx.restore();
  });

  if (engine.bossDashState && (engine.bossDashState.phase === "search" || engine.bossDashState.phase === "lock")) {
    const dash = engine.bossDashState;
    const length = 1800;
    const endX = dash.startX + Math.cos(dash.angle) * length;
    const endY = dash.startY + Math.sin(dash.angle) * length;
    const color = dash.phase === "search" ? "#facc15" : "#f43f5e";
    engine.ctx.save();
    engine.ctx.strokeStyle = color;
    engine.ctx.lineWidth = 84;
    engine.ctx.globalAlpha = dash.phase === "search" ? 0.18 : 0.48;
    engine.ctx.shadowColor = color;
    engine.ctx.shadowBlur = dash.phase === "search" ? 12 : 24;
    engine.ctx.beginPath();
    engine.ctx.moveTo(dash.startX, dash.startY);
    engine.ctx.lineTo(endX, endY);
    engine.ctx.stroke();
    engine.ctx.globalAlpha = dash.phase === "search" ? 0.8 : 1;
    engine.ctx.lineWidth = dash.phase === "search" ? 3 : 8;
    if (dash.phase === "search") engine.ctx.setLineDash([18, 12]);
    engine.ctx.beginPath();
    engine.ctx.moveTo(dash.startX, dash.startY);
    engine.ctx.lineTo(endX, endY);
    engine.ctx.stroke();
    engine.ctx.restore();
  }

  engine.bossSafeZoneBlasts.forEach((blast) => {
    const firing = blast.age >= blast.warnTime;
    const progress = firing
      ? Math.min(1, (blast.age - blast.warnTime) / blast.fireTime)
      : Math.min(1, blast.age / blast.warnTime);
    engine.ctx.save();
    if (!firing) {
      const urgent = blast.warnTime - blast.age <= 1.0;
      const fastBlink = Math.floor(now / 55) % 2 === 0;
      engine.ctx.globalAlpha = urgent
        ? (fastBlink ? 0.46 : 0.16)
        : 0.25 + Math.sin(now * 0.03) * 0.08;
      engine.ctx.fillStyle = "#ef4444";
      engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
      engine.ctx.globalAlpha = urgent ? 1 : 0.88;
      engine.ctx.strokeStyle = urgent && fastBlink ? "#ffffff" : "#22c55e";
      engine.ctx.lineWidth = urgent ? 6 : 4;
      engine.ctx.setLineDash(urgent ? [5, 4] : [12, 8]);
      engine.ctx.beginPath();
      engine.ctx.arc(blast.x, blast.y, blast.radius * (0.82 + progress * 0.18), 0, Math.PI * 2);
      engine.ctx.stroke();
      engine.ctx.setLineDash([]);
      engine.ctx.fillStyle = "rgba(34, 197, 94, 0.14)";
      engine.ctx.beginPath();
      engine.ctx.arc(blast.x, blast.y, blast.radius, 0, Math.PI * 2);
      engine.ctx.fill();
    } else {
      engine.ctx.globalAlpha = 0.54 * (1 - progress * 0.45);
      engine.ctx.fillStyle = "#f43f5e";
      engine.ctx.beginPath();
      engine.ctx.rect(0, 0, engine.canvas.width, engine.canvas.height);
      engine.ctx.arc(blast.x, blast.y, blast.radius, 0, Math.PI * 2, true);
      engine.ctx.fill("evenodd");
      engine.ctx.strokeStyle = "#ffffff";
      engine.ctx.lineWidth = 5;
      engine.ctx.beginPath();
      engine.ctx.arc(blast.x, blast.y, blast.radius, 0, Math.PI * 2);
      engine.ctx.stroke();
    }
    engine.ctx.restore();
  });

  engine.bossAbsorbOrbs.forEach((orb) => {
    engine.ctx.save();
    const r = 17 + Math.sin(now * 0.012 + orb.age * 4) * 3;
    engine.ctx.shadowColor = "#a78bfa";
    engine.ctx.shadowBlur = 18;
    const grad = engine.ctx.createRadialGradient(orb.x, orb.y, 2, orb.x, orb.y, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.42, "#67e8f9");
    grad.addColorStop(1, "rgba(167,139,250,0)");
    engine.ctx.fillStyle = grad;
    engine.ctx.beginPath();
    engine.ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
    engine.ctx.fill();
    engine.ctx.strokeStyle = "#a78bfa";
    engine.ctx.lineWidth = 2;
    engine.ctx.beginPath();
    engine.ctx.arc(orb.x, orb.y, r * 0.7, 0, Math.PI * 2);
    engine.ctx.stroke();
    engine.ctx.restore();
  });

  engine.bossAfterimageSlashes.forEach((slash) => {
    const firing = slash.age >= slash.warnTime;
    const progress = firing
      ? Math.min(1, (slash.age - slash.warnTime) / slash.fireTime)
      : Math.max(0, Math.min(1, slash.age / slash.warnTime));
    engine.ctx.save();
    const drawTear = (width: number, color: string, alpha: number, jitter: number) => {
      const dx = slash.x2 - slash.x1;
      const dy = slash.y2 - slash.y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      engine.ctx.globalAlpha = alpha;
      engine.ctx.strokeStyle = color;
      engine.ctx.lineWidth = width;
      engine.ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const wave = Math.sin(t * 31 + slash.x1 * 0.01 + now * 0.008) * jitter
          + Math.sin(t * 19 + slash.y1 * 0.015) * jitter * 0.55;
        const x = slash.x1 + dx * t + nx * wave;
        const y = slash.y1 + dy * t + ny * wave;
        if (i === 0) engine.ctx.moveTo(x, y);
        else engine.ctx.lineTo(x, y);
      }
      engine.ctx.stroke();
    };
    if (!firing) {
      engine.ctx.setLineDash([12, 8]);
      drawTear(3 + progress * 4, "#c084fc", 0.22 + progress * 0.48, 9);
    } else {
      engine.ctx.shadowColor = "#f43f5e";
      engine.ctx.shadowBlur = 24;
      engine.ctx.setLineDash([]);
      drawTear(slash.width, "rgba(168, 85, 247, 0.72)", 1 - progress * 0.38, 15);
      drawTear(12, "#ffffff", 0.95 - progress * 0.45, 7);
    }
    if (firing) {
      drawTear(5, "#f43f5e", 0.85 - progress * 0.42, 18);
    }
    engine.ctx.restore();
  });

  engine.bossEdgeStrikers.forEach((striker) => {
    engine.ctx.save();
    const angle =
      striker.side === "top"
        ? Math.PI
        : striker.side === "bottom"
          ? 0
          : striker.side === "left"
            ? Math.PI / 2
            : -Math.PI / 2;
    const pulse = 0.72 + Math.sin((now + striker.age * 1000) * 0.02) * 0.28;

    engine.ctx.translate(striker.x, striker.y);
    engine.ctx.rotate(angle);
    engine.ctx.strokeStyle = "#67e8f9";
    engine.ctx.fillStyle = "#082f49";
    engine.ctx.shadowColor = "#38bdf8";
    engine.ctx.shadowBlur = 16;
    engine.ctx.lineWidth = 2;
    engine.ctx.beginPath();
    engine.ctx.moveTo(0, -14);
    engine.ctx.lineTo(12, -3);
    engine.ctx.lineTo(8, 12);
    engine.ctx.lineTo(0, 8);
    engine.ctx.lineTo(-8, 12);
    engine.ctx.lineTo(-12, -3);
    engine.ctx.closePath();
    engine.ctx.fill();
    engine.ctx.stroke();
    engine.ctx.fillStyle = "#ffffff";
    engine.ctx.globalAlpha = pulse;
    engine.ctx.fillRect(-2.5, -8, 5, 11);
    engine.ctx.restore();
  });

  if (engine.bossCompressionField) {
    const field = engine.bossCompressionField;
    const progress = field.age < field.warnTime ? 0 : Math.min(1, (field.age - field.warnTime) / field.closeTime);
    const inset = field.maxInset * progress;
    const topInset = inset * 0.58;
    engine.ctx.save();
    engine.ctx.fillStyle = field.age < field.warnTime ? "rgba(250, 204, 21, 0.12)" : "rgba(244, 63, 94, 0.28)";
    engine.ctx.strokeStyle = field.age < field.warnTime ? "#facc15" : "#f43f5e";
    engine.ctx.shadowColor = "#f43f5e";
    engine.ctx.shadowBlur = 18;
    engine.ctx.fillRect(0, 0, inset, engine.canvas.height);
    engine.ctx.fillRect(engine.canvas.width - inset, 0, inset, engine.canvas.height);
    engine.ctx.fillRect(0, 0, engine.canvas.width, topInset);
    engine.ctx.fillRect(0, engine.canvas.height - topInset, engine.canvas.width, topInset);
    engine.ctx.lineWidth = 3;
    engine.ctx.setLineDash(field.age < field.warnTime ? [10, 8] : []);
    engine.ctx.strokeRect(inset, topInset, engine.canvas.width - inset * 2, engine.canvas.height - topInset * 2);
    engine.ctx.restore();
  }

  if (engine.bossMazeState) {
    const maze = engine.bossMazeState;
    engine.ctx.save();

    maze.walls.forEach((wall, index) => {
      const alpha = 0.68 + Math.sin(now * 0.03 + index) * 0.16;
      engine.ctx.fillStyle = `rgba(8, 47, 73, ${0.42 + alpha * 0.18})`;
      engine.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      engine.ctx.strokeStyle = `rgba(103, 232, 249, ${alpha})`;
      engine.ctx.lineWidth = 3;
      engine.ctx.shadowColor = "#38bdf8";
      engine.ctx.shadowBlur = 18;
      engine.ctx.beginPath();
      for (let x = wall.x; x <= wall.x + wall.width; x += 18) {
        const jitterTop = (Math.random() - 0.5) * 5;
        const jitterBottom = (Math.random() - 0.5) * 5;
        if (x === wall.x) {
          engine.ctx.moveTo(x, wall.y + jitterTop);
        } else {
          engine.ctx.lineTo(x, wall.y + jitterTop);
        }
        engine.ctx.moveTo(x, wall.y + wall.height + jitterBottom);
        engine.ctx.lineTo(Math.min(wall.x + wall.width, x + 9), wall.y + wall.height + jitterBottom);
      }
      engine.ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    });

    engine.ctx.strokeStyle = "#22c55e";
    engine.ctx.fillStyle = "rgba(34, 197, 94, 0.16)";
    engine.ctx.lineWidth = 3;
    engine.ctx.setLineDash([10, 6]);
    engine.ctx.fillRect(maze.exitX, maze.exitY, maze.exitWidth, maze.exitHeight);
    engine.ctx.strokeRect(maze.exitX, maze.exitY, maze.exitWidth, maze.exitHeight);
    engine.ctx.setLineDash([]);

    const remaining = maze.phase === "active" ? Math.max(0, maze.totalTime - maze.age) : maze.totalTime;
    engine.ctx.fillStyle = "#e2e8f0";
    engine.ctx.font = "700 14px Inter, system-ui, sans-serif";
    engine.ctx.textAlign = "center";
    engine.ctx.fillText(`ESCAPE ${remaining.toFixed(1)}s`, engine.canvas.width / 2, 28);

    if (maze.fogAlpha > 0) {
      engine.ctx.fillStyle = `rgba(226, 232, 240, ${maze.fogAlpha})`;
      engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
      const fog = engine.ctx.createRadialGradient(
        engine.player.x + engine.player.width / 2,
        engine.player.y + engine.player.height / 2,
        12,
        engine.player.x + engine.player.width / 2,
        engine.player.y + engine.player.height / 2,
        190,
      );
      fog.addColorStop(0, "rgba(255,255,255,0)");
      fog.addColorStop(1, `rgba(255,255,255,${maze.fogAlpha * 0.75})`);
      engine.ctx.fillStyle = fog;
      engine.ctx.fillRect(0, 0, engine.canvas.width, engine.canvas.height);
    }

    engine.ctx.restore();
  }
}

/**
 * 보스 클리어 메시지 상태에서 챕터 클리어 텍스트와 안정화 문구를 캔버스에 그린다.
 */
export function renderBossClearOverlay(engine: BossHazardRenderRuntime) {
  if (engine.state !== "BOSS_CLEAR_MESSAGE") return;

  const now = performance.now();
  const pulse = 0.82 + Math.sin(now * 0.006) * 0.18;
  const cx = engine.canvas.width / 2;
  const cy = engine.canvas.height * 0.42;

  engine.ctx.save();
  engine.ctx.textAlign = "center";
  engine.ctx.textBaseline = "middle";
  engine.ctx.shadowColor = "#38bdf8";
  engine.ctx.shadowBlur = 24;
  engine.ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
  engine.ctx.font = "800 34px Inter, system-ui, sans-serif";
  engine.ctx.fillText(engine.bossClearLabel || "PHASE CLEAR", cx, cy);
  engine.ctx.shadowBlur = 10;
  engine.ctx.fillStyle = "rgba(56, 189, 248, 0.78)";
  engine.ctx.font = "700 13px Inter, system-ui, sans-serif";
  engine.ctx.fillText("SYSTEM STABILIZED", cx, cy + 42);
  engine.ctx.restore();
}

