import fs from 'fs';
let code = fs.readFileSync('src/game/engine.ts', 'utf8');

code = code.replace(`} } else if (e.phase === 3) {`, `} else if (e.phase === 3) {`);

fs.writeFileSync('src/game/engine.ts', code);
