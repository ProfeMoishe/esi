// Pac‑Man mini — single file game logic (CORREGIDO)
(() => {
  const canvas = document.getElementById('game');
  let ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const mapSelect = document.getElementById('mapSelect');

  const TILE = 16;
  const COLS = 20;
  const ROWS = 20;
  const W = TILE * COLS;
  const H = TILE * ROWS;

  // TRES MAPAS COMPLETOS
  const rawMaps = [
    // Map 1 (original)
    [
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
      "11101010110110110111",
      "10000010001000000001",
      "10111111101111111001",
      "10000000000000000001",
      "11110101111101110111",
      "10000101000001000001",
      "10111101101101111101",
      "10000000001100000001",
      "10000000000000000001",
      "11111111111111111111"
    ],
    // Map 2 (más abierto)
    [
      "11111111111111111111",
      "10000000000000000001",
      "10111101111101111101",
      "10000100000001000001",
      "11110101111101110111",
      "10000000000000000001",
      "10111111101111111001",
      "10000010001000000001",
      "10111010101101110111",
      "10001010100010000001",
      "10111010101101110111",
      "10000010001000000001",
      "10111111101111111001",
      "10000000000000000001",
      "11110101111101110111",
      "10000101000001000001",
      "10111101101101111101",
      "10000000001100000001",
      "10000000000000000001",
      "11111111111111111111"
    ],
    // Map 3 (laberinto alternativo)
    [
      "11111111111111111111",
      "10001000100010001001",
      "10101011101011101001",
      "10001000000000100001",
      "11101110111011101111",
      "10000010001000100001",
      "10111010101110101101",
      "10000000000000000001",
      "11111101111101111111",
      "10000000001000000001",
      "11111101111101111111",
      "10000000000000000001",
      "10111010101110101101",
      "10000010001000100001",
      "11101110111011101111",
      "10001000000000100001",
      "10101011101011101001",
      "10001000100010001001",
      "10000000000000000001",
      "11111111111111111111"
    ]
  ];

  let currentMapIndex = parseInt(mapSelect.value || '0', 10);
  let map = rawMaps[currentMapIndex].map(r => r.split('').map(ch => +ch));

  // Configuración HiDPI
  function setupCanvas() {
    const DPR = window.devicePixelRatio || 1;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx = canvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  setupCanvas();

  // Dots
  let dots = [];
  function resetDots() {
    dots = [];
    for (let y = 0; y < ROWS; y++) {
      dots[y] = [];
      for (let x = 0; x < COLS; x++) {
        dots[y][x] = (map[y][x] === 0);
      }
    }
  }

  // Pacman
  const pac = {
    x: 1, y: 1,
    px: 1 * TILE + TILE/2,
    py: 1 * TILE + TILE/2,
    dir: {x: 0, y: 0},
    nextDir: {x: 0, y: 0},
    speed: 2.0,
    mouth: 0,
    alive: true,
    radius: 10
  };

  // CLASE GHOST CORREGIDA
  class Ghost {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.px = x * TILE + TILE/2;
      this.py = y * TILE + TILE/2;
      this.dir = {x: 1, y: 0};
      this.color = color;
      this.speed = 1.4;
      this.radius = 10;
    }

    isCentered() {
      const centerX = this.x * TILE + TILE/2;
      const centerY = this.y * TILE + TILE/2;
      return Math.abs(this.px - centerX) < 0.5 && Math.abs(this.py - centerY) < 0.5;
    }

    getValidDirections() {
      const valid = [];
      const dirs = [
        {x: 1, y: 0},
        {x: -1, y: 0},
        {x: 0, y: 1},
        {x: 0, y: -1}
      ];
      
      for (const d of dirs) {
        const nx = this.x + d.x;
        const ny = this.y + d.y;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && map[ny][nx] === 0) {
          valid.push(d);
        }
      }
      return valid;
    }

    update() {
      if (this.isCentered()) {
        const validDirs = this.getValidDirections();
        
        if (validDirs.length > 0) {
          const opposite = {x: -this.dir.x, y: -this.dir.y};
          let possibleDirs = validDirs;
          
          if (validDirs.length > 1) {
            possibleDirs = validDirs.filter(d => !(d.x === opposite.x && d.y === opposite.y));
            if (possibleDirs.length === 0) possibleDirs = validDirs;
          }
          
          possibleDirs.sort((a, b) => {
            const distA = Math.abs((this.x + a.x) - pac.x) + Math.abs((this.y + a.y) - pac.y);
            const distB = Math.abs((this.x + b.x) - pac.x) + Math.abs((this.y + b.y) - pac.y);
            return distA - distB + (Math.random() - 0.5) * 1.5;
          });
          
          this.dir = possibleDirs[0];
        }
      }
      
      this.px += this.dir.x * this.speed;
      this.py += this.dir.y * this.speed;
      
      const newX = Math.round((this.px - TILE/2) / TILE);
      const newY = Math.round((this.py - TILE/2) / TILE);
      
      if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS && map[newY][newX] === 0) {
        this.x = newX;
        this.y = newY;
      } else {
        this.px -= this.dir.x * this.speed;
        this.py -= this.dir.y * this.speed;
      }
    }
  }

  const ghosts = [
    new Ghost(18, 1, '#ff5b5b'),
    new Ghost(18, 18, '#5bd6ff')
  ];

  let score = 0;
  let running = false;
  let lastTime = 0;

  function loadMap(index) {
    currentMapIndex = index;
    map = rawMaps[currentMapIndex].map(r => r.split('').map(ch => +ch));
    resetGame();
  }

  function resetGame() {
    setupCanvas();
    resetDots();
    pac.x = 1; pac.y = 1;
    pac.px = pac.x * TILE + TILE/2;
    pac.py = pac.y * TILE + TILE/2;
    pac.dir = {x: 0, y: 0};
    pac.nextDir = {x: 0, y: 0};
    pac.alive = true;
    pac.mouth = 0;
    
    ghosts[0] = new Ghost(18, 1, '#ff5b5b');
    ghosts[1] = new Ghost(18, 18, '#5bd6ff');
    
    score = 0;
    updateScore();
    statusEl.textContent = 'Listo';
    draw();
  }

  function updateScore() {
    scoreEl.textContent = String(score);
  }

  function isCentered(px, py) {
    const x = Math.round((px - TILE/2) / TILE);
    const y = Math.round((py - TILE/2) / TILE);
    const centerX = x * TILE + TILE/2;
    const centerY = y * TILE + TILE/2;
    return Math.abs(px - centerX) < 0.5 && Math.abs(py - centerY) < 0.5;
  }

  function canMoveTile(tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return false;
    return map[ty][tx] === 0;
  }

  function attemptTurn() {
    if (isCentered(pac.px, pac.py)) {
      const nx = pac.x + pac.nextDir.x;
      const ny = pac.y + pac.nextDir.y;
      if (canMoveTile(nx, ny)) {
        pac.dir = {...pac.nextDir};
      }
    }
  }

  function update(dt) {
    if (!running || !pac.alive) return;
    
    // Movimiento de Pacman
    attemptTurn();
    
    if (pac.dir.x !== 0 || pac.dir.y !== 0) {
      const nextX = pac.x + pac.dir.x;
      const nextY = pac.y + pac.dir.y;
      
      if (canMoveTile(nextX, nextY)) {
        pac.px += pac.dir.x * pac.speed;
        pac.py += pac.dir.y * pac.speed;
        
        if (isCentered(pac.px, pac.py)) {
          pac.x = nextX;
          pac.y = nextY;
        }
      } else {
        pac.px = pac.x * TILE + TILE/2;
        pac.py = pac.y * TILE + TILE/2;
        pac.dir = {x: 0, y: 0};
      }
    }
    
    // Comer puntos
    if (isCentered(pac.px, pac.py)) {
      if (dots[pac.y] && dots[pac.y][pac.x]) {
        dots[pac.y][pac.x] = false;
        score += 10;
        updateScore();
        
        if (countRemainingDots() === 0) {
          running = false;
          statusEl.textContent = '¡GANASTE!';
        }
      }
    }
    
    pac.mouth += dt * 0.01;
    
    for (const g of ghosts) {
      g.update();
    }
    
    // Colisiones
    for (const g of ghosts) {
      const dx = Math.abs(g.px - pac.px);
      const dy = Math.abs(g.py - pac.py);
      const distance = Math.hypot(dx, dy);
      
      if (distance < (pac.radius + g.radius) * 0.8) {
        pac.alive = false;
        running = false;
        statusEl.textContent = 'Perdiste';
      }
    }
  }

  function countRemainingDots() {
    let c = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (dots[y] && dots[y][x]) c++;
      }
    }
    return c;
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    
    // Paredes
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (map[y][x] === 1) {
          ctx.fillStyle = '#1536a6';
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x * TILE + TILE * 0.12, y * TILE + TILE * 0.12, TILE * 0.76, TILE * 0.76);
        }
      }
    }
    
    // Puntos
    ctx.fillStyle = '#ffd35a';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (dots[y] && dots[y][x]) {
          ctx.beginPath();
          ctx.arc(x * TILE + TILE/2, y * TILE + TILE/2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    // Pacman
    const mouthOpen = Math.abs(Math.sin(pac.mouth)) * 0.45;
    const angle = pac.dir.x === 0 && pac.dir.y === 0 ? 0 : Math.atan2(pac.dir.y, pac.dir.x);
    ctx.fillStyle = '#ffd400';
    ctx.beginPath();
    ctx.arc(pac.px, pac.py, pac.radius, angle + mouthOpen, angle + Math.PI * 2 - mouthOpen);
    ctx.lineTo(pac.px, pac.py);
    ctx.fill();
    
    // Fantasmas
    for (const g of ghosts) {
      ctx.save();
      ctx.translate(g.px, g.py);
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(0, -2, 9, Math.PI, 0);
      ctx.rect(-9, -2, 18, 12);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-4, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-4, 0, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4, 0, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min(ts - lastTime, 32);
    lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Controles
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    let nx = 0, ny = 0;
    if (key === 'ArrowUp' || key.toLowerCase() === 'w') { nx = 0; ny = -1; }
    if (key === 'ArrowDown' || key.toLowerCase() === 's') { nx = 0; ny = 1; }
    if (key === 'ArrowLeft' || key.toLowerCase() === 'a') { nx = -1; ny = 0; }
    if (key === 'ArrowRight' || key.toLowerCase() === 'd') { nx = 1; ny = 0; }
    
    if (nx !== 0 || ny !== 0) {
      pac.nextDir = {x: nx, y: ny};
      e.preventDefault();
    }
    
    if (key === ' ') {
      togglePause();
      e.preventDefault();
    }
  });

  startBtn.addEventListener('click', () => {
    running = true;
    statusEl.textContent = 'Jugando';
  });
  
  pauseBtn.addEventListener('click', togglePause);
  
  resetBtn.addEventListener('click', () => {
    resetGame();
  });
  
  mapSelect.addEventListener('change', (e) => {
    const idx = parseInt(e.target.value, 10) || 0;
    loadMap(idx);
  });
  
  function togglePause() {
    if (!pac.alive) return;
    running = !running;
    statusEl.textContent = running ? 'Jugando' : 'Pausado';
  }
  
  // Iniciar juego
  loadMap(currentMapIndex);
  requestAnimationFrame(loop);
})();
