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

// Carregamento de Imagens
const cannonImage = new Image();
cannonImage.src = 'labLançamentoObli.png';
// --- FUNÇÕES DE DESENHO ---

// ADICIONE A LINHA ABAIXO
const projectileCoordsDisplay = document.getElementById('projectileCoordsDisplay');

// NOVO: Seletores para os botões de medição
const measureHorizontalBtn = document.getElementById('measureHorizontalBtn');
const measureVerticalBtn = document.getElementById('measureVerticalBtn');
const clearMeasuresBtn = document.getElementById('clearMeasuresBtn');

// NOVO: Variáveis de estado para as réguas de medição
let measurementMode = null; // Pode ser 'horizontal', 'vertical' ou null
let activeDrag = null; // Guarda qual régua está sendo arrastada
const rulers = {
    horizontal: { active: false, startX: 0, startY: 0, endX: 0 },
    vertical: { active: false, startX: 0, startY: 0, endY: 0 }
};



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
    drawRulers();

    drawUI();
}

// NOVO: Função para desenhar as réguas na tela
function drawRulers() {
    ctx.strokeStyle = '#dc3545'; // Vermelho para a régua
    ctx.fillStyle = '#dc3545';
    ctx.font = 'bold 14px Arial';
    ctx.lineWidth = 2;

    // Desenha a régua horizontal se estiver ativa
    if (rulers.horizontal.active) {
        const h = rulers.horizontal;
        const y = h.startY;
        // Linha principal
        ctx.beginPath();
        ctx.moveTo(h.startX, y);
        ctx.lineTo(h.endX, y);
        ctx.stroke();
        // Ticks no início e fim
        ctx.beginPath();
        ctx.moveTo(h.startX, y - 5);
        ctx.lineTo(h.startX, y + 5);
        ctx.moveTo(h.endX, y - 5);
        ctx.lineTo(h.endX, y + 5);
        ctx.stroke();
        // Texto da medida
        const distance = Math.abs(h.endX - h.startX) / PIXELS_PER_METER;
        const text = `${distance.toFixed(1)} m`;
        const textX = (h.startX + h.endX) / 2;
        ctx.fillText(text, textX, y - 10);
    }

    // Desenha a régua vertical se estiver ativa
    if (rulers.vertical.active) {
        const v = rulers.vertical;
        const x = v.startX;
        // Linha principal
        ctx.beginPath();
        ctx.moveTo(x, v.startY);
        ctx.lineTo(x, v.endY);
        ctx.stroke();
        // Ticks no início e fim
        ctx.beginPath();
        ctx.moveTo(x - 5, v.startY);
        ctx.lineTo(x + 5, v.startY);
        ctx.moveTo(x - 5, v.endY);
        ctx.lineTo(x + 5, v.endY);
        ctx.stroke();
        // Texto da medida
        const distance = Math.abs(v.endY - v.startY) / PIXELS_PER_METER;
        const text = `${distance.toFixed(1)} m`;
        const textY = (v.startY + v.endY) / 2;
        ctx.save();
        ctx.translate(x + 10, textY);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }
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
    // ctx.save();
    // ctx.translate(cannon.x, cannon.y);
    // ctx.rotate(-cannon.angle);
    // ctx.fillStyle = '#555';
    // ctx.fillRect(0, -10, 80, 20);
    // ctx.fillStyle = '#333';
    // ctx.fillRect(75, -12, 15, 24);
    // ctx.restore();
    // ctx.fillStyle = '#666';
    // ctx.beginPath();
    // ctx.arc(cannon.x, cannon.y + 15, 30, Math.PI, 2 * Math.PI);
    // ctx.fill();
    // ctx.fillStyle = '#444';
    // ctx.beginPath();
    // ctx.arc(cannon.x - 20, cannon.y + 35, 15, 0, 2 * Math.PI);
    // ctx.arc(cannon.x + 20, cannon.y + 35, 15, 0, 2 * Math.PI);
    // ctx.fill();

// A imagem pode não ter carregado no primeiro frame.
    // Este 'if' evita erros e desenha um quadrado cinza como substituto temporário.
    if (!cannonImage.complete || cannonImage.naturalHeight === 0) {
        ctx.fillStyle = 'gray';
        ctx.fillRect(cannon.x - 40, cannon.y - 15, 80, 50)
        return;
    }
 // --- 1. Desenhar a base do canhão (a imagem, sem rotação) ---
    const imgWidth = 100;
    const imgHeight = 80;
    const baseX = cannon.x - (imgWidth / 2);
    // Ajustei o baseY para que o canhão fique bem assentado no chão
    const baseY = cannon.y - imgHeight + 15; 
    ctx.drawImage(cannonImage, baseX, baseY, imgWidth, imgHeight);

    // --- 2. Desenhar o cano rotativo na frente do homem ---
    
    // Ponto de pivô: de onde o cano vai sair.
    // cannon.x + 25 -> move 25 pixels para a frente
    // cannon.y - 25 -> move 25 pixels para cima
    const pivotX = cannon.x + 25;
    const pivotY = cannon.y - 25;

    ctx.save(); 
    // Move a origem do desenho para o novo ponto de pivô
    ctx.translate(pivotX, pivotY); 
    ctx.rotate(-cannon.angle);

    // Desenha o cano a partir da nova origem (0,0 relativo ao pivô)
    ctx.fillStyle = '#555';
    ctx.fillRect(0, -10, 50, 20); // O cano tem 50px de comprimento
    ctx.fillStyle = '#333';
    ctx.fillRect(45, -12, 15, 24);

    ctx.restore();
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
    ctx.font = 'bold 12px Arial';
     // Cor escura para boa legibilidade
    ctx.textAlign = 'left';
    const lineHeight = 14; // Define o espaçamento vertical entre as linhas de texto

    for (const dataPoint of velocityDataPoints) {
        // Cria strings de texto separadas
        const textVx = `vₓ: ${dataPoint.vx.toFixed(1)} m/s`;
        const textVy = `vᵧ: ${dataPoint.vy.toFixed(1)} m/s`;

        // Define a posição Y para a primeira linha (vx)
        const yPosVx = dataPoint.y - 22; // Um pouco mais para cima para dar espaço

        ctx.fillStyle = 'blue';
        
        // 1. Desenha o texto de vx
        ctx.fillText(textVx, dataPoint.x, yPosVx + lineHeight);


        ctx.fillStyle = 'green';

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
   
   
   // Converte a posição atual do projétil (em pixels) para metros relativos ao canhão
    const projectileX_meters = (projectile.x - cannon.x) / PIXELS_PER_METER;
    const projectileY_meters = (cannon.y - projectile.y) / PIXELS_PER_METER;
    // Atualiza o texto no painel de controles
    projectileCoordsDisplay.textContent = `x: ${projectileX_meters.toFixed(1)}m, y: ${projectileY_meters.toFixed(1)}m`;
   
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
    const barrelLength = 80;
    trajectoryPath = [];
    velocityDataPoints = [];
    timeSinceLastPlot = 0;
    projectileCoordsDisplay.textContent = 'Em voo...';
    projectile = {
        x: cannon.x + barrelLength * Math.cos(cannon.angle),
        y: cannon.y - barrelLength * Math.sin(cannon.angle),
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

    projectileCoordsDisplay.textContent = 'Parado';
    clearRulers();
    // Desenha o estado inicial completo
    draw();
}

function clearRulers() {
    rulers.horizontal.active = false;
    rulers.vertical.active = false;
}
// mouse evento
function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}


function handleMouseDown(e) {
    if (!measurementMode) return;
    const pos = getMousePos(canvas, e);

    if (measurementMode === 'horizontal') {
        rulers.horizontal.active = true;
        rulers.horizontal.startX = pos.x;
        rulers.horizontal.startY = pos.y;
        rulers.horizontal.endX = pos.x;
        activeDrag = 'horizontal';
    } else if (measurementMode === 'vertical') {
        rulers.vertical.active = true;
        rulers.vertical.startX = pos.x;
        rulers.vertical.startY = pos.y;
        rulers.vertical.endY = pos.y;
        activeDrag = 'vertical';
    }
    measurementMode = null; // Desativa o modo para o próximo clique
}

function handleMouseMove(e) {
    if (!activeDrag) return;
    const pos = getMousePos(canvas, e);
    if (activeDrag === 'horizontal') {
        rulers.horizontal.endX = pos.x;
    } else if (activeDrag === 'vertical') {
        rulers.vertical.endY = pos.y;
    }
}

function handleMouseUp() {
    activeDrag = null;
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

// NOVO: Listeners dos botões e do mouse
measureHorizontalBtn.addEventListener('click', () => { measurementMode = 'horizontal'; });
measureVerticalBtn.addEventListener('click', () => { measurementMode = 'vertical'; });
clearMeasuresBtn.addEventListener('click', clearRulers);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);



// Inicia o jogo
resetGame();
// Inicia o loop principal do jogo
gameLoop();