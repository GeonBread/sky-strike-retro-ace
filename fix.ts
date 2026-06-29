import fs from 'fs';
let content = fs.readFileSync('src/game/engine.ts', 'utf8');
content = content.replace(/\} else if \(e\.type === 'column_shooter'\) \{\s+e\.y \+= e\.vy \* dt;\s+\} else if \(e\.type === 'v_360_shooter'\) \{/g, "} else if (e.type === 'column_shooter') {\n            if (e.y < e.spawnPoint) e.y += e.vy * dt;\n            else e.vy = 0;\n         } else if (e.type === 'v_360_shooter') {");
fs.writeFileSync('src/game/engine.ts', content);
