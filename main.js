/**
 * Excalibur Rain - Portfolio Project
 * A physics-based stacking game using Matter.js and Canvas API.
 * * Architecture:
 * 1. Configuration: Centralized constants for game tuning.
 * 2. Physics Engine: Matter.js setup and world management.
 * 3. Procedural Generation: Simplex noise for organic terrain.
 * 4. Game Loop: State management, input handling, and rendering.
 */

// --- 0. CONFIGURATION & CONSTANTS ---
const CONFIG = {
  PHYSICS: {
    GRAVITY: 2.0, // High gravity to simulate massive objects
    FRICTION: 1.0, // Max friction for the ground
    DENSITY: 0.2, // Heavy swords
  },
  ISLAND: {
    START_PCT: 0.3, // Starts at 30% of screen width
    END_PCT: 0.55, // Ends at 55% of screen width
    DEPTH: 250, // Depth of the floating island
    NOISE_SCALE: 0.005, // Smoothness of the terrain
  },
  SWORD: {
    WIDTH: 35,
    HEIGHT: 320,
    SPAWN_Y: -500,
    SCALE_VISUAL: 2.8, // Multiplier for drawing relative to physics body
    COOLDOWN: 500, // ms between spawns
  },
  COLORS: {
    SKY_TOP: "#050608",
    SKY_BOTTOM: "#151b24",
    ISLAND_TOP: "#228b22",
    ISLAND_ROCK: "#120d0a",
    BLADE_DARK: "#4a4a4a",
    GOLD: "#b8860b",
  },
};

// Optional: Uncomment the line below to reset high scores once
// localStorage.removeItem("excalibur_scores");

// --- 1. ENGINE SETUP ---
const Engine = Matter.Engine,
  Render = Matter.Render,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  Events = Matter.Events,
  Composite = Matter.Composite;

const engine = Engine.create();
engine.gravity.y = CONFIG.PHYSICS.GRAVITY;

const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

// Handle window resize dynamically
const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --- 2. UI INJECTION ---
// Injecting styles via JS to maintain single-file portability for the portfolio
const injectUI = () => {
  const style = document.createElement("style");
  style.innerHTML = `
        .game-ui { position: absolute; font-family: 'Segoe UI', sans-serif; user-select: none; pointer-events: none; text-shadow: 2px 2px 0 #000; }
        #hearts-container { top: 20px; left: 20px; font-size: 40px; }
        #score-container { top: 20px; right: 20px; text-align: right; color: #fff; }
        #game-over-screen { 
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.9); display: none; 
            flex-direction: column; align-items: center; justify-content: center;
            color: white; z-index: 10; font-family: 'Courier New', monospace;
        }
        .btn { 
            margin-top: 20px; padding: 15px 40px; font-size: 24px; cursor: pointer; 
            background: #c0392b; color: white; border: none; border-radius: 4px; pointer-events: auto;
            text-transform: uppercase; letter-spacing: 2px;
            transition: background 0.2s;
        }
        .btn:hover { background: #e74c3c; }
    `;
  document.head.appendChild(style);

  const createDiv = (id) => {
    const div = document.createElement("div");
    div.id = id;
    div.className = "game-ui";
    document.body.appendChild(div);
    return div;
  };

  return {
    hearts: createDiv("hearts-container"),
    score: createDiv("score-container"),
    gameOver: (() => {
      const div = document.createElement("div");
      div.id = "game-over-screen";
      document.body.appendChild(div);
      return div;
    })(),
  };
};

const UI = injectUI();

// --- 3. GAME STATE MANAGEMENT ---
const Game = {
  lives: 3,
  maxLives: 3,
  swordsOnScreen: 0,
  isPlaying: true,
  lastSpawnTime: 0,
  highScores: JSON.parse(localStorage.getItem("excalibur_scores")) || [0, 0, 0],

  updateUI: function () {
    // Hearts Renderer
    let heartsHTML = "";
    for (let i = 0; i < this.maxLives; i++) {
      heartsHTML += i < this.lives ? "❤️" : "🖤";
    }
    UI.hearts.innerHTML = heartsHTML;

    // Score Renderer
    let scoresHTML = `<h2>ESPADAS: ${this.swordsOnScreen}</h2>`;
    scoresHTML += `<small>🏆 TOP 3: ${this.highScores.join(" | ")}</small>`;
    UI.score.innerHTML = scoresHTML;
  },

  saveScore: function () {
    this.highScores.push(this.swordsOnScreen);
    this.highScores.sort((a, b) => b - a);
    this.highScores = this.highScores.slice(0, 3);
    localStorage.setItem("excalibur_scores", JSON.stringify(this.highScores));
  },

  reset: function () {
    this.lives = 3;
    this.swordsOnScreen = 0;
    this.isPlaying = true;
    this.lastSpawnTime = 0;

    World.clear(engine.world);
    Engine.clear(engine);

    UI.gameOver.style.display = "none";

    WorldGenerator.createIsland();
    this.updateUI();
  },
};

