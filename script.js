'use strict';

// Seleção de Elementos do DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const velocityInput = document.getElementById('velocityInput');
const fireButton = document.getElementById('fireButton');
const resetButton = document.getElementById('resetButton');
const targetCoordsDisplay = document.getElementById('targetCoordsDisplay');
const messageDisplay = document.getElementById('messageDisplay');

// Selecionando os novos controles do ângulo
const angleSlider = document.getElementById('angleSlider');
const angleValueDisplay = document.getElementById('angleValueDisplay');

// Constantes Físicas e do Jogo
const GRAVITY = 9.8;
const PIXELS_PER_METER = 15;
const VECTOR_SCALE = 0.25;

// Variáveis de Estado do Jogo
let gameState = 'ready';
let projectile = {};
let target = {};
let cannon = {}; // Começa como um objeto vazio
let timeInFlight = 0;
let animationFrameId = null;
let lastTime = 0;
let trajectoryPath = [];
const PLOT_INTERVAL = 0.4;
let timeSinceLastPlot = 0;
let velocityDataPoints = [];

// --- FUNÇÕES DE DESENHO ---

function draw() {
    // Guarda de segurança: não tenta desenhar se os objetos principais não estiverem prontos
    if (!ctx || !cannon || !target) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawGround();
    drawTrajectory();
    drawCannon();
    drawTarget();
    if (['firing', 'hit', 'miss'].includes(gameState)) {
        drawProjectile();
    }
    drawVelocityComponentVectors();
    drawVelocityData();
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

// DENTRO DE script.js

// NOVA FUNÇÃO AUXILIAR para desenhar a ponta da seta de um vetor
function drawArrowhead(ctx, x, y, angle) {
    const headLength = 8; // Comprimento da ponta da seta

    ctx.save(); // Salva o estado atual do canvas (cor, rotação, etc.)
    ctx.translate(x, y); // Move a origem do canvas para a ponta do vetor
    ctx.rotate(angle); // Rotaciona o canvas para o ângulo do vetor

    // Desenha as duas linhas que formam a ponta da seta
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-headLength, -headLength / 2);
    ctx.moveTo(0, 0);
    ctx.lineTo(-headLength, headLength / 2);
    ctx.stroke();

    ctx.restore(); // Restaura o estado original do canvas
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

// function drawVelocityData() {
//     ctx.font = '12px Arial';
//     ctx.fillStyle = '#333333';
//     ctx.textAlign = 'left';
//     for (const dataPoint of velocityDataPoints) {
//         const text = `vy: ${dataPoint.vy.toFixed(1)} (m/s), vx: ${dataPoint.vx.toFixed(1)} (m/s)`;
//         ctx.fillText(text, dataPoint.x, dataPoint.y - 10);
//     }
// }

// SUBSTITUA A FUNÇÃO ANTIGA POR ESTA
function drawVelocityData() {
    ctx.font = '12px Arial';
    ctx.fillStyle = '#333333'; // Cor escura para boa legibilidade
    ctx.textAlign = 'left';
    const lineHeight = 14; // Define o espaçamento vertical entre as linhas de texto

    for (const dataPoint of velocityDataPoints) {
        // Cria strings de texto separadas
        const textVx = `vₓ: ${dataPoint.vx.toFixed(1)} m/s`;
        const textVy = `vᵧ: ${dataPoint.vy.toFixed(1)} m/s`;

        // Define a posição Y para a primeira linha (vx)
        const yPosVx = dataPoint.y - 22; // Um pouco mais para cima para dar espaço

        
        
        // 1. Desenha o texto de vx
        ctx.fillText(textVx, dataPoint.x, yPosVx + lineHeight);

        // 2. Desenha o texto de vy, abaixo da primeira linha
        ctx.fillText(textVy, dataPoint.x, yPosVx);
        
    }
}


function drawVelocityComponentVectors() {
    if (!velocityDataPoints.length) return;
    for (const dataPoint of velocityDataPoints) {
        const startX = dataPoint.x;
        const startY = dataPoint.y;
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.moveTo(startX, startY);
        const endX = startX + (dataPoint.vx * VECTOR_SCALE * PIXELS_PER_METER);
        ctx.lineTo(endX, startY);
        ctx.stroke();
        // Adiciona a seta na ponta do vetor vx
        const angleX = dataPoint.vx >= 0 ? 0 : Math.PI; // 0 rad para direita, PI rad para esquerda
        drawArrowhead(ctx, endX, startY, angleX);
        
        ctx.beginPath();
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        ctx.moveTo(startX, startY);
        const endY = startY - (dataPoint.vy * VECTOR_SCALE * PIXELS_PER_METER);
        ctx.lineTo(startX, endY);
        ctx.stroke();
        // Adiciona a seta na ponta do vetor vy
        const angleY = dataPoint.vy >= 0 ? -Math.PI / 2 : Math.PI / 2; // -90° para cima, 90° para baixo
        drawArrowhead(ctx, startX, endY, angleY);
    }
}

// Função para atualizar o ângulo, focada apenas nas MUDANÇAS do usuário
function updateAngle() {
    const angleInDegrees = parseFloat(angleSlider.value);
    angleValueDisplay.textContent = angleInDegrees.toFixed(1);
    if (cannon) {
        cannon.angle = angleInDegrees * (Math.PI / 180);
    }
    // Redesenha apenas se o jogo não estiver no meio de um disparo
    if (gameState !== 'firing') {
        draw();
    }
}

// --- FUNÇÕES DE LÓGICA DO JOGO ---

function update(deltaTime) {
    if (gameState !== 'firing' || !deltaTime) return;
    timeInFlight += deltaTime;
    timeSinceLastPlot += deltaTime;
    if (timeSinceLastPlot >= PLOT_INTERVAL) {
        const simulationVy = projectile.vy + (GRAVITY * timeInFlight);
        velocityDataPoints.push({
            x: projectile.x,
            y: projectile.y,
            vx: projectile.vx,
            vy: -simulationVy
        });
        timeSinceLastPlot = 0;
    }
    const initialX = cannon.x + 80 * Math.cos(cannon.angle);
    projectile.x = initialX + (projectile.vx * timeInFlight * PIXELS_PER_METER);
    const initialY = cannon.y - 80 * Math.sin(cannon.angle);
    projectile.y = initialY + (projectile.vy * timeInFlight * PIXELS_PER_METER) + (0.5 * Math.pow(timeInFlight, 2) * GRAVITY * PIXELS_PER_METER);
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
    velocityDataPoints = [];
    timeSinceLastPlot = 0;
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

// CORRIGIDO: Função de reset agora cria o canhão com um ângulo válido desde o início
function resetGame() {
    gameState = 'ready';

    // Lê o valor do slider e define o estado inicial do canhão
    const angleInDegrees = parseFloat(angleSlider.value);
    angleValueDisplay.textContent = angleInDegrees.toFixed(1);

    cannon = {
        x: 50,
        y: canvas.height - 70,
        angle: angleInDegrees * (Math.PI / 180)
    };
    
    target = {
        x: Math.floor(Math.random() * (canvas.width / 2 - 50)) + canvas.width / 2,
        y: canvas.height - 70 - (Math.random() * 200 + 50),
        radius: 20
    };
    
    projectile = {};
    timeInFlight = 0;
    trajectoryPath = [];
    velocityDataPoints = [];
    fireButton.disabled = false;
    messageDisplay.textContent = '';
    
    const deltaX_pixels = target.x - cannon.x;
    const deltaY_pixels = cannon.y - target.y;
    const targetX_meters = deltaX_pixels / PIXELS_PER_METER;
    const targetY_meters = deltaY_pixels / PIXELS_PER_METER;
    targetCoordsDisplay.textContent = `x: ${targetX_meters.toFixed(1)}m, y: ${targetY_meters.toFixed(1)}m`;

    // Desenha o estado inicial completo
    draw();
}

// --- GAME LOOP ---
function gameLoop(timestamp) {
    // Inicializa lastTime no primeiro frame para evitar um deltaTime gigante
    if (!lastTime) {
        lastTime = timestamp;
    }
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    update(deltaTime);
    draw();
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- INICIALIZAÇÃO ---
fireButton.addEventListener('click', fireShot);
resetButton.addEventListener('click', resetGame);
angleSlider.addEventListener('input', updateAngle);

// Inicia o jogo
resetGame();
// Inicia o loop principal do jogo
gameLoop();