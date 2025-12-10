// Pac‑Man mini — single file game logic
// Usa canvas 320x320, grid 20x20, tile 16px
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');

  const TILE = 16;
  const COLS = 20;
  const ROWS = 20;
  const W = TILE * COLS;
  const H = TILE * ROWS;

  canvas.width = W;
  canvas.height = H;

  // simple map: 0 = empty(dot will be placed), 1 = wall
  // border walls + some internal walls for simple maze
  const rawMap = [
    "11111111111111111111",
    "10000000001100000001",
    "10111101101101111101",
    "10000101000001000001",
    "11110101111101110111",
    "10000000000000000001",
    "10111111101111111001",
    "10000010001000000001",
    "11111010101101111111",
    "00001010100010100000",
    "11111010101101111111",
    "10000010001000000001",
    "10111111101111111001",
    "10000000000000000001",
    "11110101111101110111",
    "10000101000001000001",
    "10111101101101111101",
    "10000000001100000001",
    "10000000000000000001",
    "11111111111111111111"
  ];

  const map = rawMap.map(r => r.split('').map(ch => +ch));

  // dots: place where map == 0
  let dots = [];
  function resetDots(){
    dots = [];
    for(let y=0;y<ROWS;y++){
      dots[y]=[];
      for(let x=0;x<COLS;x++){
        dots[y][x] = (map[y][x] === 0);
      }
    }
    // optionally remove a few to create tunnels
    dots[9][0] = false;
    dots[9][19] = false;
  }

  // Pacman state
  const pac = {
    x: 1, y: 1, // tile coords
    px: 1 * TILE + TILE/2,
    py: 1 * TILE + TILE/2,
    dir: {x:0,y:0},
    nextDir: {x:0,y:0},
    speed: 2.0, // pixels per frame
    mouth: 0,
    alive: true
  };

  // ghosts
  const ghostColors = ['#ff5b5b','#5bd6ff','#9b5bff','#ffb36b'];
  class Ghost {
    constructor(x,y,color){
      this.x=x; this.y=y;
      this.px = x*TILE + TILE/2;
      this.py = y*TILE + TILE/2;
      this.dir = {x:1,y:0};
      this.color = color;
      this.speed = 1.4;
      this.fright = false;
    }
    update(){
      // simple random movement at intersections, avoid walls
      if (aligned(this.px,this.py)) {
        const cx = Math.round(this.px / TILE);
        const cy = Math.round(this.py / TILE);
        const choices = [];
        const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        for (const d of dirs){
          const nx = cx + d.x;
          const ny = cy + d.y;
          if (nx<0||nx>=COLS||ny<0||ny>=ROWS) continue;
          if (map[ny][nx] === 0) choices.push(d);
        }
        // avoid reversing unless forced
        if (choices.length > 1){
          const opposite = {x:-this.dir.x, y:-this.dir.y};
          const filtered = choices.filter(c => !(c.x===opposite.x && c.y===opposite.y));
          if (filtered.length) choices.splice(0, choices.length, ...filtered);
        }
        if (choices.length){
          // choose towards pacman with some randomness
          choices.sort((a,b)=>{
            const da = Math.abs((cx+a.x)-pac.x) + Math.abs((cy+a.y)-pac.y);
            const db = Math.abs((cx+b.x)-pac.x) + Math.abs((cy+b.y)-pac.y);
            return da - db + (Math.random()-0.5)*2;
          });
          this.dir = choices[0];
        }
      }
      this.px += this.dir.x * this.speed;
      this.py += this.dir.y * this.speed;
      this.x = Math.round(this.px / TILE);
      this.y = Math.round(this.py / TILE);
    }
  }

  const ghosts = [
    new Ghost(18,1,ghostColors[0]),
    new Ghost(18,18,ghostColors[1])
  ];

  let score = 0;
  let running = false;
  let lastTime = 0;

  function resetGame(){
    resetDots();
    pac.x = 1; pac.y = 1; pac.px = pac.x*TILE+TILE/2; pac.py = pac.y*TILE+TILE/2;
    pac.dir = {x:0,y:0}; pac.nextDir={x:0,y:0}; pac.alive=true; pac.mouth=0;
    ghosts[0].px = 18*TILE+TILE/2; ghosts[0].py = 1*TILE+TILE/2;
    ghosts[1].px = 18*TILE+TILE/2; ghosts[1].py = 18*TILE+TILE/2;
    score = 0;
    updateScore();
    statusEl.textContent = 'Listo';
    draw();
  }

  function updateScore(){ scoreEl.textContent = String(score); }

  function aligned(px,py){
    return Math.abs(px % TILE - TILE/2) < 0.01 || Math.abs(px % TILE - TILE/2) > TILE - 0.01 || Math.abs(py % TILE - TILE/2) < 0.01 || Math.abs(py % TILE - TILE/2) > TILE - 0.01;
  }

  function canMoveTile(tx,ty){
    if (tx<0||tx>=COLS||ty<0||ty>=ROWS) return false;
    return map[ty][tx] === 0;
  }

  function attemptTurn(){
    // Only allow turn when centered in tile
    if (Math.abs((pac.px - TILE/2) % TILE) < 0.01 && Math.abs((pac.py - TILE/2) % TILE) < 0.01){
      const nx = pac.x + pac.nextDir.x;
      const ny = pac.y + pac.nextDir.y;
      if (canMoveTile(nx,ny)){
        pac.dir = {...pac.nextDir};
      } else {
        // try keep current dir if possible
        const cx = pac.x + pac.dir.x;
        const cy = pac.y + pac.dir.y;
        if (!canMoveTile(cx,cy)){
          pac.dir = {x:0,y:0};
        }
      }
    }
  }

  function update(dt){
    if (!running) return;
    // handle pacman movement
    attemptTurn();
    // if moving, check next tile collision
    const nextPx = pac.px + pac.dir.x * pac.speed;
    const nextPy = pac.py + pac.dir.y * pac.speed;

    const nextTileX = Math.round((nextPx - TILE/2) / TILE);
    const nextTileY = Math.round((nextPy - TILE/2) / TILE);
    // compute intended tile coordinates
    const intendedTileX = pac.x + pac.dir.x;
    const intendedTileY = pac.y + pac.dir.y;
    if (pac.dir.x !== 0 || pac.dir.y !== 0){
      // stop if next tile is wall and we would hit it
      if (!canMoveTile(intendedTileX,intendedTileY)){
        // check if we are close to center; snap to center
        // don't move across wall
        // snap px/py to center of current tile
        pac.px = pac.x*TILE + TILE/2;
        pac.py = pac.y*TILE + TILE/2;
        pac.dir = {x:0,y:0};
      } else {
        pac.px = nextPx;
        pac.py = nextPy;
        pac.x = Math.round((pac.px - TILE/2) / TILE);
        pac.y = Math.round((pac.py - TILE/2) / TILE);
      }
    }

    // eat dots when centered on tile
    if (Math.abs(pac.px - (pac.x*TILE + TILE/2)) < 0.5 && Math.abs(pac.py - (pac.y*TILE + TILE/2)) < 0.5){
      if (dots[pac.y] && dots[pac.y][pac.x]){
        dots[pac.y][pac.x] = false;
        score += 10;
        updateScore();
        if (countRemainingDots() === 0){
          running = false;
          statusEl.textContent = '¡Ganaste!';
        }
      }
    }

    // animate mouth
    pac.mouth += dt * 0.01;
    // ghosts update
    for (const g of ghosts) g.update();

    // check collisions with ghosts
    for (const g of ghosts) {
      const dx = Math.abs(g.px - pac.px);
      const dy = Math.abs(g.py - pac.py);
      if (Math.hypot(dx,dy) < 12) {
        // Pacman dies
        running = false;
        pac.alive = false;
        statusEl.textContent = 'Perdiste';
      }
    }
  }

  function countRemainingDots(){
    let c=0;
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) if (dots[y] && dots[y][x]) c++;
    return c;
  }

  function draw(){
    // clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,W,H);

    // draw walls
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        if (map[y][x] === 1){
          ctx.fillStyle = '#1536a6';
          ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
          // small inner shadow
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x*TILE+TILE*0.12,y*TILE+TILE*0.12,TILE*0.76,TILE*0.76);
        }
      }
    }

    // draw dots
    ctx.fillStyle = '#ffd35a';
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        if (dots[y] && dots[y][x]){
          const cx = x*TILE + TILE/2;
          const cy = y*TILE + TILE/2;
          ctx.beginPath();
          ctx.arc(cx,cy,2,0,Math.PI*2);
          ctx.fill();
        }
      }
    }

    // draw pacman
    const mouthOpen = Math.abs(Math.sin(pac.mouth)) * 0.35;
    const px = pac.px;
    const py = pac.py;
    const dirAngle = Math.atan2(pac.dir.y, pac.dir.x);
    let angle = dirAngle;
    if (pac.dir.x===0 && pac.dir.y===0) angle = 0;
    ctx.fillStyle = '#ffd400';
    ctx.beginPath();
    // if stationary, default facing right
    const a1 = angle + mouthOpen;
    const a2 = angle + Math.PI*2 - mouthOpen;
    ctx.moveTo(px,py);
    ctx.arc(px,py,10,a1,a2,false);
    ctx.closePath();
    ctx.fill();

    // draw ghosts
    for (const g of ghosts){
      ctx.save();
      ctx.translate(g.px,g.py);
      ctx.fillStyle = g.color;
      // body
      ctx.beginPath();
      ctx.arc(0,-2,9,Math.PI,0);
      ctx.rect(-9, -2, 18, 12);
      ctx.fill();
      // eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-4,0,2.6,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(4,0,2.6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-4,0,1.1,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(4,0,1.1,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  // main loop
  function loop(ts){
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // input
  window.addEventListener('keydown', (e)=>{
    const key = e.key;
    let nx=0, ny=0;
    if (key === 'ArrowUp' || key.toLowerCase()==='w') { nx=0; ny=-1; }
    if (key === 'ArrowDown' || key.toLowerCase()==='s') { nx=0; ny=1; }
    if (key === 'ArrowLeft' || key.toLowerCase()==='a') { nx=-1; ny=0; }
    if (key === 'ArrowRight' || key.toLowerCase()==='d') { nx=1; ny=0; }
    if (nx!==0 || ny!==0){
      pac.nextDir = {x:nx,y:ny};
      e.preventDefault();
    }
    if (key === ' '){
      // space to toggle pause
      togglePause();
      e.preventDefault();
    }
  });

  startBtn.addEventListener('click', ()=>{
    running = true;
    statusEl.textContent = 'Jugando';
  });
  pauseBtn.addEventListener('click', togglePause);
  resetBtn.addEventListener('click', ()=>{
    resetGame();
  });

  function togglePause(){
    running = !running;
    statusEl.textContent = running ? 'Jugando' : 'Pausado';
  }

  // init
  resetGame();
  requestAnimationFrame(loop);
})();
