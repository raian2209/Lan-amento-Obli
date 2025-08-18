'use strict';

// Seleção de Elementos do DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const velocityInput = document.getElementById('velocityInput');
const fireButton = document.getElementById('fireButton');
const resetButton = document.getElementById('resetButton');
const angleDisplay = document.getElementById('angleDisplay');
const distanceDisplay = document.getElementById('distanceDisplay');
const targetCoordsDisplay = document.getElementById('targetCoordsDisplay');
const messageDisplay = document.getElementById('messageDisplay');


// Constantes Físicas e do Jogo
const GRAVITY = 9.8;
const PIXELS_PER_METER = 10; // 10 pixels = 1 metro

// Variáveis de Estado do Jogo
let gameState = 'ready';
let projectile = {};
let target = {};
let cannon = {};
let timeInFlight = 0;
let animationFrameId = null;
let lastTime = 0;
let trajectoryPath = [];

// --- FUNÇÕES DE DESENHO (Sem alterações aqui) ---

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawGround();
    drawTrajectory();
    drawCannon();
    drawTarget();
    if (['firing', 'hit', 'miss'].includes(gameState)) {
        drawProjectile();
    }
    drawUI();
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#87CEEB');
    sky.addColorStop(1, '#E0F8FF');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround() {
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, canvas.height - 70, canvas.width, 70);
    ctx.fillStyle = '#3CB371';
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.fillRect(i, canvas.height - 70, 10, 5);
    }
}

function drawCannon() {
    ctx.save();
    ctx.translate(cannon.x, cannon.y);
    ctx.rotate(-cannon.angle);
    ctx.fillStyle = '#555';
    ctx.fillRect(0, -10, 80, 20);
    ctx.fillStyle = '#333';
    ctx.fillRect(75, -12, 15, 24);
    ctx.restore();
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(cannon.x, cannon.y + 15, 30, Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(cannon.x - 20, cannon.y + 35, 15, 0, 2 * Math.PI);
    ctx.arc(cannon.x + 20, cannon.y + 35, 15, 0, 2 * Math.PI);
    ctx.fill();
}

function drawTarget() {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius * 0.66, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius * 0.33, 0, 2 * Math.PI);
    ctx.fill();
}

function drawProjectile() {
    if (!projectile.x) return;
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 8, 0, 2 * Math.PI);
    ctx.fill();
}

function drawTrajectory() {
    if (trajectoryPath.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.setLineDash([3, 4]);
    ctx.moveTo(trajectoryPath[0].x, trajectoryPath[0].y);
    for (const point of trajectoryPath) {
        ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
}


function drawUI() {
    if (gameState === 'hit') {
        messageDisplay.textContent = 'Acertou!';
        messageDisplay.style.color = 'green';
    } else if (gameState === 'miss') {
        messageDisplay.textContent = 'Errou! Tente novamente.';
        messageDisplay.style.color = 'red';
    }
}

// --- FUNÇÕES DE LÓGICA DO JOGO ---

function update(deltaTime) {
    if (gameState !== 'firing' || !deltaTime) return;
    timeInFlight += deltaTime;
    const initialX = cannon.x + 80 * Math.cos(cannon.angle);
    projectile.x = initialX + (projectile.vx * timeInFlight * PIXELS_PER_METER);
    const initialY = cannon.y - 80 * Math.sin(cannon.angle);
    projectile.y = initialY + (projectile.vy * timeInFlight * PIXELS_PER_METER) + (0.5 * GRAVITY * Math.pow(timeInFlight, 2) * PIXELS_PER_METER);
    trajectoryPath.push({ x: projectile.x, y: projectile.y });
    checkCollision();
    checkBoundaries();
}

function checkCollision() {
    if (gameState !== 'firing') return;
    const distance = Math.sqrt(Math.pow(projectile.x - target.x, 2) + Math.pow(projectile.y - target.y, 2));
    if (distance < target.radius) {
        gameState = 'hit';
        fireButton.disabled = false;
    }
}

function checkBoundaries() {
    if (gameState !== 'firing') return;
    if (projectile.x > canvas.width || projectile.x < 0 || projectile.y > canvas.height - 70) {
        gameState = 'miss';
        fireButton.disabled = false;
    }
}

function fireShot() {
    if (!['ready', 'hit', 'miss'].includes(gameState)) return;
    const velocity = parseFloat(velocityInput.value);
    if (!velocity || velocity <= 0) {
        alert('Por favor, insira uma velocidade inicial válida.');
        return;
    }
    trajectoryPath = [];
    projectile = {
        x: cannon.x + 80 * Math.cos(cannon.angle),
        y: cannon.y - 80 * Math.sin(cannon.angle),
        vx: velocity * Math.cos(cannon.angle),
        vy: -velocity * Math.sin(cannon.angle)
    };
    timeInFlight = 0;
    gameState = 'firing';
    fireButton.disabled = true;
    messageDisplay.textContent = '';
}

function resetGame() {
    gameState = 'ready';
    cannon = {
        x: 50,
        y: canvas.height - 70,
        angle: (Math.random() * 60 + 15) * (Math.PI / 180)
    };
    target = {
        x: Math.floor(Math.random() * (canvas.width / 2 - 50)) + canvas.width / 2,
        y: canvas.height - 70 - (Math.random() * 200 + 50),
        radius: 20
    };
    projectile = {};
    timeInFlight = 0;
    trajectoryPath = [];
    fireButton.disabled = false;
    messageDisplay.textContent = '';
    angleDisplay.textContent = (cannon.angle * 180 / Math.PI).toFixed(1);
    const distance = Math.sqrt(Math.pow(target.x - cannon.x, 2) + Math.pow(target.y - cannon.y, 2)) / PIXELS_PER_METER;
    distanceDisplay.textContent = distance.toFixed(1);

    // --- ALTERAÇÃO PRINCIPAL AQUI ---
    // Calcula a diferença de posição em pixels
    const deltaX_pixels = target.x - cannon.x;
    // O eixo Y é invertido no canvas, por isso a subtração é cannon.y - target.y
    const deltaY_pixels = cannon.y - target.y;

    // Converte a diferença de pixels para metros
    const targetX_meters = deltaX_pixels / PIXELS_PER_METER;
    const targetY_meters = deltaY_pixels / PIXELS_PER_METER;

    // Exibe as coordenadas em metros na UI
    targetCoordsDisplay.textContent = `x: ${targetX_meters.toFixed(1)}m, y: ${targetY_meters.toFixed(1)}m`;

    draw();
}

// --- GAME LOOP ---

function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(deltaTime);
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- INICIALIZAÇÃO ---

fireButton.addEventListener('click', fireShot);
resetButton.addEventListener('click', resetGame);

// Inicia o jogo
resetGame();
gameLoop(0);