// --- 4. PROCEDURAL WORLD GENERATION ---
const WorldGenerator = {
  simplex: new SimplexNoise(),
  islandBody: null,
  stars: Array.from({ length: 100 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 2,
    a: Math.random(), // Alpha for twinkling
  })),

  createIsland: function () {
    const vertices = [];
    const resolution = 15; // Vertex density

    const startX = canvas.width * CONFIG.ISLAND.START_PCT;
    const endX = canvas.width * CONFIG.ISLAND.END_PCT;
    const width = endX - startX;
    const surfaceY = canvas.height - 150;

    // Pass 1: Generate Surface (Top) with Noise
    for (let x = 0; x <= width; x += resolution) {
      const noiseVal = this.simplex.noise2D(
        (x + startX) * CONFIG.ISLAND.NOISE_SCALE,
        0,
      );
      const y = surfaceY + noiseVal * 40;
      vertices.push({ x: startX + x, y: y });
    }

    // Pass 2: Generate Bottom (Rock formation) using Noise + Arc Function
    // Iterating backwards to close the polygon correctly
    for (let x = width; x >= 0; x -= resolution) {
      const noiseVal = this.simplex.noise2D((x + startX) * 0.01, 100);
      // Math.sin creates the floating island "belly" shape
      const arc = Math.sin((x / width) * Math.PI);
      const y = surfaceY + CONFIG.ISLAND.DEPTH * arc + noiseVal * 60;
      vertices.push({ x: startX + x, y: y });
    }

    // Clean up previous body if exists (for restarts)
    if (this.islandBody) World.remove(engine.world, this.islandBody);

    // Calculate centroid for body creation
    const centerX = startX + width / 2;
    const centerY = surfaceY + CONFIG.ISLAND.DEPTH / 2;

    this.islandBody = Bodies.fromVertices(
      centerX,
      centerY,
      [vertices],
      {
        isStatic: true,
        label: "ground",
        friction: CONFIG.PHYSICS.FRICTION,
        frictionStatic: 10,
        render: { fillStyle: CONFIG.COLORS.ISLAND_TOP }, // Fallback color
      },
      true,
    );

    World.add(engine.world, this.islandBody);
  },
};

// --- 5. GAME LOGIC & PHYSICS EVENTS ---

// Input Handling
canvas.addEventListener("mousedown", (e) => {
  if (!Game.isPlaying) return;

  const now = Date.now();
  if (now - Game.lastSpawnTime < CONFIG.SWORD.COOLDOWN) return;

  spawnSword(e.clientX);
  Game.lastSpawnTime = now;
});

function spawnSword(x) {
  const sword = Bodies.rectangle(
    x,
    CONFIG.SWORD.SPAWN_Y,
    CONFIG.SWORD.WIDTH,
    CONFIG.SWORD.HEIGHT,
    {
      label: "sword",
      frictionAir: 0.01,
      friction: 0.8,
      density: CONFIG.PHYSICS.DENSITY,
      restitution: 0.0, // No bounciness (heavy metal)
      angle: 0,
    },
  );

  // Apply slight random rotation for realism
  Body.setAngularVelocity(sword, (Math.random() - 0.5) * 0.02);
  World.add(engine.world, sword);

  Game.swordsOnScreen++;
  Game.updateUI();
}

// Win/Loss Conditions Check
Events.on(engine, "beforeUpdate", () => {
  if (!Game.isPlaying) return;

  const bodies = Composite.allBodies(engine.world);
  bodies.forEach((body) => {
    // Check if sword fell into the void
    if (body.label === "sword" && body.position.y > canvas.height + 400) {
      World.remove(engine.world, body);
      Game.swordsOnScreen--;
      triggerLifeLoss();
    }
  });
});

// Collision Handling (The "Sticking" Mechanic)
Events.on(engine, "collisionStart", (event) => {
  event.pairs.forEach((pair) => {
    const { bodyA, bodyB } = pair;

    // Identify the sword and the ground
    let sword = null;
    let other = null;

    if (bodyA.label === "sword") {
      sword = bodyA;
      other = bodyB;
    } else if (bodyB.label === "sword") {
      sword = bodyB;
      other = bodyA;
    }

    // Logic: Swords only stick to the ground, not to each other (increasing difficulty)
    if (sword && !sword.isStatic && other.label === "ground") {
      const angle = sword.angle % (Math.PI * 2);
      // Check verticality tolerance (~45 degrees)
      const isVertical =
        Math.abs(angle) < 0.8 || Math.abs(angle) > Math.PI * 2 - 0.8;

      if (isVertical) {
        Body.setStatic(sword, true);
        Body.setVelocity(sword, { x: 0, y: 0 });
        Body.setAngularVelocity(sword, 0);
      }
    }
  });
});

