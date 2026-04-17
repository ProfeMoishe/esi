// Pac‑Man mini — Power Pellets + Música (FANTASMAS CORREGIDOS)
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

  // MAPAS COMPLETOS
  const rawMaps = [
    // Map 1
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
    // Map 2
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
    // Map 3
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

  // AUDIO
  let audioContext = null;
  let isMusicPlaying = false;
  let musicInterval = null;

  function initAudio() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  function playTone(frequency, duration, volume = 0.3) {
    if (!audioContext) return;
    try {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      gain.gain.value = volume;
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
      oscillator.stop(audioContext.currentTime + duration);
    } catch(e) { console.log('Audio error:', e); }
  }

  function startBackgroundMusic() {
    if (!audioContext || isMusicPlaying) return;
    isMusicPlaying = true;
    
    function playNote(freq, duration) {
      if (!isMusicPlaying) return;
      try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.12;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
        osc.stop(audioContext.currentTime + duration);
      } catch(e) {}
    }
    
    const melody = [
      261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63
    ];
    
    let noteIndex = 0;
    if (musicInterval) clearInterval(musicInterval);
    
    musicInterval = setInterval(() => {
      if (!isMusicPlaying || !running) return;
      playNote(melody[noteIndex % melody.length], 0.25);
      noteIndex++;
    }, 350);
  }

  function stopBackgroundMusic() {
    isMusicPlaying = false;
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
  }

  // POWER PELLETS
  let powerPellets = [];
  let frightenedMode = false;
  let frightenedTimer = 0;
  const FRIGHTENED_DURATION = 8000;

  function resetPowerPellets() {
    powerPellets = [];
    const powerPositions = [
      {x: 1, y: 1}, {x: 18, y: 1},
      {x: 1, y: 18}, {x: 18, y: 18}
    ];
    for (const pos of powerPositions) {
      if (map[pos.y] && map[pos.y][pos.x] === 0) {
        powerPellets.push({x: pos.x, y: pos.y, active: true});
      }
    }
  }

  // DOTS
  let dots = [];
  function resetDots() {
    dots = [];
    for (let y = 0; y < ROWS; y++) {
      dots[y] = [];
      for (let x = 0; x < COLS; x++) {
        dots[y][x] = (map[y][x] === 0);
      }
    }
    for (const pellet of powerPellets) {
      if (pellet.active && dots[pellet.y] && dots[pellet.y][pellet.x]) {
        dots[pellet.y][pellet.x] = false;
      }
    }
  }

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

  // PACMAN
  const pac = {
    x: 1, y: 1,
    px: 1 * TILE + TILE/2,
    py: 1 * TILE + TILE/2,
    dir: {x: 0, y: 0},
    nextDir: {x: 0, y: 0},
    speed: 2.0,
    mouth: 0,
    alive: true,
    radius: 10,
    ghostMultiplier: 1
  };

  // CLASE GHOST CORREGIDA (sin errores de movimiento)
  class Ghost {
    constructor(x, y, color) {
      this.startX = x;
      this.startY = y;
      this.x = x;
      this.y = y;
      this.px = x * TILE + TILE/2;
      this.py = y * TILE + TILE/2;
      this.dir = {x: -1, y: 0}; // Dirección inicial hacia la izquierda
      this.originalColor = color;
      this.color = color;
      this.speed = 1.4;
      this.radius = 10;
      this.frightened = false;
      this.frightenedSpeed = 0.9;
    }

    // Verificar si está exactamente centrado en una celda
    isCentered() {
      const centerX = this.x * TILE + TILE/2;
      const centerY = this.y * TILE + TILE/2;
      return Math.abs(this.px - centerX) < 0.3 && Math.abs(this.py - centerY) < 0.3;
    }

    // Obtener direcciones válidas (que no sean paredes)
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

    setFrightened(enabled) {
      this.frightened = enabled;
      if (enabled) {
        this.color = '#6b6bff';
      } else {
        this.color = this.originalColor;
      }
    }

    respawn() {
      this.x = this.startX;
      this.y = this.startY;
      this.px = this.x * TILE + TILE/2;
      this.py = this.y * TILE + TILE/2;
      this.dir = {x: -1, y: 0};
      this.setFrightened(false);
    }

    update() {
      const currentSpeed = this.frightened ? this.frightenedSpeed : this.speed;
      
      // Solo cambiar dirección cuando está centrado en una celda
      if (this.isCentered()) {
        const validDirs = this.getValidDirections();
        
        if (validDirs.length > 0) {
          // Evitar retroceder (no puede volver por donde vino)
          const opposite = {x: -this.dir.x, y: -this.dir.y};
          let possibleDirs = validDirs.filter(d => !(d.x === opposite.x && d.y === opposite.y));
          
          // Si no hay opciones (callejón sin salida), permitir retroceder
          if (possibleDirs.length === 0) {
            possibleDirs = validDirs;
          }
          
          if (this.frightened) {
            // Modo asustado: movimiento aleatorio
            const randomIndex = Math.floor(Math.random() * possibleDirs.length);
            this.dir = possibleDirs[randomIndex];
          } else {
            // Modo normal: perseguir a Pacman
            possibleDirs.sort((a, b) => {
              const nextXa = this.x + a.x;
              const nextYa = this.y + a.y;
              const nextXb = this.x + b.x;
              const nextYb = this.y + b.y;
              const distA = Math.abs(nextXa - pac.x) + Math.abs(nextYa - pac.y);
              const distB = Math.abs(nextXb - pac.x) + Math.abs(nextYb - pac.y);
              return distA - distB;
            });
            this.dir = possibleDirs[0];
          }
        }
      }
      
      // Aplicar movimiento
      this.px += this.dir.x * currentSpeed;
      this.py += this.dir.y * currentSpeed;
      
      // Actualizar coordenadas de celda basadas en posición
      const newX = Math.round((this.px - TILE/2) / TILE);
      const newY = Math.round((this.py - TILE/2) / TILE);
      
      // Validar que la nueva posición sea válida (no pared)
      if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS && map[newY][newX] === 0) {
        this.x = newX;
        this.y = newY;
      } else {
        // Si por alguna razón entró en una pared, revertir y centrar
        this.px = this.x * TILE + TILE/2;
        this.py = this.y * TILE + TILE/2;
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
  let deathTimeout = null;

  function loadMap(index) {
    currentMapIndex = index;
    map = rawMaps[currentMapIndex].map(r => r.split('').map(ch => +ch));
    resetGame();
  }

  function resetGame() {
    if (deathTimeout) clearTimeout(deathTimeout);
    setupCanvas();
    resetPowerPellets();
    resetDots();
    
    pac.x = 1; pac.y = 1;
    pac.px = pac.x * TILE + TILE/2;
    pac.py = pac.y * TILE + TILE/2;
    pac.dir = {x: 0, y: 0};
    pac.nextDir = {x: 0, y: 0};
    pac.alive = true;
    pac.mouth = 0;
    pac.ghostMultiplier = 1;
    
    // Reiniciar fantasmas correctamente
    ghosts[0] = new Ghost(18, 1, '#ff5b5b');
    ghosts[1] = new Ghost(18, 18, '#5bd6ff');
    
    frightenedMode = false;
    frightenedTimer = 0;
    
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
    return Math.abs(px - centerX) < 0.3 && Math.abs(py - centerY) < 0.3;
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
        pac.dir = {x: pac.nextDir.x, y: pac.nextDir.y};
      }
    }
  }

  function activateFrightenedMode() {
    frightenedMode = true;
    frightenedTimer = FRIGHTENED_DURATION;
    pac.ghostMultiplier = 1;
    for (const g of ghosts) {
      g.setFrightened(true);
    }
    playTone(200, 0.2, 0.4);
    playTone(300, 0.2, 0.4);
    playTone(400, 0.3, 0.4);
  }

  function update(dt) {
    if (!running || !pac.alive) return;
    
    // Actualizar timer del modo asustado
    if (frightenedMode) {
      frightenedTimer -= dt;
      if (frightenedTimer <= 0) {
        frightenedMode = false;
        for (const g of ghosts) {
          g.setFrightened(false);
        }
      }
    }
    
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
        // Centrar si choca con pared
        pac.px = pac.x * TILE + TILE/2;
        pac.py = pac.y * TILE + TILE/2;
        pac.dir = {x: 0, y: 0};
      }
    }
    
    // Comer puntos
    if (isCentered(pac.px, pac.py)) {
      // Puntos normales
      if (dots[pac.y] && dots[pac.y][pac.x]) {
        dots[pac.y][pac.x] = false;
        score += 10;
        updateScore();
        playTone(523.25, 0.04, 0.12);
      }
      
      // Power pellets
      for (let i = 0; i < powerPellets.length; i++) {
        const pellet = powerPellets[i];
        if (pellet.active && pac.x === pellet.x && pac.y === pellet.y) {
          pellet.active = false;
          score += 50;
          updateScore();
          activateFrightenedMode();
          break;
        }
      }
    }
    
    // Verificar victoria
    let remainingDots = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (dots[y] && dots[y][x]) remainingDots++;
      }
    }
    let remainingPower = powerPellets.filter(p => p.active).length;
    if (remainingDots === 0 && remainingPower === 0) {
      running = false;
      statusEl.textContent = '¡GANASTE!';
      playTone(523.25, 0.3, 0.5);
      playTone(659.25, 0.3, 0.5);
      playTone(783.99, 0.5, 0.5);
      stopBackgroundMusic();
      return;
    }
    
    pac.mouth += dt * 0.01;
    
    // Actualizar fantasmas
    for (const g of ghosts) {
      g.update();
    }
    
    // Colisiones con fantasmas
    for (let i = 0; i < ghosts.length; i++) {
      const g = ghosts[i];
      const dx = Math.abs(g.px - pac.px);
      const dy = Math.abs(g.py - pac.py);
      const distance = Math.hypot(dx, dy);
      
      if (distance < (pac.radius + g.radius) * 0.7) {
        if (g.frightened) {
          // Comer fantasma
          const points = 200 * pac.ghostMultiplier;
          score += points;
          pac.ghostMultiplier *= 2;
          updateScore();
          playTone(400, 0.12, 0.5);
          playTone(500, 0.12, 0.5);
          playTone(600, 0.15, 0.5);
          g.respawn();
        } else {
          // Pacman muere
          pac.alive = false;
          running = false;
          statusEl.textContent = 'Perdiste';
          playTone(150, 0.4, 0.6);
          playTone(100, 0.5, 0.6);
          stopBackgroundMusic();
        }
      }
    }
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
    
    // Puntos normales
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
    
    // Power Pellets
    for (const pellet of powerPellets) {
      if (pellet.active) {
        ctx.fillStyle = '#ffaa44';
        ctx.beginPath();
        ctx.arc(pellet.x * TILE + TILE/2, pellet.y * TILE + TILE/2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffdd88';
        ctx.beginPath();
        ctx.arc(pellet.x * TILE + TILE/2, pellet.y * TILE + TILE/2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Pacman
    const mouthOpen = Math.abs(Math.sin(pac.mouth)) * 0.45;
    let angle = 0;
    if (pac.dir.x === 1) angle = 0;
    else if (pac.dir.x === -1) angle = Math.PI;
    else if (pac.dir.y === -1) angle = -Math.PI/2;
    else if (pac.dir.y === 1) angle = Math.PI/2;
    
    ctx.fillStyle = '#ffd400';
    ctx.beginPath();
    ctx.arc(pac.px, pac.py, pac.radius, angle + mouthOpen, angle + Math.PI * 2 - mouthOpen);
    ctx.lineTo(pac.px, pac.py);
    ctx.fill();
    
    // Fantasmas
    for (const g of ghosts) {
      ctx.save();
      ctx.translate(g.px, g.py);
      
      // Parpadeo en modo asustado (cuando queda poco tiempo)
      let useColor = g.color;
      if (g.frightened && frightenedTimer < 2000) {
        if (Math.floor(Date.now() / 100) % 2 === 0) {
          useColor = '#ffffff';
        }
      }
      
      ctx.fillStyle = useColor;
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
    let dt = ts - lastTime;
    if (dt > 50) dt = 16;
    lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // CONTROLES
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    let nx = 0, ny = 0;
    if (key === 'ArrowUp' || key.toLowerCase() === 'w') { nx = 0; ny = -1; }
    else if (key === 'ArrowDown' || key.toLowerCase() === 's') { nx = 0; ny = 1; }
    else if (key === 'ArrowLeft' || key.toLowerCase() === 'a') { nx = -1; ny = 0; }
    else if (key === 'ArrowRight' || key.toLowerCase() === 'd') { nx = 1; ny = 0; }
    
    if (nx !== 0 || ny !== 0) {
      pac.nextDir = {x: nx, y: ny};
      e.preventDefault();
    }
    
    if (key === ' ') {
      togglePause();
      e.preventDefault();
    }
    
    if (key === 'm' || key === 'M') {
      if (isMusicPlaying) {
        stopBackgroundMusic();
      } else {
        initAudio();
        startBackgroundMusic();
      }
      e.preventDefault();
    }
  });

  startBtn.addEventListener('click', () => {
    if (!pac.alive) resetGame();
    initAudio();
    startBackgroundMusic();
    running = true;
    statusEl.textContent = 'Jugando';
  });
  
  pauseBtn.addEventListener('click', togglePause);
  
  resetBtn.addEventListener('click', () => {
    stopBackgroundMusic();
    resetGame();
    if (running) {
      initAudio();
      startBackgroundMusic();
    }
  });
  
  mapSelect.addEventListener('change', (e) => {
    const idx = parseInt(e.target.value, 10) || 0;
    stopBackgroundMusic();
    loadMap(idx);
    if (running) {
      initAudio();
      startBackgroundMusic();
    }
  });
  
  function togglePause() {
    if (!pac.alive) return;
    running = !running;
    statusEl.textContent = running ? 'Jugando' : 'Pausado';
    if (running) {
      initAudio();
      startBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  }
  
  // Iniciar
  loadMap(currentMapIndex);
  requestAnimationFrame(loop);
})();