function triggerLifeLoss() {
  Game.lives--;
  Game.updateUI();

  // Visual feedback (Red Flash)
  const flash = document.createElement("div");
  flash.style.cssText =
    "position:absolute;top:0;left:0;width:100%;height:100%;background:red;opacity:0.3;pointer-events:none;transition: opacity 0.1s;";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 100);

  if (Game.lives <= 0) triggerGameOver();
}

function triggerGameOver() {
  Game.isPlaying = false;
  Game.saveScore();

  UI.gameOver.style.display = "flex";
  UI.gameOver.innerHTML = `
        <h1 style="font-size: 50px; color: #e74c3c;">FALHA ESTRUTURAL</h1>
        <h2>Espadas: ${Game.swordsOnScreen}</h2>
        <div style="margin: 20px 0; border-top: 1px solid #555; padding-top: 20px;">
            <h3>🏆 Recordes</h3>
            <p>1. ${Game.highScores[0] || 0}</p>
            <p>2. ${Game.highScores[1] || 0}</p>
            <p>3. ${Game.highScores[2] || 0}</p>
        </div>
        <button class="btn" onclick="Game.reset()">Reiniciar</button>
    `;
}

// Expose reset to window for the HTML button
window.restartGame = () => Game.reset();

// --- 6. RENDERING PIPELINE ---

/**
 * Draws the ornate Excalibur sword using Canvas paths.
 * Uses context transformation to draw relative to physics body position/rotation.
 */
function drawSword(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(CONFIG.SWORD.SCALE_VISUAL, CONFIG.SWORD.SCALE_VISUAL);

  // Drop Shadow
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 15;

  // 1. Blade
  const bladeGrad = ctx.createLinearGradient(-10, 0, 10, 0);
  bladeGrad.addColorStop(0, CONFIG.COLORS.BLADE_DARK);
  bladeGrad.addColorStop(0.5, "#fff"); // Shine
  bladeGrad.addColorStop(1, CONFIG.COLORS.BLADE_DARK);

  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.lineTo(-5, 90);
  ctx.lineTo(0, 120); // Tip
  ctx.lineTo(5, 90);
  ctx.lineTo(6, -20);
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  // Fuller (Blade Groove)
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(0, 100);
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // 2. Crossguard (Gold)
  const goldGrad = ctx.createLinearGradient(-20, 0, 20, 0);
  goldGrad.addColorStop(0, CONFIG.COLORS.GOLD);
  goldGrad.addColorStop(0.5, "#fceabb");
  goldGrad.addColorStop(1, CONFIG.COLORS.GOLD);

  ctx.beginPath();
  ctx.moveTo(-25, -20);
  ctx.quadraticCurveTo(0, -5, 25, -20);
  ctx.lineTo(0, -12);
  ctx.fill();
  ctx.fillStyle = goldGrad;
  ctx.fill();

  // Gemstone
  ctx.beginPath();
  ctx.arc(0, -18, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#800000";
  ctx.fill();

  // 3. Hilt & Pommel
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(-4, -50, 8, 30);

  ctx.beginPath();
  ctx.arc(0, -53, 6, 0, Math.PI * 2);
  ctx.fillStyle = goldGrad;
  ctx.fill();

  ctx.restore();
}

function render() {
  Engine.update(engine, 1000 / 60);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Sky (Gradient + Stars)
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, CONFIG.COLORS.SKY_TOP);
  grad.addColorStop(1, CONFIG.COLORS.SKY_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FFF";
  WorldGenerator.stars.forEach((s) => {
    // Simple twinkling effect using Sine wave on Alpha channel
    ctx.globalAlpha = Math.abs(Math.sin(Date.now() * 0.001 * s.r + s.a)) * 0.8;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // 2. Draw Island
  if (WorldGenerator.islandBody) {
    ctx.beginPath();
    const v = WorldGenerator.islandBody.vertices;
    ctx.moveTo(v[0].x, v[0].y);
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);

    // Gradient for depth
    const islandGrad = ctx.createLinearGradient(
      0,
      canvas.height / 2,
      0,
      canvas.height + 200,
    );
    islandGrad.addColorStop(0, CONFIG.COLORS.ISLAND_TOP);
    islandGrad.addColorStop(0.3, "#3b2618");
    islandGrad.addColorStop(1, CONFIG.COLORS.ISLAND_ROCK);

    ctx.fillStyle = islandGrad;
    ctx.fill();
    ctx.strokeStyle = "#4aa84a"; // Highlight rim
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 3. Draw Swords
  const bodies = Composite.allBodies(engine.world);
  bodies.forEach((b) => {
    if (b.label === "sword")
      drawSword(ctx, b.position.x, b.position.y, b.angle);
  });

  requestAnimationFrame(render);
}

// --- 7. INITIALIZATION ---
WorldGenerator.createIsland();
Game.updateUI();
render();
