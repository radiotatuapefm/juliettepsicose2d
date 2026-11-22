const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configurações da tela adaptável
let CANVAS_WIDTH = 1364;  // Valor inicial, será atualizado
let CANVAS_HEIGHT = 766; // Valor inicial, será atualizado

const frameWidth = 48;
const frameHeight = 64;
const scale = 1.5; // Personagem menor, mais próximo do Contra original
const shootingScale = 1.8; // Escala específica para sprites de tiro (refinada)

// Sistema de jogo inspirado no Contra
const gameState = {
    score: 0,
    lives: 3,
    level: 1,
    paused: false,
    gameOver: false,
    // === NOVO SISTEMA DE FASES ===
    currentPhase: 1,
    gameStartTime: 0,
    timeInGame: 0, // Tempo em segundos
    hitsReceived: 0, // Contador de tiros recebidos
    maxHitsPhase1: 10, // Tiros para morrer na fase 1
    maxHitsPhase2: 1000, // Tiros para morrer na fase 2
    phase2StartTime: 300, // 5 minutos = 300 segundos
    // === NOVOS CONTADORES ===
    enemiesDefeated: 0,
    bossesDefeated: 0
};

// === SISTEMA DE SONS ===
const gameAudio = {
    enabled: true,
    volume: 0.3,
    sounds: {
        // Sons básicos
        shoot: new Audio(),
        enemyHit: new Audio(),
        enemyDestroy: new Audio(),
        playerHit: new Audio(),
        jump: new Audio(),
        powerup: new Audio(),
        
        // Sons especiais
        chainAttack: new Audio(),
        celebration: new Audio(),
        levelUp: new Audio(),
        gameOver: new Audio(),
        
        // Sons de fundo
        bgMusic: new Audio()
    }
};

// Configurar sons (usando geradores de frequência como fallback)
function initializeSounds() {
    // Configurar caminhos dos sons (quando disponíveis)
    gameAudio.sounds.shoot.src = 'assets/sounds/shoot.mp3';
    gameAudio.sounds.enemyHit.src = 'assets/sounds/enemy_hit.mp3';
    gameAudio.sounds.enemyDestroy.src = 'assets/sounds/enemy_destroy.mp3';
    gameAudio.sounds.playerHit.src = 'assets/sounds/player_hit.mp3';
    gameAudio.sounds.jump.src = 'assets/sounds/jump.mp3';
    gameAudio.sounds.powerup.src = 'assets/sounds/powerup.mp3';
    gameAudio.sounds.chainAttack.src = 'assets/sounds/chain_attack.mp3';
    gameAudio.sounds.celebration.src = 'assets/sounds/celebration.mp3';
    gameAudio.sounds.levelUp.src = 'assets/sounds/level_up.mp3';
    gameAudio.sounds.gameOver.src = 'assets/sounds/game_over.mp3';
    gameAudio.sounds.bgMusic.src = 'assets/sounds/background.mp3';
    
    // Configurar propriedades dos sons
    gameAudio.sounds.bgMusic.loop = true;
    gameAudio.sounds.bgMusic.volume = 0.1;
    
    // Configurar volumes individuais
    Object.values(gameAudio.sounds).forEach(sound => {
        if (sound !== gameAudio.sounds.bgMusic) {
            sound.volume = gameAudio.volume;
        }
    });
}

// Função para tocar som com fallback para geração de frequência
function playSound(soundName, frequency = 440, duration = 200) {
    if (!gameAudio.enabled) return;
    
    const sound = gameAudio.sounds[soundName];
    if (sound && sound.src && sound.readyState >= 2) {
        // Som carregado, tocar normalmente
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Erro ao tocar som:', e));
    } else {
        // Fallback: gerar som com Web Audio API
        generateSound(frequency, duration);
    }
}

// Gerador de som usando Web Audio API
function generateSound(frequency, duration, type = 'sine') {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(gameAudio.volume * 0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
        console.log('Web Audio não suportado:', e);
    }
}

// Arrays para gerenciar elementos do jogo
const bullets = [];
const enemies = [];
const powerups = [];
const explosions = [];
const particles = [];

// Imagens do jogo - Sistema avançado com sprites específicas
const playerImages = {
    // Spritesheet original para animação básica
    spritesheet: new Image(),
    
    // Sprites específicas para ações especiais
    corrente_mao_esquerda: new Image(),
    corrente_duas_maos: new Image(),
    maos_para_cima: new Image(),
    arma_para_cima: new Image(),
    
    // === NOVAS IMAGENS DE TIRO EM MÚLTIPLOS ÂNGULOS ===
    arma_disparando_cima: new Image(),
    arma_disparando_frente: new Image(),
    arma_disparando_60_baixo: new Image(),
    arma_disparando_90_graus: new Image(),
    // Sequência de ataque em oito quadros (10 FPS)
    attackFrames: Array.from({ length: 8 }, () => new Image()),
    // Novas animações 2D: oito quadros transparentes por ação
    idleFrames: Array.from({ length: 8 }, () => new Image()),
    walkFrames: Array.from({ length: 8 }, () => new Image()),
    runFrames: Array.from({ length: 8 }, () => new Image()),
    jumpFrames: Array.from({ length: 8 }, () => new Image()),
    hitFrames: Array.from({ length: 8 }, () => new Image()),
    deathFrames: Array.from({ length: 8 }, () => new Image())
};

// Carregar todas as imagens da Juliette
playerImages.spritesheet.src = 'assets/juliette_animated_spritesheet.png';
playerImages.corrente_mao_esquerda.src = 'assets/01 corrente mao esquerda.png';
playerImages.corrente_duas_maos.src = 'assets/01 corrente nas 2 maos.png';
playerImages.maos_para_cima.src = 'assets/01 maos para cima.png';
playerImages.arma_para_cima.src = 'assets/02 arma para cima.png';

// === CARREGAR NOVAS IMAGENS DE TIRO ===
playerImages.arma_disparando_cima.src = 'assets/03 arma para cima disparando.png';
playerImages.arma_disparando_frente.src = 'assets/03 arma disparando para frente.png';
playerImages.arma_disparando_60_baixo.src = 'assets/03 arma para cima disparando 60 graus para baixo.png';
playerImages.arma_disparando_90_graus.src = 'assets/03 arma para cima disparando 90 graus.png';

// Carregar os oito quadros da nova animação de ataque
playerImages.attackFrames.forEach((image, index) => {
    image.src = `assets/attack/attack_${String(index).padStart(3, '0')}.png`;
});

// Carregar as seis animações exportadas pelo SpriteForge Studio.
// Cada sequência possui oito PNGs RGBA de 256x256 pixels.
for (const [folder, frames] of Object.entries({
    idle: playerImages.idleFrames,
    walk: playerImages.walkFrames,
    run: playerImages.runFrames,
    jump: playerImages.jumpFrames,
    hit: playerImages.hitFrames,
    death: playerImages.deathFrames
})) {
    frames.forEach((image, index) => {
        image.src = `assets/${folder}/frames/frame_${String(index).padStart(3, '0')}.png`;
    });
}

// Imagens de fundo
const backgroundImg = new Image();
backgroundImg.src = 'assets/fundo 2d melhor fase 2.png';

const backgroundImgA = new Image();
backgroundImgA.src = 'assets/fundo 2d a.png';

// === NOVA IMAGEM DA FASE 2 ===
const backgroundImgPhase2 = new Image();
backgroundImgPhase2.src = 'assets/fundo 2d melhor fase 2.png';

const sceneImg = new Image();
sceneImg.src = 'assets/cena01.jpg';

// Sistema de animações avançado com sprites específicas
const animations = {
    // === ANIMAÇÕES BÁSICAS USANDO IMAGEM ESPECÍFICA ===
    // SEM ARMA - USANDO "01 MAOS PARA CIMA" COMO POSE PRINCIPAL
    idle_noweapon: { 
        type: 'sprite', 
        image: 'maos_para_cima', 
        duration: 9999999, // Duração muito longa para manter a pose
        description: 'Parada sem arma (mãos para cima)' 
    },
    walk_noweapon: { 
        type: 'sprite', 
        image: 'maos_para_cima', 
        duration: 9999999,
        description: 'Caminhada sem arma (mãos para cima)' 
    },
    
    // COM ARMA - USANDO SPRITESHEET ORIGINAL PARA ANIMAÇÕES COM ARMA
    idle_weapon: { 
        type: 'spritesheet', 
        start: 1, end: 1, speed: 60, row: 0,
        description: 'Parada com arma' 
    },
    walk_weapon: { 
        type: 'spritesheet', 
        start: 1, end: 5, speed: 12, row: 0,
        description: 'Caminhada com arma' 
    },
    attack_weapon: { 
        type: 'spritesheet', 
        start: 1, end: 5, speed: 8, row: 1,
        description: 'Ataque com arma horizontal' 
    },
    
    // === NOVAS ANIMAÇÕES DE MOVIMENTO (SpriteForge, 8 quadros / 10 FPS) ===
    idle: { type: 'frames', frames: playerImages.idleFrames, frameDurationTicks: 6, loop: true, duration: 48, description: 'Respiração em repouso' },
    walk: { type: 'frames', frames: playerImages.walkFrames, frameDurationTicks: 6, loop: true, duration: 48, description: 'Caminhada' },
    run: { type: 'frames', frames: playerImages.runFrames, frameDurationTicks: 6, loop: true, duration: 48, description: 'Corrida' },
    jump: { type: 'frames', frames: playerImages.jumpFrames, frameDurationTicks: 6, loop: false, duration: 48, description: 'Salto' },
    hit: { type: 'frames', frames: playerImages.hitFrames, frameDurationTicks: 6, loop: false, duration: 48, description: 'Impacto recebido' },
    death: { type: 'frames', frames: playerImages.deathFrames, frameDurationTicks: 6, loop: false, duration: 48, description: 'Queda ao perder uma vida' },

    // === ANIMAÇÕES ESPECIAIS (sprites individuais) ===
    // Ações com correntes
    chain_left_hand: { 
        type: 'sprite', 
        image: 'corrente_mao_esquerda', 
        duration: 30,
        description: 'Corrente na mão esquerda' 
    },
    chain_both_hands: { 
        type: 'sprite', 
        image: 'corrente_duas_maos', 
        duration: 45,
        description: 'Corrente nas duas mãos' 
    },
    
    // Ações com as mãos para cima
    hands_up: { 
        type: 'sprite', 
        image: 'maos_para_cima', 
        duration: 40,
        description: 'Mãos para cima (celebração/rendição)' 
    },
    
    // Ações com arma para cima
    weapon_up: { 
        type: 'sprite', 
        image: 'arma_para_cima', 
        duration: 35,
        description: 'Arma apontada para cima' 
    },
    
    // === NOVAS ANIMAÇÕES DE TIRO EM MÚLTIPLOS ÂNGULOS ===
    weapon_shoot_up: { 
        type: 'sprite', 
        image: 'arma_disparando_cima', 
        duration: 15,
        description: 'Disparando para cima' 
    },
    weapon_shoot_front: { 
        type: 'sprite', 
        image: 'arma_disparando_frente', 
        duration: 15,
        description: 'Disparando para frente' 
    },
    weapon_shoot_diagonal_down: { 
        type: 'sprite', 
        image: 'arma_disparando_60_baixo', 
        duration: 15,
        description: 'Disparando 60° para baixo' 
    },
    weapon_shoot_90: { 
        type: 'sprite', 
        image: 'arma_disparando_90_graus', 
        duration: 15,
        description: 'Disparando em 90 graus' 
    },

    // Nova sequência animada de ataque frontal (8 quadros, 10 FPS)
    weapon_attack_sequence: {
        type: 'sequence',
        frames: playerImages.attackFrames,
        frameDurationTicks: 6, // 60 atualizações/s ÷ 10 FPS
        duration: 48, // 8 quadros × 6 atualizações
        description: 'Sequência de disparo com recuo e retorno'
    }
};

// Variáveis de controle do jogador
let hasWeapon = false;
let currentAnim = 'idle';  // Começa com a nova animação de repouso
let sequenceFrameIndex = 0;
let sequenceFrameCounter = 0;
let actionFrameIndex = 0;
let actionFrameCounter = 0;
let isRunning = false;
let frameIndex = 0;
let frameCounter = 0;
let posX = 100;
let posY = 0; // Será calculado dinamicamente
let moving = false;
let attacking = false;
let facingRight = true;
let playerSpeed = 4;
let playerHealth = 100;
let canShoot = true;
let shootCooldown = 0;
let weaponType = 'storm'; // none, normal, spread, laser, machine, plasma, storm, nuclear
let invulnerable = false;
let invulnerableTime = 0;

// === NOVO SISTEMA DE ESCUDO ===
let shieldActive = true; // NOVO: Começa com escudo ativo
let shieldEnergy = 100;
let shieldMaxEnergy = 100;
let shieldRegenRate = 0.5;
let shieldCooldown = 0;
let shieldEffects = [];
let shieldHitEffects = [];
// === ESCUDO INICIAL ===
let initialShieldActive = true; // Escudo especial inicial
let initialShieldDuration = 3600; // 60 segundos * 60 frames = 3600 frames
let initialShieldTimer = 3600; // Cronômetro regressivo

// === SISTEMA DE BOMBA ===
let bombCount = 30; // Quantidade inicial de bombas
let maxBombs = 500; // Máximo de bombas que o jogador pode ter
let bombCooldown = 0; // Cooldown entre usar bombas
let bombMaxCooldown = 300; // 5 segundos de cooldown

// === NOVO SISTEMA DE DISCO DE LAVA FLUTUANTE ===
let lavaDiscActive = true; // Estado do disco de lava
let lavaDisc = {
    x: 0,
    y: 0,
    radius: 40,
    heatIntensity: 0,
    colorPhase: 0,
    pulsePhase: 0,
    particles: [],
    floatOffset: 0,
    active: false,
    targetX: 0,
    targetY: 0
};

// Estados de cores da lava (quente para muito quente)
const lavaColors = [
    { r: 120, g: 20, b: 0 },   // Lava escura/resfriando
    { r: 180, g: 40, b: 0 },   // Lava média
    { r: 255, g: 80, b: 0 },   // Lava quente (laranja)
    { r: 255, g: 140, b: 0 },  // Lava muito quente (laranja brilhante)
    { r: 255, g: 200, b: 20 }, // Lava extremamente quente (amarelo-laranja)
    { r: 255, g: 255, b: 100 } // Lava incandescente (amarelo brilhante)
];

// === NOVAS VARIÁVEIS PARA ANIMAÇÕES ESPECIAIS ===
let specialAnimTimer = 0;  // Timer para animações especiais
let isInSpecialAnim = false;  // Flag para controlar animações especiais
let previousAnim = 'idle_noweapon';  // Para voltar à animação anterior

// Sistema de armas especiais/correntes
let chainWeaponActive = false;
let chainWeaponType = 'none'; // 'left_hand', 'both_hands'
let chainAttackCooldown = 0;

// Sistema de celebração/vitória
let celebrationMode = false;
let celebrationTimer = 0;

// Sistema de tiro vertical
let shootingUp = false;
let shootingUpTimer = 0;

// Física do jogador (estilo Contra)
let velocityY = 0;
let onGround = false;
let jumpPower = -12;
const gravity = 0.6;
const groundLevel = CANVAS_HEIGHT - (frameHeight * scale) - 20;
let maxJumpHeight = 150;

// Sistema de plataformas (como no Contra)
const platforms = [
    // Plataformas principais (chão)
    // OBS: o "topo" do chão deve alinhar com o mesmo nível em que o personagem pisa
    { x: 0, y: groundLevel, width: CANVAS_WIDTH * 13, height: 100, type: 'ground' },
    
    // Plataformas elevadas (degraus)
    { x: 200, y: groundLevel - 80, width: 150, height: 20, type: 'platform' },
    { x: 450, y: groundLevel - 120, width: 180, height: 20, type: 'platform' },
    { x: 700, y: groundLevel - 60, width: 120, height: 20, type: 'platform' },
    { x: 900, y: groundLevel - 100, width: 160, height: 20, type: 'platform' },
    { x: 1150, y: groundLevel - 140, width: 140, height: 20, type: 'platform' },
    { x: 1400, y: groundLevel - 80, width: 200, height: 20, type: 'platform' },
    
    // Plataformas mais altas
    { x: 350, y: groundLevel - 200, width: 100, height: 20, type: 'platform' },
    { x: 600, y: groundLevel - 180, width: 120, height: 20, type: 'platform' },
    { x: 1000, y: groundLevel - 220, width: 110, height: 20, type: 'platform' },
    
    // Plataformas de dificuldade (mais distantes)
    { x: 1300, y: groundLevel - 200, width: 80, height: 20, type: 'platform' },
    { x: 1500, y: groundLevel - 160, width: 100, height: 20, type: 'platform' }
];

// Configurações de armas (inspirado no Contra) - SISTEMA PROGRESSIVO
const weapons = {
    normal: { 
        damage: 20, speed: 8, cooldown: 10, color: '#ffff00',
        description: 'Tiro Normal',
        bulletSize: 4, bulletCount: 1, ammo: 1000
    },
    spread: { 
        damage: 18, speed: 9, cooldown: 8, color: '#ffff00',
        description: 'Tiro Triplo Expandido', 
        bulletSize: 5, bulletCount: 3, spreadAngle: 25, ammo: 1000
    },
    laser: { 
        damage: 35, speed: 14, cooldown: 12, color: '#ffff00',
        description: 'Laser Penetrante',
        bulletSize: 8, bulletCount: 1, piercing: true, ammo: 1000
    },
    machine: { 
        damage: 15, speed: 12, cooldown: 3, color: '#ffff00',
        description: 'Metralhadora Rápida',
        bulletSize: 3, bulletCount: 2, ammo: 1000
    },
    // === NOVAS ARMAS PROGRESSIVAS ===
    plasma: {
        damage: 45, speed: 16, cooldown: 15, color: '#ffff00',
        description: 'Plasma Devastador',
        bulletSize: 10, bulletCount: 1, explosive: true, ammo: 1000
    },
    storm: {
        damage: 25, speed: 11, cooldown: 6, color: '#ffff00', 
        description: 'Tempestade de Projéteis',
        bulletSize: 4, bulletCount: 5, spreadAngle: 40, ammo: 1000
    },
    nuclear: {
        damage: 80, speed: 10, cooldown: 25, color: '#ffff00',
        description: 'Núcleo Atômico',
        bulletSize: 15, bulletCount: 1, explosive: true, piercing: true, ammo: 1000
    }
};

// Variáveis da animação do cenário
let backgroundX = 0;
let backgroundSpeed = 2.5; // Velocidade aumentada
let backgroundScrolling = false;
let parallaxOffset = 0; // Para efeito parallax

// === SISTEMA DE PAINEL DE CONTROLES RECOLHÍVEL ===
let controlsPanelVisible = true;
let controlsPanelToggleTimer = 0;
const CONTROLS_PANEL_TOGGLE_COOLDOWN = 30; // 30 frames = 0.5 segundos

// Controles do teclado
const keys = {};

// Estado de modificadores para mira fina (evita teclas "presas" e inconsistências)
let aimModifierState = {
    shift: false,
    ctrl: false
};

function updateModifierStateFromEvent(e) {
    aimModifierState.shift = !!e.shiftKey;
    aimModifierState.ctrl = !!e.ctrlKey;
}

function resetInputState() {
    for (const k in keys) {
        keys[k] = false;
    }
    aimModifierState.shift = false;
    aimModifierState.ctrl = false;
    moving = false;
    backgroundScrolling = false;
    attacking = false;
}

// Se o jogo perder foco, evitar Shift/Ctrl/Setas ficarem "presas" (isso quebra o 30°)
window.addEventListener('blur', resetInputState);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetInputState();
});

document.addEventListener('keydown', e => {
    // Evitar scroll/padrões do navegador enquanto joga
    if (e.code === 'Space' || e.code.startsWith('Arrow')) {
        e.preventDefault();
    }

    keys[e.code] = true;
    updateModifierStateFromEvent(e);

    // Mira 360°: cada toque em ArrowUp/ArrowDown gira o ângulo em 10° (sem repetir ao segurar)
    // 0° = direita, 90° = cima, 180° = esquerda, 270° = baixo
    if (e.code === 'ArrowUp' && !e.repeat) {
        aimAngleDisplayDegrees = (aimAngleDisplayDegrees + 10) % 360;
        console.log('🎯 aimAngleDisplayDegrees:', aimAngleDisplayDegrees);
    }
    if (e.code === 'ArrowDown' && !e.repeat) {
        aimAngleDisplayDegrees = (aimAngleDisplayDegrees - 10) % 360;
        if (aimAngleDisplayDegrees < 0) aimAngleDisplayDegrees += 360;
        console.log('🎯 aimAngleDisplayDegrees:', aimAngleDisplayDegrees);
    }

    // Ajuste fino opcional
    if (e.code === 'BracketLeft') {
        aimAngleDisplayDegrees = (aimAngleDisplayDegrees - 5) % 360;
        if (aimAngleDisplayDegrees < 0) aimAngleDisplayDegrees += 360;
        console.log('🎯 aimAngleDisplayDegrees:', aimAngleDisplayDegrees);
    }
    if (e.code === 'BracketRight') {
        aimAngleDisplayDegrees = (aimAngleDisplayDegrees + 5) % 360;
        console.log('🎯 aimAngleDisplayDegrees:', aimAngleDisplayDegrees);
    }
    
    // === CONTROLES BÁSICOS ===
    if (e.code === 'ArrowRight') {
        if (!isInSpecialAnim) {
            moving = true;
            facingRight = true;
            backgroundScrolling = true;
        }
    }
    if (e.code === 'ArrowLeft') {
        if (!isInSpecialAnim) {
            moving = true;
            facingRight = false;
            backgroundScrolling = true;
        }
    }
    if (e.code === 'ArrowUp') {
        // ArrowUp é usado apenas para MIRAR (o pulo é no Z)
        // Não iniciar animação especial aqui, senão bloqueia movimento/tiro em diagonais.
    }
    if (e.code === 'ArrowDown') {
        // ArrowDown agora controla a mira (desce a arma)
    }
    
    // === CONTROLES DE COMBATE ===
    if (e.code === 'Space' || e.code === 'KeyX') {
        if (!isInSpecialAnim) {
            // Sempre usar shoot() para permitir vários ângulos via combinação de teclas
            shoot();
            attacking = true;
        }
    }
    
    if (e.code === 'KeyZ') {
        if (!isInSpecialAnim) {
            jump();
        }
    }
    
    // === NOVOS CONTROLES ESPECIAIS ===
    if (e.code === 'KeyA') {
        // Ataque com corrente (mão esquerda)
        if (!isInSpecialAnim && chainAttackCooldown === 0) {
            chainAttack('left_hand');
        }
    }
    
    if (e.code === 'KeyS') {
        // Ataque com corrente (ambas as mãos)
        if (!isInSpecialAnim && chainAttackCooldown === 0) {
            chainAttack('both_hands');
        }
    }
    
    if (e.code === 'KeyC') {
        // Celebração/Mãos para cima
        if (!isInSpecialAnim) {
            startSpecialAnimation('hands_up');
            celebrationMode = true;
            
            // Som de celebração
            playSound('celebration', 550, 500);
        }
    }
    
    // === CONTROLES DE SISTEMA ===
    if (e.code === 'KeyR' && gameState.gameOver) {
        restartGame();
    }
    
    
    if (e.code === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }
    
    if (e.code === 'KeyM') {
        // Alternar sons
        gameAudio.enabled = !gameAudio.enabled;
        console.log('Sons:', gameAudio.enabled ? 'Ligados' : 'Desligados');
    }
    
    if (e.code === 'KeyH') {
        // Alternar visibilidade do painel de controles
        if (controlsPanelToggleTimer === 0) {
            controlsPanelVisible = !controlsPanelVisible;
            controlsPanelToggleTimer = CONTROLS_PANEL_TOGGLE_COOLDOWN;
            console.log('Painel de controles:', controlsPanelVisible ? 'Visível' : 'Oculto');
        }
    }

    // Alternar tiro em todos os ângulos (multi = 8 direções ao mesmo tempo)
    if (e.code === 'KeyT') {
        const next = currentShootType === 'multi' ? 'normal' : 'multi';
        changeShootType(next);
    }
    
    // === CONTROLE DO ESCUDO ===
    if (e.code === 'KeyD') {
        // Ativar escudo
        if (shieldEnergy > 20 && shieldCooldown === 0) {
            activateShield();
        }
    }
    
    // === CHEAT CODES PARA TESTE - ARMAS PROGRESSIVAS ===
    if (e.code === 'Digit1') {
        weaponType = 'normal';
    }
    if (e.code === 'Digit2') {
        weaponType = 'spread';
    }
    if (e.code === 'Digit3') {
        weaponType = 'laser';
    }
    if (e.code === 'Digit4') {
        weaponType = 'machine';
    }
    if (e.code === 'Digit5') {
        weaponType = 'plasma';
    }
    if (e.code === 'Digit6') {
        weaponType = 'storm';
    }
    if (e.code === 'Digit7') {
        weaponType = 'nuclear';
    }
    if (e.code === 'Digit8') {
        // Arma especial adicional (pode ser expandida no futuro)
        weaponType = 'nuclear'; // Por enquanto, usa a mesma arma nuclear
    }
    
    // === CONTROLE DA BOMBA ===
    if (e.code === 'KeyB') {
        // Ativar bomba
        if (bombCount > 0 && bombCooldown === 0) {
            activateBomb();
        }
    }
    
    // === NOVO CONTROLE DO DISCO DE LAVA ===
    if (e.code === 'KeyL') {
        // Ativar/desativar disco de lava
        toggleLavaDisc();
    }
});

document.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) {
        e.preventDefault();
    }

    keys[e.code] = false;
    updateModifierStateFromEvent(e);
    
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        moving = false;
        backgroundScrolling = false;
    }
    if (e.code === 'Space' || e.code === 'KeyX') {
        attacking = false;
    }
    if (e.code === 'KeyD') {
        // Desativar escudo
        deactivateShield();
    }
});

// Função de tiro (inspirada no Contra)
function shoot() {
    if (!canShoot || shootCooldown > 0 || weaponType === 'none') return;
    
    const weapon = weapons[weaponType];
    // Consumo de munição: se definido, impedir quando zerar
    if (typeof weapon.ammo === 'number') {
        if (!weapon.currentAmmo && weapon.currentAmmo !== 0) weapon.currentAmmo = weapon.ammo;
        if (weapon.currentAmmo <= 0) return;
    }
    const playerCenterX = posX + (frameWidth * scale) / 2;
    const playerCenterY = posY + (frameHeight * scale) / 2;
    
    // Som de tiro baseado na arma
    let shootFreq = 440;
    switch(weaponType) {
        case 'normal': shootFreq = 440; break;
        case 'spread': shootFreq = 520; break;
        case 'laser': shootFreq = 660; break;
        case 'machine': shootFreq = 380; break;
    }
    playSound('shoot', shootFreq, 150);
    
    // === NOVO: DETERMINAR DIREÇÃO BASEADA NO TIPO DE TIRO SELECIONADO ===
    let shootDirection = getShootDirectionByType();
    
    // === SISTEMA DE ANIMAÇÃO INTELIGENTE BASEADO NO ÂNGULO ===
    triggerShootAnimation(shootDirection.angle);
    
    // === VERIFICAR SE É TIRO MÚLTIPLO ===
    if (currentShootType === 'multi') {
        // Tiro múltiplo: disparar em 8 direções
        const directions = [0, -45, -90, -135, 180, 135, 90, 45];
        
        for (const angle of directions) {
            const multiDirection = { angle: angle, speed: shootDirection.speed };
            
            switch(weaponType) {
                case 'normal':
                    createDirectionalBullet(playerCenterX, playerCenterY, multiDirection, weapon);
                    break;
                case 'spread':
                    createDirectionalBullet(playerCenterX, playerCenterY, multiDirection, weapon);
                    break;
                case 'laser':
                    createDirectionalBullet(playerCenterX, playerCenterY, multiDirection, weapon, 'laser');
                    break;
                case 'machine':
                    createDirectionalBullet(playerCenterX, playerCenterY, multiDirection, weapon);
                    break;
                case 'plasma':
                    createDirectionalBullet(playerCenterX, playerCenterY, multiDirection, weapon, 'plasma');
                    break;
                case 'storm':
                    createDirectionalBullet(playerCenterX, playerCenterY, multiDirection, weapon, 'storm');
                    break;
                case 'nuclear':
                    createDirectionalBullet(playerCenterX, playerCenterY, multiDirection, weapon, 'nuclear');
                    break;
            }
        }
        
        // Para tipo múltiplo, consumir munição multiplicado por 8 (número de direções)
        if (typeof weapon.ammo === 'number') {
            const baseShots = weaponType === 'spread' ? 3 : weaponType === 'machine' ? 2 : 1;
            weapon.currentAmmo = Math.max(0, (weapon.currentAmmo ?? weapon.ammo) - (baseShots * 8));
        }
    } else {
        // === TIROS NORMAIS (NÃO MÚLTIPLOS) ===
        switch(weaponType) {
            case 'normal':
                createDirectionalBullet(playerCenterX, playerCenterY, shootDirection, weapon);
                break;
                
            case 'spread':
                // Tiro triplo expandido melhorado
                const spreadAngle = weapon.spreadAngle || 15;
                createDirectionalBullet(playerCenterX, playerCenterY, shootDirection, weapon);
                createDirectionalBullet(playerCenterX, playerCenterY, 
                    { angle: shootDirection.angle + spreadAngle, speed: shootDirection.speed }, weapon);
                createDirectionalBullet(playerCenterX, playerCenterY, 
                    { angle: shootDirection.angle - spreadAngle, speed: shootDirection.speed }, weapon);
                break;
                
            case 'laser':
                createDirectionalBullet(playerCenterX, playerCenterY, shootDirection, weapon, 'laser');
                break;
                
            case 'machine':
                // Tiros duplos da metralhadora
                createDirectionalBullet(playerCenterX, playerCenterY, shootDirection, weapon);
                createDirectionalBullet(playerCenterX, playerCenterY, 
                    { angle: shootDirection.angle + 5, speed: shootDirection.speed }, weapon);
                break;
                
            case 'plasma':
                createDirectionalBullet(playerCenterX, playerCenterY, shootDirection, weapon, 'plasma');
                break;
                
            case 'storm':
                // Tempestade de 5 projéteis
                const stormSpread = weapon.spreadAngle || 40;
                const stormStep = stormSpread / (weapon.bulletCount - 1);
                for (let i = 0; i < weapon.bulletCount; i++) {
                    const angle = shootDirection.angle - (stormSpread/2) + (i * stormStep);
                    createDirectionalBullet(playerCenterX, playerCenterY, 
                        { angle: angle, speed: shootDirection.speed }, weapon, 'storm');
                }
                break;
                
            case 'nuclear':
                createDirectionalBullet(playerCenterX, playerCenterY, shootDirection, weapon, 'nuclear');
                break;
        }
        
        // Diminuir munição para tiros normais
        if (typeof weapon.ammo === 'number') {
            let shots = 1;
            if (weaponType === 'spread') shots = weapon.bulletCount;
            if (weaponType === 'machine') shots = 2;
            if (weaponType === 'storm') shots = weapon.bulletCount;
            weapon.currentAmmo = Math.max(0, (weapon.currentAmmo ?? weapon.ammo) - shots);
        }
    }
    
    // Diminuir munição após disparo(s)
    if (typeof weapon.ammo === 'number') {
        let shots = 1;
        if (weaponType === 'spread') shots = weapon.bulletCount;
        if (weaponType === 'machine') shots = 2;
        if (weaponType === 'storm') shots = weapon.bulletCount;
        weapon.currentAmmo = Math.max(0, (weapon.currentAmmo ?? weapon.ammo) - shots);
    }

    shootCooldown = weapon.cooldown;
}

// === NOVA FUNÇÃO: DETERMINAR DIREÇÃO BASEADA NO TIPO DE TIRO SELECIONADO ===
function getShootDirectionByType() {
    const baseSpeed = weapons[weaponType].speed;
    const typeSettings = shootTypeSettings[currentShootType];

    // Mira 360° é o padrão. Só exceção é o modo multi.
    if (currentShootType !== 'multi') {
        return getShootDirection();
    }

    // Se é tipo 'multi', disparar em múltiplas direções
    if (typeSettings && typeSettings.forceDirection === 'multi') {
        return getMultiDirectionShoot();
    }

    // Fallback (segurança)
    return { angle: 0, speed: baseSpeed };
}

// === NOVA FUNÇÃO: SISTEMA DE TIRO MÚLTIPLO ===
function getMultiDirectionShoot() {
    // Para o tipo 'multi', a função principal de tiro será chamada várias vezes
    // Cada chamada retorna uma direção diferente
    const baseSpeed = weapons[weaponType].speed;
    
    // Definir as direções do tiro múltiplo (em graus)
    const directions = [
        0,    // Direita
        -45,  // Diagonal cima-direita
        -90,  // Cima
        -135, // Diagonal cima-esquerda
        180,  // Esquerda
        135,  // Diagonal baixo-esquerda
        90,   // Baixo
        45    // Diagonal baixo-direita
    ];
    
    // Retornar direção aleatória para criar variação
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    
    return {
        angle: randomDirection,
        speed: baseSpeed
    };
}

// Mira 360° em graus no estilo "transferidor":
// 0° = direita, 90° = cima, 180° = esquerda, 270° = baixo
// Controlado pelo usuário durante o jogo:
// - toque em ArrowUp: +10°
// - toque em ArrowDown: -10°
// - [ e ] ajustam fino em 5° (opcional)
let aimAngleDisplayDegrees = 0;

// Transparência do mostrador (padrão um pouco mais visível)
let aimIndicatorOpacity = 0.12;

// Escala do mostrador (régua) - controlada por slider
let aimIndicatorScale = 1.0;

// Rotação contínua ao segurar ↑/↓
let aimHoldLastTimeMs = 0;
const AIM_HOLD_INTERVAL_MS = 60;
const AIM_HOLD_STEP_DEG = 5;

function getAimAngleGameDegrees() {
    // Converter do display (0=dir,90=cima) para o sistema do jogo (0=dir,90=baixo)
    // game = 360 - display
    let a = (360 - (aimAngleDisplayDegrees % 360)) % 360;
    if (a < 0) a += 360;
    return a;
}

function updateAimHoldRotation(currentTime) {
    // currentTime vem do requestAnimationFrame (ms)
    if (!currentTime && currentTime !== 0) return;

    const upHeld = !!keys['ArrowUp'];
    const downHeld = !!keys['ArrowDown'];

    // Se ambos, não gira
    if ((upHeld && downHeld) || (!upHeld && !downHeld)) {
        aimHoldLastTimeMs = currentTime;
        return;
    }

    if (!aimHoldLastTimeMs) aimHoldLastTimeMs = currentTime;

    const elapsed = currentTime - aimHoldLastTimeMs;
    if (elapsed < AIM_HOLD_INTERVAL_MS) return;

    const steps = Math.floor(elapsed / AIM_HOLD_INTERVAL_MS);
    aimHoldLastTimeMs += steps * AIM_HOLD_INTERVAL_MS;

    let delta = 0;
    if (upHeld) delta += AIM_HOLD_STEP_DEG * steps;
    if (downHeld) delta -= AIM_HOLD_STEP_DEG * steps;

    aimAngleDisplayDegrees = (aimAngleDisplayDegrees + delta) % 360;
    if (aimAngleDisplayDegrees < 0) aimAngleDisplayDegrees += 360;
}

// Função para determinar direção do tiro baseado nas teclas
function getShootDirection() {
    const baseSpeed = weapons[weaponType].speed;

    // Mira 360° persistente
    return {
        angle: getAimAngleGameDegrees(),
        speed: baseSpeed
    };
}

// Criar bala com direção específica
function createDirectionalBullet(x, y, direction, weapon, type = 'normal') {
    const angleRad = (direction.angle * Math.PI) / 180;
    const vx = Math.cos(angleRad) * direction.speed;
    const vy = Math.sin(angleRad) * direction.speed;
    
    createBullet(x, y, vx, vy, weapon, type);
}

// Criar bala
function createBullet(x, y, vx, vy, weapon, type = 'normal') {
    bullets.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        damage: weapon.damage,
        color: weapon.color,
        type: type,
        size: weapon.bulletSize || 4,
        life: 120,
        // === PROPRIEDADES AVANÇADAS DAS BALAS ===
        piercing: weapon.piercing || false,
        explosive: weapon.explosive || false,
        explosionRadius: type === 'nuclear' ? 50 : type === 'plasma' ? 30 : 0,
        trail: [], // Para rastro visual
        glowIntensity: Math.random() * 0.3 + 0.7
    });
}

// Função de pulo (nova física)
function jump() {
    if (onGround) {
        velocityY = jumpPower;
        onGround = false;
        
        // Som de pulo
        playSound('jump', 330, 200);
    }
}

// Verificar colisão com plataformas
function checkPlatformCollisions() {
    const playerRect = {
        x: posX,
        y: posY,
        width: frameWidth * scale,
        height: frameHeight * scale
    };
    
    onGround = false;
    
    for (const platform of platforms) {
        // Ajustar posição da plataforma com o scroll
        const platformX = platform.x + backgroundX;
        
        // Verifica se está sobre a plataforma
        if (playerRect.x + playerRect.width > platformX && 
            playerRect.x < platformX + platform.width) {
            
            // Colisão por cima (pousando na plataforma)
            if (playerRect.y + playerRect.height > platform.y && 
                playerRect.y + playerRect.height < platform.y + platform.height + 10 &&
                velocityY >= 0) {
                
                posY = platform.y - playerRect.height;
                velocityY = 0;
                onGround = true;
            }
        }
    }
    
    // Verifica colisão com o chão (usando valor dinâmico)
    const currentGroundLevel = CANVAS_HEIGHT - (frameHeight * scale) - 20;
    if (posY + playerRect.height >= currentGroundLevel) {
        posY = currentGroundLevel - playerRect.height;
        velocityY = 0;
        onGround = true;
    }
}

// Desenhar plataformas com efeitos cyberpunk
function drawPlatforms() {
    const time = Date.now() * 0.005;

    // Nível do chão (onde o personagem pisa)
    const groundSurfaceY = CANVAS_HEIGHT - (frameHeight * scale) - 20;
    
    for (const platform of platforms) {
        const platformX = platform.x + backgroundX;

        // Para os degraus/obstáculos (type=platform), desenhar até o chão
        const visualY = platform.y;
        const visualHeight = (platform.type === 'platform')
            ? Math.max(platform.height, groundSurfaceY - platform.y)
            : platform.height;
        
        // Só desenha se estiver visível na tela
        if (platformX + platform.width > -50 && platformX < CANVAS_WIDTH + 50) {
            // Efeito cyberpunk piscante verde brilhante
            const glowIntensity = Math.sin(time * 3) * 0.3 + 0.7;
            const pulseIntensity = Math.sin(time * 5 + platform.x * 0.01) * 0.2 + 0.8;
            
            // Cor base da plataforma com efeito piscante
            const baseColor = `rgba(0, ${Math.floor(255 * glowIntensity)}, 0, ${pulseIntensity})`;
            const edgeColor = `rgba(0, ${Math.floor(255 * glowIntensity * 1.2)}, 50, ${pulseIntensity * 1.1})`;
            
            // Sombra/glow cyberpunk
            ctx.save();
            ctx.shadowColor = `rgb(0, ${Math.floor(255 * glowIntensity)}, 0)`;
            ctx.shadowBlur = 15 * glowIntensity;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // Corpo principal da plataforma
            ctx.fillStyle = baseColor;
            ctx.fillRect(platformX, visualY, platform.width, visualHeight);
            
            // Borda superior brilhante
            ctx.fillStyle = edgeColor;
            ctx.fillRect(platformX, visualY, platform.width, 3);
            
            // Linhas de energia piscantes
            for (let i = 0; i < platform.width; i += 30) {
                const lineIntensity = Math.sin(time * 4 + i * 0.1) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(0, ${Math.floor(255 * lineIntensity)}, 100, ${lineIntensity})`;
                ctx.fillRect(platformX + i + 2, visualY + 2, 2, Math.max(1, visualHeight - 4));
            }
            
            // Partículas de energia
            for (let i = 0; i < 3; i++) {
                const particleX = platformX + (Math.sin(time * 2 + i) * platform.width * 0.3) + platform.width * 0.5;
                const particleY = visualY - 5 - (Math.abs(Math.sin(time * 3 + i)) * 8);
                const particleSize = 2 + Math.sin(time * 4 + i) * 1;
                
                ctx.fillStyle = `rgba(0, 255, 0, ${glowIntensity})`;
                ctx.beginPath();
                ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
    }
}

// Desenhar limite de solo (linha preta abaixo do jogo)
function drawGroundLimit() {
    const groundY = CANVAS_HEIGHT - (frameHeight * scale) - 20;
    const time = Date.now() * 0.003;
    
    ctx.save();
    
    // Linha preta principal do solo
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, groundY + (frameHeight * scale));
    ctx.lineTo(CANVAS_WIDTH, groundY + (frameHeight * scale));
    ctx.stroke();
    
    // Linha adicional mais espessa para delimitar bem
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, groundY + (frameHeight * scale) + 5);
    ctx.lineTo(CANVAS_WIDTH, groundY + (frameHeight * scale) + 5);
    ctx.stroke();
    
    // Efeito cyberpunk no limite - linhas piscantes verdes
    const glowIntensity = Math.sin(time * 4) * 0.4 + 0.6;
    ctx.shadowColor = `rgb(0, ${Math.floor(255 * glowIntensity)}, 0)`;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `rgba(0, ${Math.floor(255 * glowIntensity)}, 0, ${glowIntensity})`;
    ctx.lineWidth = 2;
    
    // Linhas de energia correndo ao longo do limite
    for (let x = 0; x < CANVAS_WIDTH; x += 50) {
        const offset = Math.sin(time * 3 + x * 0.01) * 3;
        ctx.beginPath();
        ctx.moveTo(x, groundY + (frameHeight * scale) + offset);
        ctx.lineTo(x + 30, groundY + (frameHeight * scale) + offset);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Atualizar física do jogador
function updatePlayerPhysics() {
    // Aplicar gravidade
    if (!onGround) {
        velocityY += gravity;
    }
    
    // Atualizar posição vertical
    posY += velocityY;
    
    // Verificar colisões com plataformas
    checkPlatformCollisions();
    
    // Limitar a altura máxima (teto)
    if (posY < 80) {
        posY = 80;
        velocityY = 0;
    }
}

// Criar inimigo
function createEnemy(type = 'soldier') {
    const enemyTypes = {
        soldier: {
            health: 30,
            damage: 15,
            speed: 2.1,
            color: '#ff4444',
            size: 20,
            shootChance: 0.03,
            usePlayerSprite: true,
            tintPalette: ['#ff4444', '#44ff44', '#44aaff', '#ff44ff', '#ffaa00', '#00ffff']
        },
        robot: {
            health: 60,
            damage: 25,
            speed: 1.2,
            color: '#4444ff',
            size: 30,
            shootChance: 0.015,
            usePlayerSprite: true,
            tintPalette: ['#66ccff', '#4444ff', '#00ffff', '#00ff99']
        },
        boss: {
            // Chefão gigante
            health: 1500,
            damage: 45,
            speed: 0.9,
            color: '#8B00FF',
            size: 80,
            shootChance: 0.06,
            isBoss: true,
            usePlayerSprite: true,
            spriteScale: 2.4,
            tintPalette: ['#8B00FF', '#ff00aa', '#aa00ff']
        }
    };

    const enemy = enemyTypes[type];

    // Dimensões do sprite do inimigo (usar a mesma base da personagem)
    const spriteScale = enemy.spriteScale || 1.0;
    const enemyW = frameWidth * scale * spriteScale;
    const enemyH = frameHeight * scale * spriteScale;

    // Spawn: normalmente no chão, às vezes em plataformas elevadas (estilo Contra)
    const groundSurfaceY = CANVAS_HEIGHT - (frameHeight * scale) - 20;

    // Pegar uma plataforma aleatória (inclui chão) para spawn
    // Boss sempre nasce no chão
    const spawnOnPlatform = (type !== 'boss') && (Math.random() < 0.25);
    let spawnY = groundSurfaceY - enemyH;

    if (spawnOnPlatform) {
        const elevated = platforms.filter(p => p.type === 'platform');
        if (elevated.length > 0) {
            const p = elevated[Math.floor(Math.random() * elevated.length)];
            spawnY = p.y - enemyH;
        }
    }

    // Cor/tinta do inimigo (misturados)
    const palette = Array.isArray(enemy.tintPalette) ? enemy.tintPalette : ['#ff4444'];
    const tintColor = palette[Math.floor(Math.random() * palette.length)];

    // === FORMAS ALEATÓRIAS PARA INIMIGOS (mantido para compatibilidade, mas sprite tem prioridade) ===
    const shapes = ['square', 'circle', 'triangle'];
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];

    enemies.push({
        x: CANVAS_WIDTH + 80 + Math.random() * 220,
        y: spawnY,
        vx: -enemy.speed,
        vy: 0,
        onGround: false,
        health: enemy.health,
        maxHealth: enemy.health,
        damage: enemy.damage,
        color: enemy.color,
        size: enemy.size,
        w: enemyW,
        h: enemyH,
        type: type,
        isBoss: !!enemy.isBoss,
        shootChance: enemy.shootChance,
        shootCooldown: 0,

        // IA simples "autônoma" (andar / parar / mudar direção / pular)
        ai: {
            facingRight: false,
            changeDirTimer: 40 + Math.floor(Math.random() * 140),
            pauseTimer: 0,
            jumpCooldown: 20 + Math.floor(Math.random() * 80)
        },

        // Estado de animação individual; os PNGs são compartilhados com Juliette.
        anim: {
            state: 'idle',
            frameIndex: 0,
            frameCounter: 0,
            frameDuration: 6
        },

        // Render
        renderMode: 'spriteForge',
        tintColor: tintColor,

        // === NOVO: FORMA ALEATÓRIA ===
        shape: randomShape,

        // === NOVO: SISTEMA DE ÁTOMOS ORBITANTES ===
        atomOrbs: {
            count: type === 'boss' ? 6 : (type === 'robot' ? 4 : 3),
            orbs: [],
            rotationSpeed: type === 'boss' ? 0.02 : (type === 'robot' ? 0.03 : 0.05),
            radius: type === 'boss' ? 90 : (type === 'robot' ? 45 : 35),
            initialized: false
        }
    });

    // Inicializar átomos orbitantes
    const newEnemy = enemies[enemies.length - 1];
    initializeEnemyAtoms(newEnemy);
}

// === NOVA FUNÇÃO: INICIALIZAR ÁTOMOS ORBITANTES DOS INIMIGOS ===
function initializeEnemyAtoms(enemy) {
    enemy.atomOrbs.orbs = [];
    
    for (let i = 0; i < enemy.atomOrbs.count; i++) {
        const angle = (i / enemy.atomOrbs.count) * Math.PI * 2;
        
        // Cores especiais para o chefão
        let orbColors;
        if (enemy.type === 'boss') {
            // Chefão: cores roxas/magentas vibrantes
            orbColors = ['#8B00FF', '#FF00FF', '#FF00AA', '#AA00FF', '#DA00FF', '#FF00DD'];
        } else if (enemy.type === 'robot') {
            orbColors = ['#00FFFF', '#0080FF', '#4040FF'];
        } else {
            orbColors = ['#FF4040', '#FF8040', '#FFFF40'];
        }
        
        const orb = {
            angle: angle,
            initialAngle: angle,
            radius: enemy.atomOrbs.radius,
            size: enemy.type === 'boss' ? (Math.random() * 4 + 4) : (Math.random() * 3 + 2), // Chefão tem átomos maiores
            speed: enemy.atomOrbs.rotationSpeed + (Math.random() * 0.02 - 0.01),
            color: orbColors[i % orbColors.length],
            pulse: Math.random() * Math.PI * 2,
            orbit: {
                radiusVariation: enemy.type === 'boss' ? (Math.random() * 15 + 10) : (Math.random() * 10 + 5),
                tiltAngle: Math.random() * Math.PI * 0.3,
                eccentricity: enemy.type === 'boss' ? (Math.random() * 0.4) : (Math.random() * 0.3)
            }
        };
        enemy.atomOrbs.orbs.push(orb);
    }
    
    enemy.atomOrbs.initialized = true;
}

// Criar power-up
function createPowerup(x, y, type = 'random') {
    const powerupTypes = ['normal', 'spread', 'laser', 'machine', 'health', 'life', 'bomb'];
    if (type === 'random') {
        type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    }
    
    powerups.push({
        x: x,
        y: y,
        type: type,
        size: 15,
        bounce: 0,
        collected: false,
        vy: 0, // Velocidade vertical
        onGround: false // Flag para verificar se está no chão
    });
}

// Criar explosão
function createExplosion(x, y, size = 30) {
    explosions.push({
        x: x,
        y: y,
        size: 5,
        maxSize: size,
        life: 20,
        maxLife: 20
    });
    
    // Criar partículas
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 30,
            color: Math.random() > 0.5 ? '#ff6644' : '#ffaa44',
            size: Math.random() * 4 + 2
        });
    }
}

// Atualizar balas
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.life--;
        
        // Remove bala se saiu da tela ou morreu
        if (bullet.x < -20 || bullet.x > CANVAS_WIDTH + 20 || 
            bullet.y < -20 || bullet.y > CANVAS_HEIGHT + 20 || 
            bullet.life <= 0) {
            bullets.splice(i, 1);
        }
    }
}

// Verificar colisão do inimigo com plataformas/chão (física simples)
function checkEnemyPlatformCollisions(enemy) {
    const w = enemy.w || enemy.size;
    const h = enemy.h || enemy.size;

    const enemyRect = {
        x: enemy.x,
        y: enemy.y,
        width: w,
        height: h
    };

    enemy.onGround = false;

    // Colisão com plataformas (incluindo chão)
    for (const platform of platforms) {
        const platformX = platform.x + backgroundX;

        if (enemyRect.x + enemyRect.width > platformX &&
            enemyRect.x < platformX + platform.width) {

            if (enemyRect.y + enemyRect.height > platform.y &&
                enemyRect.y + enemyRect.height < platform.y + platform.height + 10 &&
                enemy.vy >= 0) {

                enemy.y = platform.y - enemyRect.height;
                enemy.vy = 0;
                enemy.onGround = true;
            }
        }
    }

    // Colisão com o chão (fallback)
    const groundSurfaceY = CANVAS_HEIGHT - (frameHeight * scale) - 20;
    if (enemy.y + enemyRect.height >= groundSurfaceY) {
        enemy.y = groundSurfaceY - enemyRect.height;
        enemy.vy = 0;
        enemy.onGround = true;
    }
}

// Banco de PNGs compartilhado com Juliette; cada inimigo mantém seu próprio frame.
const enemyAnimationFrames = {
    idle: playerImages.idleFrames,
    walk: playerImages.walkFrames,
    run: playerImages.runFrames,
    jump: playerImages.jumpFrames,
    hit: playerImages.hitFrames,
    death: playerImages.deathFrames
};

function updateEnemyAnimationState(enemy) {
    const next = enemy.isDying ? 'death' :
        (enemy.hitTimer > 0 ? 'hit' :
        (!enemy.onGround ? 'jump' :
        (Math.abs(enemy.vx || 0) >= 1.5 ? 'run' :
        (Math.abs(enemy.vx || 0) > 0.1 ? 'walk' : 'idle'))));
    if (enemy.anim.state !== next) {
        enemy.anim.state = next;
        enemy.anim.frameIndex = 0;
        enemy.anim.frameCounter = 0;
    }
}

function advanceEnemyAnimation(enemy) {
    const anim = enemy.anim;
    if (!anim) return;
    anim.frameCounter = (anim.frameCounter || 0) + 1;
    if (anim.frameCounter < (anim.frameDuration || 6)) return;
    anim.frameCounter = 0;
    const frames = enemyAnimationFrames[anim.state] || enemyAnimationFrames.idle;
    if (anim.state === 'idle' || anim.state === 'walk' || anim.state === 'run') {
        anim.frameIndex = ((anim.frameIndex || 0) + 1) % frames.length;
    } else {
        anim.frameIndex = Math.min((anim.frameIndex || 0) + 1, frames.length - 1);
        if (anim.state === 'hit' && anim.frameIndex === frames.length - 1) {
            enemy.hitTimer = 0;
            anim.state = 'idle';
            anim.frameIndex = 0;
            anim.frameCounter = 0;
        }
    }
}

function beginEnemyDeath(enemy) {
    if (enemy.isDying) return;
    enemy.isDying = true;
    enemy.health = 0;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.shootCooldown = 999999;
    enemy.anim = { state: 'death', frameIndex: 0, frameCounter: 0, frameDuration: 6 };
    if (enemy.deathRewarded) return;
    enemy.deathRewarded = true;
    const ex = enemy.x + (enemy.w || enemy.size) / 2;
    const ey = enemy.y + (enemy.h || enemy.size) / 2;
    createExplosion(ex, ey, enemy.isBoss ? 70 : 30);
    gameState.score += enemy.type === 'robot' ? 200 : (enemy.isBoss ? 1000 : 100);
    playSound('enemyDestroy', 300, 300);
    gameState.enemiesDefeated++;
    if (enemy.isBoss) {
        gameState.bossesDefeated++;
        gameState.lives += 10;
        for (const key in weapons) {
            if (typeof weapons[key].ammo === 'number') weapons[key].currentAmmo = 5000;
        }
    } else if (Math.random() < 0.3) {
        createPowerup(enemy.x, enemy.y);
    }
    if (gameState.enemiesDefeated > 0 && gameState.enemiesDefeated % 30 === 0) {
        const bossAlive = enemies.some(e => e.isBoss && !e.isDying);
        if (!bossQueued && !bossAlive) {
            queueBossSpawn();
            requestGeminiScreenUpdate();
        }
    }
}

// Atualizar inimigos
function updateEnemies() {
    const time = Date.now() * 0.001;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // === ATUALIZAR ÁTOMOS ORBITANTES ===
        updateEnemyAtoms(enemy, time);

        // === IA AUTÔNOMA ===
        if (!enemy.ai) enemy.ai = { facingRight: false, changeDirTimer: 90, pauseTimer: 0, jumpCooldown: 60 };
        if (!enemy.anim) enemy.anim = { state: 'idle', frameIndex: 0, frameCounter: 0, frameDuration: 6 };
        if (enemy.isDying) {
            advanceEnemyAnimation(enemy);
            if (enemy.anim.frameIndex >= 7) {
                const deadIndex = enemies.indexOf(enemy);
                if (deadIndex !== -1) enemies.splice(deadIndex, 1);
            }
            continue;
        }
        if (enemy.hitTimer > 0) enemy.hitTimer--;

        // Pequena chance de "pausar" (parar e atirar)
        if (enemy.ai.pauseTimer > 0) {
            enemy.ai.pauseTimer--;
            enemy.vx = 0;
        } else {
            // Trocar direção às vezes
            enemy.ai.changeDirTimer--;
            if (enemy.ai.changeDirTimer <= 0) {
                enemy.ai.changeDirTimer = 40 + Math.floor(Math.random() * 160);

                // 80%: continuar indo para a esquerda (como Contra), 20%: inverter
                const invert = Math.random() < 0.20;
                enemy.ai.facingRight = invert ? !enemy.ai.facingRight : false;

                enemy.ai.pauseTimer = Math.random() < 0.25 ? (15 + Math.floor(Math.random() * 35)) : 0;
            }

            const dir = enemy.ai.facingRight ? 1 : -1;
            const baseSpeed = (enemy.type === 'boss') ? 0.9 : (enemy.type === 'robot' ? 1.2 : 2.1);
            enemy.vx = dir * baseSpeed;
        }

        // Pulo aleatório (estilo run-and-gun)
        if (enemy.ai.jumpCooldown > 0) enemy.ai.jumpCooldown--;
        if (enemy.onGround && enemy.ai.jumpCooldown === 0 && Math.random() < 0.10) {
            enemy.vy = -9.5 - Math.random() * 2.5;
            enemy.onGround = false;
            enemy.ai.jumpCooldown = 45 + Math.floor(Math.random() * 120);
        }

        // Gravidade
        enemy.vy += gravity;

        // Movimento
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Colisões com plataformas/chão
        checkEnemyPlatformCollisions(enemy);

        // Animação SpriteForge compartilhada; estado e temporização são individuais.
        updateEnemyAnimationState(enemy);
        advanceEnemyAnimation(enemy);

        // Cooldown de tiro
        if (enemy.shootCooldown > 0) enemy.shootCooldown--;

        // Inimigo atira ocasionalmente (direção depende de para onde ele está virado)
        if (enemy.shootCooldown === 0 && Math.random() < enemy.shootChance) {
            const bulletDir = enemy.ai.facingRight ? 1 : -1;
            const w = enemy.w || enemy.size;
            const h = enemy.h || enemy.size;
            const isBoss = enemy.isBoss;
            const bulletSize = isBoss ? 6 : 3;
            const bulletDamage = isBoss ? 35 : 20;
            const bulletSpeed = isBoss ? 6 : 5;

            createEnemyBullet(
                enemy.x + w / 2,
                enemy.y + h * 0.45,
                bulletDir * bulletSpeed,
                0,
                enemy.tintColor || '#ff4444',
                bulletSize,
                bulletDamage
            );
            enemy.shootCooldown = (isBoss ? 35 : 55) + Math.floor(Math.random() * 35);
        }

        // Remove inimigo se saiu muito da tela
        if (enemy.x < -300 || enemy.x > CANVAS_WIDTH + 400) {
            enemies.splice(i, 1);
        }
    }
}

// === NOVA FUNÇÃO: ATUALIZAR ÁTOMOS ORBITANTES ===
function updateEnemyAtoms(enemy, time) {
    if (!enemy.atomOrbs.initialized) return;
    
    const w = enemy.w || enemy.size;
    const h = enemy.h || enemy.size;
    const centerX = enemy.x + w / 2;
    const centerY = enemy.y + h / 2;
    
    // Atualizar cada átomo orbitante
    for (let orb of enemy.atomOrbs.orbs) {
        // Atualizar ângulo de rotação
        orb.angle += orb.speed;
        
        // Atualizar pulso para efeito piscante
        orb.pulse += 0.1;
        
        // Calcular posição com órbita elíptica e inclinada
        const baseRadius = orb.radius + Math.sin(orb.pulse) * orb.orbit.radiusVariation;
        const eccentricRadius = baseRadius * (1 + orb.orbit.eccentricity * Math.cos(orb.angle * 2));
        
        // Posição da órbita com inclinação
        const orbX = Math.cos(orb.angle) * eccentricRadius;
        const orbY = Math.sin(orb.angle) * eccentricRadius * Math.cos(orb.orbit.tiltAngle);
        
        // Posição final do átomo
        orb.x = centerX + orbX;
        orb.y = centerY + orbY;
        
        // Tamanho pulsante
        orb.currentSize = orb.size + Math.sin(orb.pulse) * 0.5;
        
        // Alpha pulsante para efeito de energia
        orb.alpha = 0.6 + Math.sin(orb.pulse * 1.5) * 0.4;
    }
}

// Criar bala inimiga
function createEnemyBullet(x, y, vx, vy, color = '#ff4444', size = 3, damage = 20) {
    bullets.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        damage: damage,
        color: color,
        type: 'enemy',
        size: size,
        life: 120
    });
}

// Atualizar power-ups
function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        
        // Movimento horizontal dos power-ups (scrolling com o fundo)
        if (backgroundScrolling) {
            if (facingRight) {
                powerup.x -= backgroundSpeed;
            } else {
                powerup.x += backgroundSpeed;
            }
        }
        
        // Animação de flutuação vertical
        powerup.bounce += 0.2;
        powerup.y += Math.sin(powerup.bounce) * 0.5;
        
        // Aplicar gravidade aos power-ups para que caiam no chão
        if (!powerup.onGround) {
            if (!powerup.vy) powerup.vy = 0; // Inicializar velocidade vertical
            powerup.vy += 0.5; // Gravidade
            powerup.y += powerup.vy;
            
            // Verificar se chegou no chão
            const groundLevel = CANVAS_HEIGHT - (frameHeight * scale) - 20;
            if (powerup.y + powerup.size >= groundLevel) {
                powerup.y = groundLevel - powerup.size;
                powerup.vy = 0;
                powerup.onGround = true;
            }
        }
        
        // Remove power-up se saiu da tela
        if (powerup.x < -30 || powerup.x > CANVAS_WIDTH + 30) {
            powerups.splice(i, 1);
        }
    }
}

// Atualizar explosões
function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.life--;
        explosion.size = (explosion.maxSize * explosion.life) / explosion.maxLife;
        
        if (explosion.life <= 0) {
            explosions.splice(i, 1);
        }
    }
}

// Atualizar partículas
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Função para desenhar o fundo com scroll
function drawBackground() {
    // Atualiza posição do fundo se estiver movendo
    if (backgroundScrolling) {
        if (facingRight) {
            backgroundX -= backgroundSpeed;
        } else {
            backgroundX += backgroundSpeed;
        }
    }
    
    // Desenha o fundo principal (repetindo para criar scroll infinito)
    const bgWidth = CANVAS_WIDTH;
    const bgHeight = CANVAS_HEIGHT;
    
    // Calcula quantas repetições do fundo são necessárias
    const numRepeats = Math.ceil(CANVAS_WIDTH / bgWidth) + 2;
    
    // Calcular onde começa o piso para posicionar o "fundo 2d melhor" acima
    const groundLevel = CANVAS_HEIGHT - (frameHeight * scale) - 20;
    const backgroundLayerHeight = groundLevel; // Altura da camada de fundo (até o piso)
    
    for (let i = -1; i < numRepeats; i++) {
        const x = (backgroundX % bgWidth) + (i * bgWidth);
        
        // Desenha a cena01 como primeiro plano (com menos transparência)
        if (sceneImg.complete) {
            ctx.globalAlpha = 0.9; // Diminuir transparência (era 1.0)
            ctx.drawImage(sceneImg, x, 0, bgWidth, bgHeight);
            ctx.globalAlpha = 1.0;
        }
        
        // === SISTEMA DE FASES: ESCOLHER FUNDO BASEADO NA FASE ATUAL ===
        let currentBackgroundImg = backgroundImg; // Fase 1 padrão
        
        if (gameState.currentPhase === 2 && backgroundImgPhase2.complete) {
            currentBackgroundImg = backgroundImgPhase2; // Fase 2
        }
        
        // Sobrepõe o fundo da fase atual apenas acima do piso
        if (currentBackgroundImg.complete) {
            ctx.globalAlpha = 0.8; // Aumentar um pouco a transparência desta camada
            // Desenhar apenas a parte que fica acima do piso
            ctx.drawImage(
                currentBackgroundImg, 
                0, 0, currentBackgroundImg.width, currentBackgroundImg.height, // Fonte completa
                x, 0, bgWidth, backgroundLayerHeight // Destino: da posição x, y=0, até o nível do piso
            );
            ctx.globalAlpha = 1.0;
        }
    }
}

// === NOVAS FUNÇÕES PARA ANIMAÇÕES ESPECIAIS ===

// === NOVA FUNÇÃO: SISTEMA INTELIGENTE DE ANIMAÇÃO DE TIRO ===
function triggerShootAnimation(angle) {
    if (!hasWeapon || isInSpecialAnim) return;
    
    // Normalizar ângulo para range 0-360
    let normalizedAngle = angle;
    while (normalizedAngle < 0) normalizedAngle += 360;
    while (normalizedAngle >= 360) normalizedAngle -= 360;
    
    // Selecionar animação baseada no ângulo
    let selectedAnimation = 'weapon_attack_sequence'; // padrão
    
    // Mapear ângulos para animações específicas
    if ((normalizedAngle >= 315 && normalizedAngle <= 360) || (normalizedAngle >= 0 && normalizedAngle <= 45)) {
        // Tiros horizontais (direita e diagonais próximas) - 0°, ±15°, ±30°, ±45°
        selectedAnimation = 'weapon_attack_sequence';
    } else if (normalizedAngle >= 46 && normalizedAngle <= 134) {
        // Tiros para baixo (45° a 135°) - usa animação de 60° para baixo
        selectedAnimation = 'weapon_shoot_diagonal_down';
    } else if (normalizedAngle >= 135 && normalizedAngle <= 225) {
        // Tiros para esquerda e diagonais (135° a 225°)
        selectedAnimation = 'weapon_attack_sequence'; // Sequência espelhada quando necessário
    } else if (normalizedAngle >= 226 && normalizedAngle <= 314) {
        // Tiros para cima (226° a 314°) - usa animações para cima
        if (normalizedAngle >= 270 - 20 && normalizedAngle <= 270 + 20) {
            // Tiro vertical puro (90°) - usa animação específica de 90°
            selectedAnimation = 'weapon_shoot_90';
        } else {
            // Tiros diagonais para cima - usa animação geral para cima
            selectedAnimation = 'weapon_shoot_up';
        }
    }
    
    // Trigger da animação selecionada
    startSpecialAnimation(selectedAnimation);
    
    // Debug: mostrar qual animação foi selecionada
    console.log(`Ângulo: ${angle.toFixed(1)}° → Animação: ${selectedAnimation}`);
}

// Iniciar animação especial
function startSpecialAnimation(animName, returnTo = null) {
    const anim = animations[animName];
    if (anim && (anim.type === 'sprite' || anim.type === 'sequence' || anim.type === 'frames')) {
        if ((anim.type === 'sequence' || anim.type === 'frames') &&
            (!anim.frames || anim.frames.length !== 8 ||
             !anim.frames.every(image => image.complete && image.naturalWidth > 0))) {
            console.warn(`Animação ${animName} ainda não está totalmente carregada.`);
            return;
        }
        previousAnim = returnTo || currentAnim;
        currentAnim = animName;
        specialAnimTimer = anim.duration || 48;
        isInSpecialAnim = true;
        frameIndex = 0;
        frameCounter = 0;
        sequenceFrameIndex = 0;
        sequenceFrameCounter = 0;
        actionFrameIndex = 0;
        actionFrameCounter = 0;
    }
}

// Ataque com corrente
function chainAttack(handType) {
    const animName = handType === 'left_hand' ? 'chain_left_hand' : 'chain_both_hands';
    startSpecialAnimation(animName);
    chainWeaponType = handType;
    chainWeaponActive = true;
    chainAttackCooldown = 60;
    
    // Som de ataque com corrente
    playSound('chainAttack', handType === 'both_hands' ? 280 : 320, 400);
    
    // Criar efeitos visuais de corrente
    createChainEffect(handType);
    
    // Dano aos inimigos próximos
    dealChainDamage(handType);
}

// Tiro para cima
function shootUp() {
    if (!canShoot || shootCooldown > 0 || weaponType === 'none') return;
    
    const weapon = weapons[weaponType];
    if (typeof weapon.ammo === 'number') {
        if (!weapon.currentAmmo && weapon.currentAmmo !== 0) weapon.currentAmmo = weapon.ammo;
        if (weapon.currentAmmo <= 0) return;
    }
    const playerCenterX = posX + (frameWidth * scale) / 2;
    const playerCenterY = posY + (frameHeight * scale) / 4; // Mais alto para tiro vertical
    
    // Tiro direto para cima
    createBullet(playerCenterX, playerCenterY, 0, -weapon.speed, weapon, 'vertical');
    
    // Consumo de munição (1 tiro vertical)
    if (typeof weapon.ammo === 'number') {
        weapon.currentAmmo = Math.max(0, (weapon.currentAmmo ?? weapon.ammo) - 1);
    }

    shootCooldown = weapon.cooldown;
    shootingUpTimer = 20;
    shootingUp = true;
}

// Criar efeito visual da corrente
function createChainEffect(handType) {
    const damage = handType === 'both_hands' ? 40 : 25;
    const range = handType === 'both_hands' ? 100 : 70;
    
    // Criar partículas de corrente
    for (let i = 0; i < (handType === 'both_hands' ? 12 : 8); i++) {
        particles.push({
            x: posX + (frameWidth * scale) / 2,
            y: posY + (frameHeight * scale) / 2,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 25,
            color: '#C0C0C0', // Cor prata da corrente
            size: Math.random() * 3 + 2,
            type: 'chain'
        });
    }
}

// Dano da corrente aos inimigos
function dealChainDamage(handType) {
    const damage = handType === 'both_hands' ? 40 : 25;
    const range = handType === 'both_hands' ? 100 : 70;
    
    const playerCenterX = posX + (frameWidth * scale) / 2;
    const playerCenterY = posY + (frameHeight * scale) / 2;
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.isDying) continue;
        const distance = Math.sqrt(
            Math.pow(enemy.x + enemy.size/2 - playerCenterX, 2) +
            Math.pow(enemy.y + enemy.size/2 - playerCenterY, 2)
        );
        
        if (distance <= range) {
            enemy.health -= damage;
            createExplosion(enemy.x + enemy.size/2, enemy.y + enemy.size/2, 20);
            if (enemy.health <= 0) beginEnemyDeath(enemy);
            else {
                enemy.hitTimer = 48;
                enemy.anim.state = 'hit';
                enemy.anim.frameIndex = 0;
                enemy.anim.frameCounter = 0;
            }
        }
    }
}

// Atualizar animações especiais
function updateSpecialAnimations() {
    // Avançar sequências a 10 FPS (6 ciclos por quadro em desktop 60 Hz).
    if (isInSpecialAnim && currentAnim === 'weapon_attack_sequence') {
        sequenceFrameCounter++;
        if (sequenceFrameCounter >= animations.weapon_attack_sequence.frameDurationTicks) {
            sequenceFrameCounter = 0;
            sequenceFrameIndex = Math.min(sequenceFrameIndex + 1, 7);
        }
    } else if (isInSpecialAnim && animations[currentAnim]?.type === 'frames') {
        actionFrameCounter++;
        if (actionFrameCounter >= animations[currentAnim].frameDurationTicks) {
            actionFrameCounter = 0;
            actionFrameIndex = Math.min(actionFrameIndex + 1, 7);
        }
    }

    // Atualizar timer de animação especial
    if (isInSpecialAnim && specialAnimTimer > 0) {
        specialAnimTimer--;
        
        if (specialAnimTimer <= 0) {
            // Voltar à animação anterior
            currentAnim = previousAnim;
            isInSpecialAnim = false;
            actionFrameIndex = 0;
            actionFrameCounter = 0;
            
            // Resetar estados especiais
            chainWeaponActive = false;
            celebrationMode = false;
            shootingUp = false;
        }
    }
    
    // Atualizar cooldowns
    if (chainAttackCooldown > 0) chainAttackCooldown--;
    if (shootingUpTimer > 0) shootingUpTimer--;
    if (celebrationTimer > 0) celebrationTimer--;
    
    // Atualizar cooldown do painel de controles
    if (controlsPanelToggleTimer > 0) controlsPanelToggleTimer--;
}

// Função avançada para desenhar o jogador
function drawPlayer() {
    const anim = animations[currentAnim];
    
    // Determinar qual escala usar
    let currentScale = scale; // Escala padrão
    
    // Se é sprite de tiro, usar escala específica de tiro
    if ((anim.type === 'sprite' || anim.type === 'sequence') && (currentAnim.includes('shoot') || currentAnim.includes('weapon_shoot') || currentAnim === 'weapon_attack_sequence')) {
        currentScale = shootingScale;
    }
    
    // === CALCULAR OFFSET PARA MANTER POSIÇÃO CONSISTENTE ===
    // Quando a escala muda, ajustar a posição para que a personagem 
    // permaneça no mesmo lugar (ancorada no centro do corpo)
    const scaleDifference = scale - currentScale;
    const offsetX = (frameWidth * (currentScale - scale)) / 2; // Inverter diferença para compensar recuo
    const offsetY = (frameHeight * scaleDifference) / 2; // Ancorar no centro vertical do corpo
    
    const adjustedPosX = posX + offsetX;
    const adjustedPosY = posY + offsetY;
    
    // Novos quadros 256x256: desenhar em área independente da colisão 48x64.
    // O canvas de cada quadro é centralizado e ancorado pelos pés.
    if (anim.type === 'frames') {
        const spriteImage = anim.frames[actionFrameIndex];
        if (spriteImage && spriteImage.complete && spriteImage.naturalWidth > 0) {
            const drawSize = 110;
            const collisionWidth = frameWidth * scale;
            const collisionHeight = frameHeight * scale;
            const drawX = posX + collisionWidth / 2 - drawSize / 2;
            const drawY = posY + collisionHeight - drawSize;
            ctx.save();
            if (!facingRight) {
                ctx.translate(posX + collisionWidth / 2, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(spriteImage, -drawSize / 2, drawY, drawSize, drawSize);
            } else {
                ctx.drawImage(spriteImage, drawX, drawY, drawSize, drawSize);
            }
            ctx.restore();
        }
    // Verificar se é sprite individual ou quadro de uma sequência animada
    } else if (anim.type === 'sprite' || anim.type === 'sequence') {
        const spriteImage = anim.type === 'sequence'
            ? anim.frames[sequenceFrameIndex]
            : playerImages[anim.image];
        if (spriteImage && spriteImage.complete && spriteImage.naturalWidth > 0) {
            ctx.save();
            
            // Espelhar se necessário
            if (!facingRight) {
                ctx.scale(-1, 1);
                ctx.drawImage(
                    spriteImage,
                    -(adjustedPosX + frameWidth * currentScale), adjustedPosY,
                    frameWidth * currentScale, frameHeight * currentScale
                );
            } else {
                ctx.drawImage(
                    spriteImage,
                    adjustedPosX, adjustedPosY,
                    frameWidth * currentScale, frameHeight * currentScale
                );
            }
            
            ctx.restore();
        } else if (anim.type === 'sequence') {
            const fallbackImage = playerImages.arma_disparando_frente;
            if (fallbackImage && fallbackImage.complete && fallbackImage.naturalWidth > 0) {
                ctx.drawImage(fallbackImage, adjustedPosX, adjustedPosY,
                    frameWidth * currentScale, frameHeight * currentScale);
            }
        }
    } else {
        // Animação normal do spritesheet
        if (playerImages.spritesheet.complete) {
            const sx = frameIndex * frameWidth;
            const sy = anim.row * frameHeight;
            
            ctx.save();
            
            if (!facingRight) {
                ctx.scale(-1, 1);
                ctx.drawImage(
                    playerImages.spritesheet,
                    sx, sy, frameWidth, frameHeight,
                    -(adjustedPosX + frameWidth * currentScale), adjustedPosY,
                    frameWidth * currentScale, frameHeight * currentScale
                );
            } else {
                ctx.drawImage(
                    playerImages.spritesheet,
                    sx, sy, frameWidth, frameHeight,
                    adjustedPosX, adjustedPosY,
                    frameWidth * currentScale, frameHeight * currentScale
                );
            }
            
            ctx.restore();
        }
    }
    
    // Efeitos visuais especiais
    if (chainWeaponActive) {
        drawChainEffect();
    }
    
    if (shootingUp) {
        drawShootingUpEffect();
    }
}

// Efeito visual da corrente
function drawChainEffect() {
    const centerX = posX + (frameWidth * scale) / 2;
    const centerY = posY + (frameHeight * scale) / 2;
    
    ctx.save();
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7;
    
    // Desenhar linhas de corrente
    const range = chainWeaponType === 'both_hands' ? 100 : 70;
    const numLines = chainWeaponType === 'both_hands' ? 8 : 4;
    
    for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2;
        const endX = centerX + Math.cos(angle) * range;
        const endY = centerY + Math.sin(angle) * range;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Efeito visual do tiro para cima
function drawShootingUpEffect() {
    const centerX = posX + (frameWidth * scale) / 2;
    const centerY = posY;
    
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.globalAlpha = 0.6;
    
    // Raio de luz para cima
    ctx.beginPath();
    ctx.moveTo(centerX - 5, centerY);
    ctx.lineTo(centerX + 5, centerY);
    ctx.lineTo(centerX + 2, centerY - 50);
    ctx.lineTo(centerX - 2, centerY - 50);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// === INDICADOR DE ÂNGULO DE TIRO (SETA + NÚMEROS) ===
function normalizeAngle(angle) {
    let a = angle % 360;
    if (a < 0) a += 360;
    return a;
}

// Converter do sistema do jogo (0=dir, 90=baixo) para exibição tipo transferidor (0=dir, 90=cima)
function toDisplayAngle(gameAngle) {
    const a = normalizeAngle(gameAngle);
    return normalizeAngle(360 - a);
}

// Ângulo atual de mira (sem aleatoriedade, para UI)
function getAimAnglePreview() {
    // Multi: não existe um único ângulo
    if (currentShootType === 'multi') return null;

    // Sempre refletir a mira 360° persistente
    return getAimAngleGameDegrees();
}

function drawAimIndicator() {
    // Mostrar apenas quando estiver com arma
    if (!hasWeapon || weaponType === 'none') return;

    const aimAngle = getAimAnglePreview();

    // Posição: em volta do personagem (centro do corpo)
    const playerCenterX = posX + (frameWidth * scale) / 2;
    const playerCenterY = posY + (frameHeight * scale) / 2;

    const cx = playerCenterX;
    const cy = Math.max(85, Math.min(CANVAS_HEIGHT - 85, playerCenterY));

    const textRadius = 82 * aimIndicatorScale;
    const arrowLen = 58 * aimIndicatorScale;

    ctx.save();

    // Transparência geral (quase invisível)
    ctx.globalAlpha = aimIndicatorOpacity;

    // Fundo leve para contraste (sem desenhar o transferidor)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, textRadius + 18 * aimIndicatorScale, 0, Math.PI * 2);
    ctx.fill();

    // Estilo
    ctx.font = `${Math.round(14 * aimIndicatorScale)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD700';

    // Números (como transferidor) - apenas os números
    // 0° à direita, 90° acima, 180° esquerda, 270° abaixo
    for (let deg = 0; deg < 360; deg += 10) {
        // Para não poluir demais, desenhar "forte" a cada 30° e "leve" nos outros
        const isMajor = (deg % 30 === 0);

        // Números um pouco menos transparentes (pedido do usuário)
        const majorAlpha = Math.min(1, aimIndicatorOpacity * 1.60);
        const minorAlpha = Math.min(1, aimIndicatorOpacity * 1.00);
        ctx.globalAlpha = isMajor ? majorAlpha : minorAlpha;

        const rad = (deg * Math.PI) / 180;
        const x = cx + Math.cos(rad) * textRadius;
        const y = cy - Math.sin(rad) * textRadius;

        // contorno preto para legibilidade
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText(String(deg), x, y);
        ctx.fillText(String(deg), x, y);
    }

    ctx.globalAlpha = aimIndicatorOpacity;

    // Centro: mostrar tipo/ângulo
    ctx.font = `${Math.round(15 * aimIndicatorScale)}px Arial`;
    if (aimAngle === null) {
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 4;
        ctx.strokeText('MULTI', cx, cy);
        ctx.fillText('MULTI', cx, cy);
        ctx.restore();
        return;
    }

    const displayAngle = toDisplayAngle(aimAngle);
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 4;
    ctx.strokeText(`${Math.round(displayAngle)}°`, cx, cy);
    ctx.fillText(`${Math.round(displayAngle)}°`, cx, cy);

    // Seta amarela indicando o ângulo
    const aRad = (displayAngle * Math.PI) / 180;
    const dx = Math.cos(aRad);
    const dy = -Math.sin(aRad);

    const tipX = cx + dx * arrowLen;
    const tipY = cy + dy * arrowLen;

    // seta um pouco mais visível que os números
    ctx.globalAlpha = Math.min(1, aimIndicatorOpacity * 1.9);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Cabeça da seta
    ctx.fillStyle = '#FFD700';
    const headLen = 12 * aimIndicatorScale;
    const headWidth = 8 * aimIndicatorScale;
    const perpX = -dy;
    const perpY = dx;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - dx * headLen + perpX * headWidth, tipY - dy * headLen + perpY * headWidth);
    ctx.lineTo(tipX - dx * headLen - perpX * headWidth, tipY - dy * headLen - perpY * headWidth);
    ctx.closePath();
    ctx.fill();

    // Pontinho no topo
    ctx.beginPath();
    ctx.arc(tipX, tipY, 4 * aimIndicatorScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Função para atualizar o estado da animação
function updateAnimationState() {
    hasWeapon = (weaponType !== 'none');

    // Impacto/morte e animações especiais têm prioridade sobre movimento.
    if (isInSpecialAnim) return;

    let newAnim;
    if (!onGround) {
        newAnim = 'jump';
    } else if (moving && (keys['ShiftLeft'] || keys['ShiftRight'])) {
        newAnim = 'run';
    } else if (moving) {
        newAnim = 'walk';
    } else {
        newAnim = 'idle';
    }

    if (newAnim !== currentAnim) {
        currentAnim = newAnim;
        frameIndex = 0;
        frameCounter = 0;
        actionFrameIndex = 0;
        actionFrameCounter = 0;
    }
}

// Verificar colisões
function checkCollisions() {
    const playerRect = {
        x: posX,
        y: posY,
        width: frameWidth * scale,
        height: frameHeight * scale
    };
    
    // Colisão bala do jogador vs inimigos
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (bullet.type !== 'enemy') {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (enemy.isDying) continue;
                const ew = enemy.w || enemy.size;
                const eh = enemy.h || enemy.size;
                if (bullet.x < enemy.x + ew &&
                    bullet.x + bullet.size > enemy.x &&
                    bullet.y < enemy.y + eh &&
                    bullet.y + bullet.size > enemy.y) {
                    
                    // Impacto: iniciar a animação hit sem interromper a IA.
                    enemy.health -= bullet.damage;
                    bullets.splice(i, 1);
                    playSound('enemyHit', 600, 100);
                    if (enemy.health <= 0) {
                        beginEnemyDeath(enemy);
                    } else {
                        enemy.hitTimer = 48;
                        enemy.anim.state = 'hit';
                        enemy.anim.frameIndex = 0;
                        enemy.anim.frameCounter = 0;
                    }
                    break;
                }
            }
        }
    }
    
    // Colisão bala inimiga vs jogador
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (bullet.type === 'enemy' && !invulnerable) {
            if (bullet.x < playerRect.x + playerRect.width &&
                bullet.x + bullet.size > playerRect.x &&
                bullet.y < playerRect.y + playerRect.height &&
                bullet.y + bullet.size > playerRect.y) {
                
                // === VERIFICAR ESCUDO PRIMEIRO ===
                // Prioridade: Escudo inicial > Escudo normal
                if (initialShieldActive || (shieldActive && shieldEnergy > 0)) {
                    // Escudo absorve o tiro
                    if (initialShieldActive) {
                        // Escudo inicial absorve completamente
                        bullets.splice(i, 1);
                        
                        // Criar efeito visual especial para escudo inicial
                        createInitialShieldHitEffect(playerRect.x + playerRect.width/2, playerRect.y + playerRect.height/2);
                        
                        // Som especial do escudo inicial
                        playSound('enemyHit', 900, 80);
                    } else {
                        // Escudo normal absorve com custo de energia
                        shieldEnergy -= bullet.damage * 0.5;
                        bullets.splice(i, 1);
                        
                        // Criar efeito visual do escudo sendo atingido
                        createShieldHitEffect(playerRect.x + playerRect.width/2, playerRect.y + playerRect.height/2);
                        
                        // Som de escudo absorvendo
                        playSound('enemyHit', 800, 100);
                        
                        // Se escudo acabou a energia, desativa
                        if (shieldEnergy <= 0) {
                            shieldEnergy = 0;
                            deactivateShield();
                            playSound('playerHit', 300, 200);
                        }
                    }
                    
                    continue; // Pular para próxima bala, esse tiro foi bloqueado
                }
                
                // === NOVO SISTEMA DE RESISTÊNCIA A TIROS ===
                gameState.hitsReceived++;
                
                // Determinar quantos tiros são necessários para morrer baseado na fase
                const maxHits = gameState.currentPhase === 1 ? gameState.maxHitsPhase1 : gameState.maxHitsPhase2;
                
                // Calcular dano baseado na resistência da fase
                let actualDamage = bullet.damage;
                if (gameState.currentPhase === 2) {
                    // Na fase 2, cada tiro causa menos dano (1000 tiros para morrer)
                    actualDamage = Math.ceil(100 / gameState.maxHitsPhase2 * 10); // Aproximadamente 0.1 de dano por tiro
                }
                
                playerHealth -= actualDamage;
                bullets.splice(i, 1);
                invulnerable = true;
                invulnerableTime = 120; // 2 segundos de invulnerabilidade
                
                // Som e animação de impacto ao receber dano.
                playSound('playerHit', 200, 400);
                startSpecialAnimation('hit');
                
                // Log para debug
                console.log(`Fase ${gameState.currentPhase}: Tiro ${gameState.hitsReceived}/${maxHits}, Vida: ${playerHealth}`);
                
                if (playerHealth <= 0 || gameState.hitsReceived >= maxHits) {
                    gameState.lives--;
                    if (gameState.lives <= 0) {
                        startSpecialAnimation('death', 'idle');
                        gameState.gameOver = true;
                        playSound('gameOver', 150, 1000);
                    } else {
                        // A animação de queda é exibida ao perder uma vida; depois retorna ao jogo.
                        startSpecialAnimation('death', 'idle');
                        playerHealth = 100;
                        gameState.hitsReceived = 0; // Resetar contador de tiros
                        weaponType = 'normal'; // Perde power-ups
                    }
                }
            }
        }
    }
    
    // Colisão jogador vs power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        if (powerup.x < playerRect.x + playerRect.width &&
            powerup.x + powerup.size > playerRect.x &&
            powerup.y < playerRect.y + playerRect.height &&
            powerup.y + powerup.size > playerRect.y) {
            
            // Coletou power-up
            switch(powerup.type) {
                case 'normal':
                case 'spread':
                case 'laser':
                case 'machine':
                    weaponType = powerup.type;
                    // Recarregar munição padrão ao pegar arma
                    if (weapons[weaponType] && typeof weapons[weaponType].ammo === 'number') {
                        weapons[weaponType].currentAmmo = weapons[weaponType].ammo;
                    }
                    break;
                case 'health':
                    playerHealth = Math.min(100, playerHealth + 50);
                    break;
        case 'life':
            gameState.lives++;
            break;
        case 'bomb':
            // Coletar bomba (máximo 5)
            if (bombCount < maxBombs) {
                bombCount++;
            }
            break;
            }
            
            gameState.score += 50;
            powerups.splice(i, 1);
            
            // Som de coleta de power-up
            playSound('powerup', 800, 200);
        }
    }
}

// Desenhar balas
function drawBullets() {
    for (const bullet of bullets) {
        // Pular balas inimigas (mantêm cor original)
        if (bullet.type === 'enemy') {
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
            ctx.fill();
            continue;
        }
        
        // === BALAS DO JOGADOR: AMARELO COM BORDA VERMELHA ===
        ctx.save();
        
        if (bullet.type === 'laser') {
            // Laser mais largo com efeito especial
            // Borda vermelha (mais larga)
            ctx.fillStyle = '#FF0000'; // Vermelho para borda
            ctx.fillRect(bullet.x - bullet.size/2 - 1, bullet.y - bullet.size/2 - 1, 
                        bullet.size * 2 + 2, bullet.size + 2);
            
            // Centro amarelo
            ctx.fillStyle = '#FFFF00'; // Amarelo para centro
            ctx.fillRect(bullet.x - bullet.size/2, bullet.y - bullet.size/2, 
                        bullet.size * 2, bullet.size);
        } else {
            // Bala normal circular com efeito amarelo/vermelho
            
            // Borda vermelha (círculo maior)
            ctx.fillStyle = '#FF0000'; // Vermelho para borda
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size + 1, 0, Math.PI * 2);
            ctx.fill();
            
            // Centro amarelo (círculo menor)
            ctx.fillStyle = '#FFFF00'; // Amarelo para centro
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Efeito de brilho no centro (ainda menor)
            ctx.fillStyle = '#FFFF99'; // Amarelo mais claro para brilho
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Desenhar inimigos com efeitos cyberpunk
function drawEnemies() {
    const time = Date.now() * 0.008;

    for (const enemy of enemies) {
        // === DESENHAR ÁTOMOS ORBITANTES PRIMEIRO (ATRÁS DO INIMIGO) ===
        drawEnemyAtoms(enemy);

        const w = enemy.w || enemy.size;
        const h = enemy.h || enemy.size;

        // Efeito cyberpunk piscante para os inimigos
        const glowIntensity = Math.sin(time * 2 + enemy.x * 0.01) * 0.3 + 0.7;
        const pulseIntensity = Math.sin(time * 4 + enemy.y * 0.01) * 0.2 + 0.8;

        // === NOVO: inimigos usando o mesmo spritesheet da personagem principal ===
        if (enemy.renderMode === 'spriteForge') {
            ctx.save();

            // Configurar brilho baseado no tipo de inimigo
            if (enemy.isBoss) {
                // Brilho ROXO FORTE e PULSANTE para o chefão
                const bossGlow = Math.sin(time * 3) * 0.4 + 0.7;
                ctx.shadowColor = `rgba(139, 0, 255, ${bossGlow})`; // Roxo vibrante
                ctx.shadowBlur = 25 * bossGlow; // Brilho mais intenso
            } else if (enemy.type === 'robot') {
                // Brilho azul para robôs
                ctx.shadowColor = `rgba(0, 150, 255, ${glowIntensity})`;
                ctx.shadowBlur = 10 * glowIntensity;
            } else {
                // Brilho vermelho para soldados
                ctx.shadowColor = `rgba(255, 0, 0, ${glowIntensity})`;
                ctx.shadowBlur = 10 * glowIntensity;
            }

            // PNG SpriteForge: mesma referência de imagem da Juliette, sem cópias.
            const animState = enemy.anim?.state || 'idle';
            const frames = enemyAnimationFrames[animState] || enemyAnimationFrames.idle;
            const spriteImage = frames?.[enemy.anim?.frameIndex || 0];
            const facingRight = !!enemy.ai?.facingRight;
            const drawSize = 110 * (enemy.isBoss ? 2.4 : (enemy.type === 'robot' ? 1.15 : 1));
            const drawX = enemy.x + w / 2 - drawSize / 2;
            const drawY = enemy.y + h - drawSize;

            // === DESENHAR AURA DO CHEFÃO (ANTES DO SPRITE) ===
            if (enemy.isBoss) {
                const auraPulse = Math.sin(time * 4) * 0.3 + 0.7;
                const auraSize = 15 * auraPulse;
                
                // Aura roxa externa
                ctx.fillStyle = `rgba(139, 0, 255, ${0.15 * auraPulse})`;
                ctx.fillRect(enemy.x - auraSize, enemy.y - auraSize, w + auraSize * 2, h + auraSize * 2);
                
                // Aura roxa interna (mais forte)
                ctx.fillStyle = `rgba(139, 0, 255, ${0.25 * auraPulse})`;
                ctx.fillRect(enemy.x - auraSize/2, enemy.y - auraSize/2, w + auraSize, h + auraSize);
            }

            if (spriteImage && spriteImage.complete && spriteImage.naturalWidth > 0) {
                ctx.save();
                // Diferenciação visual por classe sem duplicar PNGs.
                // O filtro afeta somente a imagem desenhada e preserva sua transparência.
                if (enemy.isBoss) {
                    ctx.filter = 'sepia(1) saturate(5) hue-rotate(245deg)';
                } else if (enemy.type === 'robot') {
                    ctx.filter = 'sepia(1) saturate(5) hue-rotate(175deg)';
                } else {
                    ctx.filter = 'sepia(1) saturate(5) hue-rotate(315deg)';
                }
                if (!facingRight) {
                    ctx.translate(enemy.x + w / 2, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(spriteImage, -drawSize / 2, drawY, drawSize, drawSize);
                } else {
                    ctx.drawImage(spriteImage, drawX, drawY, drawSize, drawSize);
                }
                ctx.restore();
            }

            // Soldados, robôs e chefões compartilham os mesmos quadros; somente o filtro,
            // a escala e os efeitos de classe diferenciam sua apresentação.

            // === DESENHAR COROA/INDICADOR DE CHEFÃO ===
            if (enemy.isBoss) {
                ctx.globalAlpha = 1.0;
                const crownY = enemy.y - 15;
                const crownX = enemy.x + w / 2;
                
                // Estrela dourada acima do chefão
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 15;
                
                // Desenhar estrela de 5 pontas
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                    const x = crownX + Math.cos(angle) * 8;
                    const y = crownY + Math.sin(angle) * 8;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.fill();
                
                // Texto "BOSS" acima da estrela
                ctx.font = 'bold 12px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.textAlign = 'center';
                ctx.strokeText('BOSS', crownX, crownY - 15);
                ctx.fillText('BOSS', crownX, crownY - 15);
            }

            ctx.restore();
        } else {
            // === fallback antigo: formas geométricas ===
            ctx.save();

            // Sombra/glow cyberpunk nos inimigos
            ctx.shadowColor = enemy.type === 'robot' ? `rgba(0, 0, 255, ${glowIntensity})` : `rgba(255, 0, 0, ${glowIntensity})`;
            ctx.shadowBlur = 8 * glowIntensity;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Corpo do inimigo com efeito piscante
            const baseAlpha = pulseIntensity;
            if (enemy.type === 'robot') {
                ctx.fillStyle = `rgba(0, 0, ${Math.floor(255 * glowIntensity)}, ${baseAlpha})`;
            } else {
                ctx.fillStyle = `rgba(${Math.floor(255 * glowIntensity)}, 0, 0, ${baseAlpha})`;
            }

            // === DESENHAR BASEADO NA FORMA ALEATÓRIA ===
            const centerX = enemy.x + enemy.size / 2;
            const centerY = enemy.y + enemy.size / 2;

            if (enemy.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(centerX, centerY, enemy.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (enemy.shape === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(centerX, enemy.y);
                ctx.lineTo(enemy.x, enemy.y + enemy.size);
                ctx.lineTo(enemy.x + enemy.size, enemy.y + enemy.size);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
            }

            // Linhas de energia
            for (let i = 0; i < enemy.size; i += 8) {
                const lineIntensity = Math.sin(time * 3 + i * 0.2) * 0.4 + 0.6;
                if (enemy.type === 'robot') {
                    ctx.fillStyle = `rgba(0, 100, ${Math.floor(255 * lineIntensity)}, ${lineIntensity})`;
                } else {
                    ctx.fillStyle = `rgba(${Math.floor(255 * lineIntensity)}, 100, 0, ${lineIntensity})`;
                }
                ctx.fillRect(enemy.x + i, enemy.y + 2, 2, enemy.size - 4);
            }

            ctx.restore();
        }

        // Barra de vida do inimigo - ESPECIAL PARA CHEFÃO
        const healthPercent = enemy.health / enemy.maxHealth;
        
        if (enemy.isBoss) {
            // === BARRA DE VIDA ESPECIAL DO CHEFÃO ===
            const barHeight = 10; // Mais alta
            const barY = enemy.y - 20; // Mais afastada
            
            // Fundo da barra (preto sólido)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(enemy.x - 4, barY, w + 8, barHeight + 4);
            
            // Borda da barra (dourada)
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.strokeRect(enemy.x - 4, barY, w + 8, barHeight + 4);
            
            // Fundo vermelho da barra
            ctx.fillStyle = 'rgba(150, 0, 0, 0.9)';
            ctx.fillRect(enemy.x - 2, barY + 2, w + 4, barHeight);
            
            // Barra de vida principal (gradiente roxo/magenta)
            const healthGlow = Math.sin(time * 5) * 0.3 + 0.7;
            const gradient = ctx.createLinearGradient(enemy.x, barY, enemy.x + (w * healthPercent), barY);
            gradient.addColorStop(0, `rgba(139, 0, 255, ${healthGlow})`);
            gradient.addColorStop(0.5, `rgba(255, 0, 255, ${healthGlow})`);
            gradient.addColorStop(1, `rgba(255, 0, 150, ${healthGlow})`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(enemy.x, barY + 2, (w * healthPercent), barHeight);
            
            // Texto com porcentagem de vida
            ctx.save();
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';
            const healthText = `${Math.ceil(healthPercent * 100)}%`;
            ctx.strokeText(healthText, enemy.x + w/2, barY + barHeight - 1);
            ctx.fillText(healthText, enemy.x + w/2, barY + barHeight - 1);
            ctx.restore();
            
            // Efeito de brilho pulsante
            ctx.save();
            ctx.globalAlpha = 0.4 * healthGlow;
            ctx.shadowColor = '#FF00FF';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#FF00FF';
            ctx.lineWidth = 2;
            ctx.strokeRect(enemy.x - 2, barY + 2, (w * healthPercent) + 4, barHeight);
            ctx.restore();
        } else {
            // === BARRA DE VIDA NORMAL PARA INIMIGOS COMUNS ===
            ctx.fillStyle = 'rgba(100, 0, 0, 0.8)';
            ctx.fillRect(enemy.x - 2, enemy.y - 10, w + 4, 6);

            const healthGlow = Math.sin(time * 5) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(0, ${Math.floor(255 * healthGlow)}, 0, ${healthGlow})`;
            ctx.fillRect(enemy.x, enemy.y - 8, (w * healthPercent), 4);
        }
    }
}

// === NOVA FUNÇÃO: DESENHAR ÁTOMOS ORBITANTES ===
function drawEnemyAtoms(enemy) {
    if (!enemy.atomOrbs.initialized || enemy.atomOrbs.orbs.length === 0) return;
    
    const time = Date.now() * 0.005;
    
    ctx.save();
    
    for (let orb of enemy.atomOrbs.orbs) {
        // Configurar estilo do átomo - MAIS VISIVEL PARA CHEFÃO
        const alphaMultiplier = enemy.isBoss ? 1.5 : 1.0;
        ctx.globalAlpha = orb.alpha * alphaMultiplier;
        ctx.fillStyle = orb.color;
        
        // Efeito glow nos átomos - MAIS FORTE PARA CHEFÃO
        ctx.shadowColor = orb.color;
        ctx.shadowBlur = enemy.isBoss ? 20 : 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Desenhar o átomo (esfera)
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.currentSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Núcleo do átomo (mais brilhante) - AINDA MAIS BRILHANTE PARA CHEFÃO
        ctx.globalAlpha = orb.alpha * (enemy.isBoss ? 2.0 : 1.5);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.currentSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Anel externo para chefão
        if (enemy.isBoss) {
            ctx.globalAlpha = orb.alpha * 0.8;
            ctx.strokeStyle = orb.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.currentSize + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Trilha da órbita (linha semi-transparente)
        if (orb === enemy.atomOrbs.orbs[0]) { // Só desenha uma trilha por inimigo
            ctx.globalAlpha = enemy.isBoss ? 0.25 : 0.1; // Trilha mais visível para chefão
            ctx.strokeStyle = enemy.isBoss ? '#8B00FF' : (enemy.type === 'robot' ? '#00FFFF' : '#FF4040');
            ctx.lineWidth = enemy.isBoss ? 2 : 1;
            ctx.beginPath();
            
            const w = enemy.w || enemy.size;
            const h = enemy.h || enemy.size;
            const centerX = enemy.x + w / 2;
            const centerY = enemy.y + h / 2;
            
            // Desenhar órbita elíptica
            for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
                const radius = orb.radius * (1 + orb.orbit.eccentricity * Math.cos(angle * 2));
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius * Math.cos(orb.orbit.tiltAngle);
                
                if (angle === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
    
    ctx.restore();
}

// Desenhar power-ups
function drawPowerups() {
    for (const powerup of powerups) {
        // Efeito de brilho
        ctx.save();
        ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
        
        // Cor do power-up baseada no tipo
        switch(powerup.type) {
            case 'spread': ctx.fillStyle = '#ff4444'; break;
            case 'laser': ctx.fillStyle = '#44ff44'; break;
            case 'machine': ctx.fillStyle = '#4444ff'; break;
            case 'health': ctx.fillStyle = '#ff44ff'; break;
            case 'life': ctx.fillStyle = '#ffaa44'; break;
            case 'bomb': ctx.fillStyle = '#ff0000'; break; // Vermelho para bomba
            default: ctx.fillStyle = '#ffffff';
        }
        
        // Desenha power-up como losango
        ctx.translate(powerup.x + powerup.size/2, powerup.y + powerup.size/2);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-powerup.size/2, -powerup.size/2, powerup.size, powerup.size);
        
        // Texto do tipo
        ctx.restore();
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(powerup.type[0].toUpperCase(), powerup.x + powerup.size/2, powerup.y + powerup.size/2 + 3);
    }
}

// Desenhar explosões
function drawExplosions() {
    for (const explosion of explosions) {
        const alpha = explosion.life / explosion.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Círculo de explosão
        ctx.fillStyle = '#ff6644';
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Círculo interno mais claro
        ctx.fillStyle = '#ffaa44';
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Desenhar partículas
function drawParticles() {
    for (const particle of particles) {
        const alpha = particle.life / 30;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// === NOVO SISTEMA DE ESCUDO AVANÇADO ===

// Ativar escudo
function activateShield() {
    if (shieldEnergy < 20 || shieldCooldown > 0) return;
    
    shieldActive = true;
    
    // Som de ativação do escudo
    playSound('powerup', 800, 300);
    
    // Criar efeitos visuais de ativação
    createShieldActivationEffects();
    
    console.log('🛡️ ESCUDO ATIVADO!');
}

// Desativar escudo
function deactivateShield() {
    if (!shieldActive) return;
    
    shieldActive = false;
    shieldCooldown = 120; // 2 segundos de cooldown
    
    // Som de desativação
    playSound('enemyHit', 400, 150);
    
    console.log('🛡️ ESCUDO DESATIVADO!');
}

// Criar efeitos de ativação do escudo
function createShieldActivationEffects() {
    const centerX = posX + (frameWidth * scale) / 2;
    const centerY = posY + (frameHeight * scale) / 2;
    
    // Criar partículas de energia em círculo
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 60;
        particles.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            life: 30,
            color: '#00FFFF',
            size: 3,
            type: 'shield_activation'
        });
    }
    
    // Criar efeito de pulso central
    particles.push({
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        life: 40,
        color: '#FFFFFF',
        size: 15,
        type: 'shield_pulse'
    });
}

// Criar efeito quando escudo é atingido
function createShieldHitEffect(x, y) {
    // Criar faíscas onde o escudo foi atingido
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 20,
            color: '#FFFF00',
            size: Math.random() * 3 + 1,
            type: 'shield_spark'
        });
    }
    
    // Efeito de ondas no ponto de impacto
    shieldHitEffects.push({
        x: x,
        y: y,
        radius: 5,
        maxRadius: 40,
        life: 15,
        alpha: 1.0
    });
}

// === NOVA FUNÇÃO: ATIVAR BOMBA ===
function activateBomb() {
    if (bombCount <= 0 || bombCooldown > 0) return;
    
    bombCount--;
    bombCooldown = bombMaxCooldown;
    
    // Som de bomba explosiva
    playSound('enemyDestroy', 200, 800);
    
    console.log(`💣 BOMBA ATIVADA! Bombas restantes: ${bombCount}`);
    
    // === DESTRUIR TODOS OS INIMIGOS ===
    let enemiesDestroyed = enemies.length;
    let scoreGained = 0;
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Criar explosão para cada inimigo
        createExplosion(enemy.x + enemy.size/2, enemy.y + enemy.size/2, 40);
        
        // Pontuação
        scoreGained += enemy.type === 'robot' ? 200 : 100;
        
        // Remover inimigo
        enemies.splice(i, 1);
    }
    
    gameState.score += scoreGained;
    
    // === DESTRUIR TODAS AS BALAS INIMIGAS ===
    let bulletCount = 0;
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].type === 'enemy') {
            createExplosion(bullets[i].x, bullets[i].y, 15);
            bullets.splice(i, 1);
            bulletCount++;
        }
    }
    
    // === CRIAR EFEITO VISUAL DA BOMBA ===
    createBombExplosionEffect();
    
    console.log(`💥 Bomba destruiu ${enemiesDestroyed} inimigos e ${bulletCount} projéteis! +${scoreGained} pontos`);
}

// === NOVO SISTEMA DE DISCO DE LAVA FLUTUANTE ===

// Função para alternar disco de lava
function toggleLavaDisc() {
    if (lavaDisc.active) {
        deactivateLavaDisc();
    } else {
        activateLavaDisc();
    }
}

// Ativar disco de lava
function activateLavaDisc() {
    // Posicionar disco próximo ao jogador
    const playerCenterX = posX + (frameWidth * scale) / 2;
    const playerCenterY = posY + (frameHeight * scale) / 2;
    
    lavaDisc.active = true;
    lavaDisc.x = playerCenterX;
    lavaDisc.y = playerCenterY - 80; // Flutua um pouco acima do jogador
    lavaDisc.targetX = playerCenterX;
    lavaDisc.targetY = playerCenterY - 80;
    lavaDisc.heatIntensity = 0;
    lavaDisc.colorPhase = 0;
    lavaDisc.pulsePhase = 0;
    lavaDisc.floatOffset = 0;
    lavaDisc.particles = [];
    
    // Som de ativação do disco de lava
    playSound('powerup', 220, 600);
    
    console.log('🌋 DISCO DE LAVA ATIVADO!');
    
    // Criar efeito de ativação
    createLavaDiscActivationEffect();
}

// Desativar disco de lava
function deactivateLavaDisc() {
    lavaDisc.active = false;
    
    // Som de desativação
    playSound('enemyHit', 180, 400);
    
    console.log('🌋 DISCO DE LAVA DESATIVADO!');
    
    // Criar efeito de desativação
    createLavaDiscDeactivationEffect();
}

// Criar efeito de ativação do disco de lava
function createLavaDiscActivationEffect() {
    const centerX = lavaDisc.x;
    const centerY = lavaDisc.y;
    
    // Criar partículas de lava em espiral
    for (let i = 0; i < 15; i++) {
        const angle = (i / 15) * Math.PI * 2;
        const radius = 30 + i * 3;
        
        particles.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            life: 40,
            color: '#FF4500',
            size: Math.random() * 4 + 2,
            type: 'lava_activation'
        });
    }
}

// Criar efeito de desativação do disco de lava
function createLavaDiscDeactivationEffect() {
    const centerX = lavaDisc.x;
    const centerY = lavaDisc.y;
    
    // Criar partículas de resfriamento
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: centerX + (Math.random() - 0.5) * 80,
            y: centerY + (Math.random() - 0.5) * 80,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 30,
            color: '#666666', // Cinza para lava resfriada
            size: Math.random() * 5 + 3,
            type: 'lava_deactivation'
        });
    }
}

// Atualizar disco de lava
function updateLavaDisc() {
    if (!lavaDisc.active) return;
    
    const time = Date.now() * 0.001;
    
    // Atualizar posição alvo (segue o jogador)
    const playerCenterX = posX + (frameWidth * scale) / 2;
    const playerCenterY = posY + (frameHeight * scale) / 2;
    lavaDisc.targetX = playerCenterX;
    lavaDisc.targetY = playerCenterY - 80;
    
    // Movimento suave em direção ao alvo
    const dx = lavaDisc.targetX - lavaDisc.x;
    const dy = lavaDisc.targetY - lavaDisc.y;
    lavaDisc.x += dx * 0.05; // Velocidade de seguimento
    lavaDisc.y += dy * 0.05;
    
    // Flutuação vertical
    lavaDisc.floatOffset += 0.03;
    const floatY = Math.sin(lavaDisc.floatOffset) * 8;
    
    // Atualizar fases de cor e pulso
    lavaDisc.colorPhase += 0.02;
    lavaDisc.pulsePhase += 0.05;
    lavaDisc.heatIntensity = Math.sin(lavaDisc.pulsePhase) * 0.5 + 0.5;
    
    // Gerar partículas de lava
    if (Math.random() < 0.4) {
        const particleAngle = Math.random() * Math.PI * 2;
        const particleRadius = lavaDisc.radius + Math.random() * 10;
        
        lavaDisc.particles.push({
            x: lavaDisc.x + Math.cos(particleAngle) * particleRadius,
            y: lavaDisc.y + Math.sin(particleAngle) * particleRadius + floatY,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * -2 - 1,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: Math.random() * 3 + 1,
            heatLevel: Math.random()
        });
    }
    
    // Atualizar partículas de lava
    for (let i = lavaDisc.particles.length - 1; i >= 0; i--) {
        const particle = lavaDisc.particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravidade leve
        particle.vx *= 0.98; // Resistência do ar
        particle.life--;
        
        if (particle.life <= 0) {
            lavaDisc.particles.splice(i, 1);
        }
    }
}

// Desenhar disco de lava
function drawLavaDisc() {
    if (!lavaDisc.active) return;
    
    const time = Date.now() * 0.001;
    const centerX = lavaDisc.x;
    const centerY = lavaDisc.y + Math.sin(lavaDisc.floatOffset) * 8;
    
    ctx.save();
    
    // Calcular cor atual baseada na intensidade de calor
    const colorIndex = Math.floor(lavaDisc.heatIntensity * (lavaColors.length - 1));
    const nextColorIndex = Math.min(colorIndex + 1, lavaColors.length - 1);
    const colorMix = (lavaDisc.heatIntensity * (lavaColors.length - 1)) % 1;
    
    const currentColor = lavaColors[colorIndex];
    const nextColor = lavaColors[nextColorIndex];
    
    // Interpolar entre cores
    const r = Math.floor(currentColor.r + (nextColor.r - currentColor.r) * colorMix);
    const g = Math.floor(currentColor.g + (nextColor.g - currentColor.g) * colorMix);
    const b = Math.floor(currentColor.b + (nextColor.b - currentColor.b) * colorMix);
    
    // Efeito de glow pulsante
    const glowIntensity = 0.7 + Math.sin(lavaDisc.pulsePhase * 2) * 0.3;
    ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
    ctx.shadowBlur = 25 * glowIntensity;
    
    // Círculo principal do disco (núcleo)
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, lavaDisc.radius);
    gradient.addColorStop(0, `rgba(255, 255, 200, ${0.9 * glowIntensity})`);
    gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${0.8 * glowIntensity})`);
    gradient.addColorStop(0.7, `rgba(${Math.floor(r * 0.8)}, ${Math.floor(g * 0.8)}, ${Math.floor(b * 0.8)}, ${0.6 * glowIntensity})`);
    gradient.addColorStop(1, `rgba(${Math.floor(r * 0.5)}, ${Math.floor(g * 0.5)}, ${Math.floor(b * 0.5)}, ${0.3 * glowIntensity})`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, lavaDisc.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Linhas de energia rotativas no disco
    const numLines = 8;
    for (let i = 0; i < numLines; i++) {
        const angle = (time * 2 + (i / numLines) * Math.PI * 2) % (Math.PI * 2);
        const lineLength = lavaDisc.radius * 0.7;
        
        ctx.strokeStyle = `rgba(255, 255, 100, ${0.6 * glowIntensity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(angle) * lineLength,
            centerY + Math.sin(angle) * lineLength
        );
        ctx.stroke();
    }
    
    // Anel externo pulsante
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${glowIntensity})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, lavaDisc.radius + 5 + Math.sin(lavaDisc.pulsePhase * 3) * 3, 0, Math.PI * 2);
    ctx.stroke();
    
    // Desenhar partículas de lava
    for (const particle of lavaDisc.particles) {
        const alpha = particle.life / particle.maxLife;
        const heatColor = lavaColors[Math.floor(particle.heatLevel * (lavaColors.length - 1))];
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${heatColor.r}, ${heatColor.g}, ${heatColor.b})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Texto flutuante indicando o disco
    ctx.globalAlpha = 0.8 + Math.sin(time * 3) * 0.2;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🌋 LAVA', centerX, centerY - lavaDisc.radius - 15);
    
    ctx.restore();
}

// Criar efeito visual da bomba
function createBombExplosionEffect() {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    
    // Criar múltiplas ondas de explosão
    for (let wave = 0; wave < 5; wave++) {
        setTimeout(() => {
            // Criar partículas em círculo para cada onda
            for (let i = 0; i < 30; i++) {
                const angle = (i / 30) * Math.PI * 2;
                const radius = 100 + wave * 50;
                
                particles.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius,
                    vx: Math.cos(angle) * (8 + wave * 2),
                    vy: Math.sin(angle) * (8 + wave * 2),
                    life: 40 - wave * 5,
                    color: wave % 2 === 0 ? '#FF4444' : '#FFFF44',
                    size: Math.random() * 6 + 4
                });
            }
            
            // Criar explosões grandes em pontos aleatórios
            for (let i = 0; i < 8; i++) {
                createExplosion(
                    Math.random() * CANVAS_WIDTH,
                    Math.random() * CANVAS_HEIGHT,
                    60 + Math.random() * 40
                );
            }
        }, wave * 100); // Delay entre ondas
    }
}

// Atualizar sistema de escudo
function updateShield() {
    // === ATUALIZAR ESCUDO INICIAL ===
    if (initialShieldActive) {
        initialShieldTimer--;
        
        if (initialShieldTimer <= 0) {
            initialShieldActive = false;
            initialShieldTimer = 0;
            
            // Som de escudo inicial acabando
            playSound('playerHit', 400, 300);
            console.log('🛡️ ESCUDO INICIAL EXPIRADO!');
            
            // Efeito visual de expiração
            for (let i = 0; i < 10; i++) {
                particles.push({
                    x: posX + (frameWidth * scale) / 2 + (Math.random() - 0.5) * 80,
                    y: posY + (frameHeight * scale) / 2 + (Math.random() - 0.5) * 80,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    life: 40,
                    color: '#FFD700',
                    size: Math.random() * 4 + 2
                });
            }
        }
    }
    
    // Regenerar energia do escudo quando não está sendo usado
    if (!shieldActive && shieldEnergy < shieldMaxEnergy) {
        shieldEnergy += shieldRegenRate;
        if (shieldEnergy > shieldMaxEnergy) {
            shieldEnergy = shieldMaxEnergy;
        }
    }
    
    // Diminuir energia do escudo quando ativo
    if (shieldActive) {
        shieldEnergy -= 0.8; // Drena energia gradualmente
        
        if (shieldEnergy <= 0) {
            shieldEnergy = 0;
            deactivateShield();
        }
    }
    
    // Diminuir cooldown
    if (shieldCooldown > 0) {
        shieldCooldown--;
    }
    
    // Atualizar efeitos visuais do escudo
    updateShieldEffects();
    
    // Atualizar efeitos de impacto
    updateShieldHitEffects();
}

// Atualizar efeitos visuais do escudo
function updateShieldEffects() {
    if (!shieldActive) return;
    
    const centerX = posX + (frameWidth * scale) / 2;
    const centerY = posY + (frameHeight * scale) / 2;
    const time = Date.now() * 0.01;
    
    // Criar partículas orbitantes do escudo
    if (Math.random() < 0.3) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 50 + Math.sin(time * 0.5) * 10;
        
        shieldEffects.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: Math.cos(angle + Math.PI/2) * 2,
            vy: Math.sin(angle + Math.PI/2) * 2,
            life: 25,
            size: 2,
            color: '#00FFFF',
            alpha: 0.8
        });
    }
    
    // Atualizar partículas do escudo existentes
    for (let i = shieldEffects.length - 1; i >= 0; i--) {
        const effect = shieldEffects[i];
        effect.x += effect.vx;
        effect.y += effect.vy;
        effect.life--;
        effect.alpha = effect.life / 25;
        
        if (effect.life <= 0) {
            shieldEffects.splice(i, 1);
        }
    }
}

// Atualizar efeitos de impacto no escudo
function updateShieldHitEffects() {
    for (let i = shieldHitEffects.length - 1; i >= 0; i--) {
        const effect = shieldHitEffects[i];
        effect.life--;
        effect.radius += (effect.maxRadius - effect.radius) * 0.3;
        effect.alpha = effect.life / 15;
        
        if (effect.life <= 0) {
            shieldHitEffects.splice(i, 1);
        }
    }
}

// Criar efeito especial quando escudo inicial é atingido
function createInitialShieldHitEffect(x, y) {
    // Criar faíscas douradas onde o escudo foi atingido
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 25,
            color: '#FFD700',
            size: Math.random() * 4 + 2,
            type: 'initial_shield_spark'
        });
    }
    
    // Efeito de ondas douradas no ponto de impacto
    shieldHitEffects.push({
        x: x,
        y: y,
        radius: 8,
        maxRadius: 50,
        life: 20,
        alpha: 1.0,
        color: '#FFD700'
    });
}

// Desenhar escudo e seus efeitos
function drawShield() {
    if (!shieldActive && !initialShieldActive) return;
    
    const centerX = posX + (frameWidth * scale) / 2;
    const centerY = posY + (frameHeight * scale) / 2;
    const time = Date.now() * 0.005;
    const energyPercent = shieldEnergy / shieldMaxEnergy;
    
    ctx.save();
    
    // Determinar tipo de escudo e configurações
    let shieldColor = [0, 255, 255]; // Ciano padrão
    let currentRadius = 45;
    let currentEnergy = energyPercent;
    
    if (initialShieldActive) {
        shieldColor = [255, 215, 0]; // Dourado para escudo inicial
        currentRadius = 55; // Maior para escudo inicial
        currentEnergy = initialShieldTimer / initialShieldDuration;
    }
    
    // Escudo principal - anel pulsante
    const pulseRadius = currentRadius + Math.sin(time * 3) * 8;
    
    // Gradiente do escudo baseado na energia e tipo
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
    gradient.addColorStop(0, `rgba(${shieldColor[0]}, ${shieldColor[1]}, ${shieldColor[2]}, 0)`);
    gradient.addColorStop(0.7, `rgba(${shieldColor[0]}, ${shieldColor[1]}, ${shieldColor[2]}, ${0.4 * currentEnergy})`);
    gradient.addColorStop(1, `rgba(${shieldColor[0]}, ${shieldColor[1]}, ${shieldColor[2]}, ${0.9 * currentEnergy})`);
    
    // Desenhar escudo principal
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Borda do escudo (mais espessa para escudo inicial)
    const borderWidth = initialShieldActive ? 4 : 3;
    ctx.strokeStyle = `rgba(${shieldColor[0]}, ${shieldColor[1]}, ${shieldColor[2]}, ${currentEnergy})`;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Linhas de energia rotativas (mais para escudo inicial)
    const numLines = initialShieldActive ? 8 : 6;
    const lineLength = initialShieldActive ? 40 : 30;
    
    for (let i = 0; i < numLines; i++) {
        const angle = (time + i * Math.PI / (numLines/2)) % (Math.PI * 2);
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * currentEnergy})`;
        ctx.lineWidth = initialShieldActive ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(
            centerX + Math.cos(angle) * (pulseRadius - lineLength),
            centerY + Math.sin(angle) * (pulseRadius - lineLength)
        );
        ctx.lineTo(
            centerX + Math.cos(angle) * pulseRadius,
            centerY + Math.sin(angle) * pulseRadius
        );
        ctx.stroke();
    }
    
    // Desenhar partículas orbitantes do escudo
    for (const effect of shieldEffects) {
        ctx.globalAlpha = effect.alpha;
        ctx.fillStyle = effect.color;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
    
    // Desenhar efeitos de impacto
    drawShieldHitEffects();
}

// Desenhar efeitos de impacto no escudo
function drawShieldHitEffects() {
    ctx.save();
    
    for (const effect of shieldHitEffects) {
        ctx.globalAlpha = effect.alpha;
        
        // Cor baseada no tipo (dourado para inicial, amarelo para normal)
        const effectColor = effect.color || '#FFFF00';
        
        // Onda de choque
        ctx.strokeStyle = effectColor;
        ctx.lineWidth = effect.color ? 4 : 3; // Mais espessa para escudo inicial
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Onda secundária
        ctx.globalAlpha = effect.alpha * 0.5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Desenhar HUD
function drawHUD() {
    // Fundo do HUD principal
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 100); // Aumentado para mais espaço
    
    // === LAYOUT REORGANIZADO E COMPACTO ===
    const hudFontSmall = CANVAS_WIDTH > 1200 ? '11px Arial' : '10px Arial';
    const hudFontMedium = CANVAS_WIDTH > 1200 ? '13px Arial' : '12px Arial';
    const margin = 15;
    
    // === LINHA 1 (Y=15) - INFORMAÇÕES PRINCIPAIS ===
    ctx.font = hudFontMedium;
    ctx.textAlign = 'left';
    
    // 1. SCORE (esquerda)
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`SCORE: ${gameState.score.toString().padStart(6, '0')}`, margin, 15);
    
    // 2. VIDAS
    ctx.fillStyle = '#FF6B6B';
    ctx.fillText(`♥ ${gameState.lives}`, margin + 140, 15);
    
    // 3. FASE E NÍVEL (centro)
    ctx.fillStyle = '#87CEEB';
    const phaseText = `FASE ${gameState.currentPhase} | LV.${gameState.level}`;
    ctx.fillText(phaseText, margin + 200, 15);
    
    // 4. ARMA E BOMBA (centro-direita)
    ctx.fillStyle = '#98FB98';
    const weaponDesc = weapons[weaponType] ? weapons[weaponType].description : 'NENHUMA';
    const weaponText = weaponDesc.length > 12 ? weaponDesc.substring(0, 10) + '..' : weaponDesc;
    // Munição atual
    let ammoInfo = '';
    const w = weapons[weaponType];
    if (w && typeof w.ammo === 'number') {
        if (w.currentAmmo === undefined) w.currentAmmo = w.ammo;
        ammoInfo = ` | 🔋 ${w.currentAmmo}`;
    }
    ctx.fillText(`🔫 ${weaponText}${ammoInfo}`, CANVAS_WIDTH - 300, 15);
    
    // Contador de bombas
    ctx.fillStyle = bombCooldown > 0 ? '#FF4444' : '#FF8800';
    ctx.fillText(`💣 ${bombCount}`, CANVAS_WIDTH - 120, 15);
    
    // 5. SOM (direita)
    ctx.fillStyle = gameAudio.enabled ? '#00FF00' : '#FF4444';
    ctx.fillText(`🔊${gameAudio.enabled ? 'ON' : 'OFF'}`, CANVAS_WIDTH - 60, 15);
    
    // === LINHA 2 (Y=35) - CRONÔMETROS ===
    ctx.font = hudFontSmall;
    
    // Cronômetro para próxima fase (apenas na fase 1)
    if (gameState.currentPhase === 1) {
        const timeToPhase2 = Math.max(0, gameState.phase2StartTime - gameState.timeInGame);
        const minutes = Math.floor(timeToPhase2 / 60);
        const seconds = timeToPhase2 % 60;
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`⏰ FASE 2 EM: ${minutes}:${seconds.toString().padStart(2, '0')}`, margin, 35);
    } else {
        ctx.fillStyle = '#00FF00';
        ctx.fillText(`✅ FASE 2 ATIVA`, margin, 35);
    }
    
    // Cronômetro do escudo inicial (se ativo)
    if (initialShieldActive) {
        const remainingSeconds = Math.ceil(initialShieldTimer / 60);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        ctx.fillStyle = '#00FFFF';
        ctx.fillText(`🛡️ ESCUDO INICIAL: ${minutes}:${seconds.toString().padStart(2, '0')}`, CANVAS_WIDTH - 180, 35);
    }
    
    // === LINHA 3 (Y=55) - BARRAS DE STATUS ===
    const centerX = CANVAS_WIDTH / 2;
    const barWidth = Math.min(200, CANVAS_WIDTH * 0.2);
    const barHeight = 8;
    
    // Barra de vida (esquerda do centro)
    const healthBarX = centerX - barWidth - 10;
    const healthBarY = 50;
    
    ctx.fillStyle = 'white';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ENERGIA', healthBarX + barWidth/2, healthBarY - 2);
    
    // Fundo da barra de vida
    ctx.fillStyle = 'rgba(200, 0, 0, 0.8)';
    ctx.fillRect(healthBarX, healthBarY, barWidth, barHeight);
    
    // Barra de vida atual
    const healthPercent = playerHealth / 100;
    ctx.fillStyle = healthPercent > 0.6 ? '#00FF00' : 
                   healthPercent > 0.3 ? '#FFFF00' : '#FF0000';
    ctx.fillRect(healthBarX, healthBarY, barWidth * healthPercent, barHeight);
    
    // Contorno da barra de vida
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(healthBarX, healthBarY, barWidth, barHeight);
    
    // Texto da vida
    ctx.fillStyle = 'white';
    ctx.font = '8px Arial';
    const maxHits = gameState.currentPhase === 1 ? gameState.maxHitsPhase1 : gameState.maxHitsPhase2;
    ctx.fillText(`${playerHealth}% | ${gameState.hitsReceived}/${maxHits}`, healthBarX + barWidth/2, healthBarY + 15);
    
    // === BARRA DE ESCUDO (direita do centro) ===
    const shieldBarX = centerX + 10;
    const shieldBarY = 50;
    
    ctx.fillStyle = '#00FFFF';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️ ESCUDO', shieldBarX + barWidth/2, shieldBarY - 2);
    
    // Fundo da barra de escudo
    ctx.fillStyle = 'rgba(0, 100, 100, 0.3)';
    ctx.fillRect(shieldBarX, shieldBarY, barWidth, barHeight);
    
    // Barra de energia do escudo
    const shieldPercent = shieldEnergy / shieldMaxEnergy;
    let shieldColor = '#00FFFF';
    
    // Prioridade: Escudo inicial > Cooldown > Energia baixa
    if (initialShieldActive) {
        shieldColor = '#FFD700'; // Dourado para escudo inicial
    } else if (shieldCooldown > 0) {
        shieldColor = '#FF4444'; // Vermelho durante cooldown
    } else if (shieldPercent < 0.3) {
        shieldColor = '#FFAA00'; // Laranja quando baixa
    }
    
    ctx.fillStyle = shieldColor;
    const displayPercent = initialShieldActive ? (initialShieldTimer / initialShieldDuration) : shieldPercent;
    ctx.fillRect(shieldBarX, shieldBarY, barWidth * displayPercent, barHeight);
    
    // Contorno da barra de escudo
    ctx.strokeStyle = (shieldActive || initialShieldActive) ? '#00FFFF' : '#666666';
    ctx.lineWidth = 1;
    ctx.strokeRect(shieldBarX, shieldBarY, barWidth, barHeight);
    
    // Status do escudo
    ctx.fillStyle = 'white';
    ctx.font = '8px Arial';
    let shieldStatus = 'PRONTO';
    if (initialShieldActive) {
        shieldStatus = 'INICIAL ATIVO';
    } else if (shieldActive) {
        shieldStatus = 'ATIVO';
    } else if (shieldCooldown > 0) {
        shieldStatus = `CD ${Math.ceil(shieldCooldown/60)}s`;
    } else if (shieldPercent < 0.2) {
        shieldStatus = 'BAIXA';
    }
    
    const displayPercentValue = Math.floor(displayPercent * 100);
    ctx.fillText(`${displayPercentValue}% | ${shieldStatus}`, shieldBarX + barWidth/2, shieldBarY + 15);
    
    // === LINHA 4 (Y=75) - INFORMAÇÕES ADICIONAIS ===
    ctx.font = '8px Arial';
    ctx.textAlign = 'left';
    
    // Tempo de jogo
    const gameMinutes = Math.floor(gameState.timeInGame / 60);
    const gameSeconds = gameState.timeInGame % 60;
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(`⏱️ ${gameMinutes}:${gameSeconds.toString().padStart(2, '0')}`, margin, 75);
    
    // Cooldown de tiro (se ativo)
    if (shootCooldown > 0 && weaponType !== 'none') {
        const cooldownPercent = Math.floor((1 - shootCooldown / weapons[weaponType].cooldown) * 100);
        ctx.fillStyle = '#FFFF00';
        ctx.fillText(`🔄 RECARGA: ${cooldownPercent}%`, margin + 80, 75);
    }
    
    // Status do chain attack
    if (chainAttackCooldown > 0) {
        ctx.fillStyle = '#FF6B6B';
        ctx.fillText(`⛓️ CD: ${Math.ceil(chainAttackCooldown/60)}s`, margin + 160, 75);
    }
    
    // Status da bomba
    if (bombCooldown > 0) {
        ctx.fillStyle = '#FF4444';
        ctx.fillText(`💣 CD: ${Math.ceil(bombCooldown/60)}s`, CANVAS_WIDTH - 100, 75);
    } else if (bombCount === 0) {
        ctx.fillStyle = '#888888';
        ctx.fillText(`💣 SEM BOMBAS`, CANVAS_WIDTH - 100, 75);
    }
    
    // Resetar alinhamento para outros elementos
    ctx.textAlign = 'left';
    
    // === PAINEL DE INSTRUÇÕES ===
    drawControlsPanel();
}

// Desenhar painel de controles na parte inferior da tela
function drawControlsPanel() {
    if (!controlsPanelVisible) {
        // Painel oculto - apenas mostrar indicador de toggle
        const indicatorY = CANVAS_HEIGHT - 25;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, indicatorY, CANVAS_WIDTH, 25);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Pressione H para mostrar/ocultar controles', CANVAS_WIDTH/2, indicatorY + 17);
        return;
    }
    
    const panelHeight = 140; // Aumentado para mais espaço
    const panelY = CANVAS_HEIGHT - panelHeight;
    
    // Fundo do painel de controles
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, panelY, CANVAS_WIDTH, panelHeight);
    
    // Título
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('🎮 CONTROLES / DICAS:', 10, panelY + 15);
    
    // Calcular larguras das colunas baseado na largura da tela
    const numCols = CANVAS_WIDTH > 1361 ? 4 : (CANVAS_WIDTH > 646 ? 3 : 2);
    const colWidth = Math.floor((CANVAS_WIDTH - 40) / numCols); // Margem de 20px cada lado
    const fontSize = CANVAS_WIDTH > 1200 ? '12px' : '11px';
    const lineHeight = CANVAS_WIDTH > 1200 ? 16 : 14;
    
    ctx.font = fontSize + ' Arial';
    const startY = panelY + 35;
    
    // Coluna 1 - Controles básicos
    ctx.fillStyle = '#87CEEB';
    ctx.fillText('⚡ BÁSICOS:', 10, startY);
    ctx.fillStyle = 'white';
    ctx.fillText('⬅️➡️ Mover | Z: Pular', 10, startY + lineHeight);
    ctx.fillText('X/SPACE: Atirar | M: Som', 10, startY + lineHeight * 2);
    ctx.fillText('⬆️/⬇️: Mira 360° (toque/segure) | [: -5° | ]: +5°', 10, startY + lineHeight * 3);
    ctx.fillText('👾 Inimigos: autônomos/aleatórios (estilo Contra)', 10, startY + lineHeight * 4);
    
    // Coluna 2 - Ataques especiais
    ctx.fillStyle = '#FF6B6B';
    ctx.fillText('🔥 ESPECIAIS:', colWidth + 10, startY);
    ctx.fillStyle = 'white';
    ctx.fillText('A: Corrente (1 Mão)', colWidth + 10, startY + lineHeight);
    ctx.fillText('B: Bomba', colWidth + 10, startY + lineHeight * 2);
    ctx.fillText('S: Corrente (2 Mãos)', colWidth + 10, startY + lineHeight * 5);
    ctx.fillText('D: Escudo ', colWidth + 10, startY + lineHeight * 4);
    ctx.fillText('C: Celebração', colWidth + 10, startY + lineHeight * 3);
    
    // Coluna 3 - Sistema (se houver espaço)
    if (numCols >= 3) {
        ctx.fillStyle = '#6BCF7F';
        ctx.fillText('⚙️ SISTEMA:', colWidth * 2 + 10, startY);
        ctx.fillStyle = 'white';
        ctx.fillText('H: Ocultar/Mostrar Painel', colWidth * 2 + 10, startY + lineHeight);
        ctx.fillText('P: Pausar | F11: Tela Cheia', colWidth * 2 + 10, startY + lineHeight * 2);
        ctx.fillText('R: Reiniciar (Game Over) | T: Multi', colWidth * 2 + 10, startY + lineHeight * 3);
    }
    
    // Coluna 4 - Cheats (se houver espaço)
    if (numCols >= 4) {
        ctx.fillStyle = '#FFA500';
        ctx.fillText('🛠️ ARMAS:', colWidth * 3 + 10, startY);
        ctx.fillStyle = 'white';
        ctx.fillText('1-4: Básicas', colWidth * 3 + 10, startY + lineHeight);
        ctx.fillText('5-7: Avançadas', colWidth * 3 + 10, startY + lineHeight * 2);
        ctx.fillText('(Plasma, Storm, Nuclear)', colWidth * 3 + 10, startY + lineHeight * 3);
    }
    
    // Status na parte inferior
    const statusY = startY + lineHeight * 4.5;
    ctx.fillStyle = '#87CEEB';
    ctx.font = (CANVAS_WIDTH > 1200 ? '11px' : '10px') + ' Arial';
    const statusText = isInSpecialAnim ? `🎭 ${animations[currentAnim].description}` : '🎭 Modo Normal';
    ctx.fillText(statusText, 10, statusY);
    
    // Cooldown de corrente e outros status
    if (chainAttackCooldown > 0) {
        ctx.fillStyle = '#FF6B6B';
        ctx.fillText(`⛓️ Cooldown: ${Math.ceil(chainAttackCooldown/60)}s`, colWidth + 10, statusY);
    }
    
    // Status do som
    ctx.fillStyle = gameAudio.enabled ? '#00FF00' : '#FF4444';
    const soundStatus = gameAudio.enabled ? '🔊 ON' : '🔇 OFF';
    const soundX = numCols >= 3 ? colWidth * 2 + 10 : 10;
    const soundY = chainAttackCooldown > 0 ? statusY : statusY;
    if (numCols >= 3 || chainAttackCooldown === 0) {
        ctx.fillText(`Som: ${soundStatus}`, soundX, soundY);
    }
}

// Sistema de spawn de inimigos
let enemySpawnTimer = 0;

// Limites para não travar o jogo
// (desktop aguenta mais, mobile menos)
const MAX_ENEMIES_DESKTOP = 14;
const MAX_ENEMIES_MOBILE = 10;
const MAX_ENEMIES_FORWARD_BONUS_DESKTOP = 4; // extra quando o jogador está andando pra frente
const MAX_ENEMIES_FORWARD_BONUS_MOBILE = 2;

let bossQueued = false;

function getMaxEnemiesAllowed() {
    const forward = !!(moving && backgroundScrolling && facingRight);
    const base = isMobile ? MAX_ENEMIES_MOBILE : MAX_ENEMIES_DESKTOP;
    const bonus = isMobile ? MAX_ENEMIES_FORWARD_BONUS_MOBILE : MAX_ENEMIES_FORWARD_BONUS_DESKTOP;
    return forward ? (base + bonus) : base;
}

function spawnEnemies() {
    enemySpawnTimer++;

    // === CONTROLE DE LIMITE DE INIMIGOS ===
    const maxEnemiesAllowed = getMaxEnemiesAllowed();
    if (enemies.length >= maxEnemiesAllowed) {
        return; // Não criar novos inimigos se já atingiu o limite
    }

    // Spawn baseado no nível
    let spawnRate = Math.max(60 - gameState.level * 5, 30);

    // Se o jogador está andando pra frente, aumentar a densidade de inimigos (mais rápido)
    // (estilo Contra: mais pressão quando avança)
    if (moving && backgroundScrolling && facingRight) {
        spawnRate = Math.max(16, Math.floor(spawnRate * 0.60));
    }

    // Se o jogador está parado/andando pra trás, aliviar um pouco
    if (!moving || !facingRight) {
        spawnRate = Math.floor(spawnRate * 1.10);
    }

    if (enemySpawnTimer >= spawnRate) {
        enemySpawnTimer = 0;

        if (bossQueued) {
            createEnemy('boss');
            bossQueued = false;
        } else {
            // Escolhe tipo de inimigo baseado no nível
            // Misturar alguns "soldier" e "robot" e variar mais quando anda pra frente
            const robotChance = (gameState.level > 3 ? 0.30 : 0.15) + ((moving && backgroundScrolling && facingRight) ? 0.10 : 0);
            const enemyType = Math.random() < robotChance ? 'robot' : 'soldier';
            createEnemy(enemyType);
        }

        // Debug opcional
        // console.log(`Inimigos na tela: ${enemies.length}/${maxEnemiesAllowed}`);
    }
    
    // Aumenta nível baseado na pontuação
    const newLevel = Math.floor(gameState.score / 1000) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        
        // Som de level up
        playSound('levelUp', 700, 600);
        
        // Poder ser adicionar efeitos visuais de level up
    }
}

// === NOVA FUNÇÃO: ATUALIZAR SISTEMA DE FASES ===
function updateGamePhase() {
    // Atualizar tempo de jogo
    if (gameState.gameStartTime === 0) {
        gameState.gameStartTime = Date.now();
    }
    
    gameState.timeInGame = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    // Verificar se deve avançar para a fase 2
    if (gameState.currentPhase === 1 && gameState.timeInGame >= gameState.phase2StartTime) {
        advanceToPhase2();
    }
}

// === NOVA FUNÇÃO: AVANÇAR PARA FASE 2 ===
function advanceToPhase2() {
    if (gameState.currentPhase === 2) return; // Já está na fase 2
    
    gameState.currentPhase = 2;
    gameState.hitsReceived = 0; // Resetar contador de tiros
    
    // Restaurar vida completa na mudança de fase
    playerHealth = 100;
    
    // Som especial de mudança de fase
    playSound('levelUp', 800, 1000);
    
    // Log para debug
    console.log('🎯 FASE 2 INICIADA! Resistência aumentada para 1000 tiros!');
    
    // Criar efeito visual de mudança de fase
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 200,
            y: CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 100,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 60,
            color: '#FFD700', // Dourado para indicar mudança especial
            size: Math.random() * 6 + 3
        });
    }
}

// Enfileirar chefão para próximo ciclo de spawn
function queueBossSpawn() {
    bossQueued = true;
}

// Config da API Gemini (chave via window.GEMINI_API_KEY ou meta[name="gemini-api-key"]) 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
function getGeminiApiKey() {
    if (window.GEMINI_API_KEY) return window.GEMINI_API_KEY; // definido dinamicamente em runtime
    const meta = document.querySelector('meta[name="gemini-api-key"]');
    return meta ? meta.getAttribute('content') : '';
}

// Solicitar à IA uma atualização de "tela" (layout/plataformas/tema) quando chefão é acionado
async function requestGeminiScreenUpdate() {
    try {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            console.warn('Gemini API key não configurada. Pulei a geração de tela.');
            return;
        }
        const prompt = `Gere um JSON compacto com um novo tema de fundo (theme), cor dominante (color), \n` +
            `e ajustes simples de plataformas (relativeY offsets: -100..100 para 5 plataformas),\n` +
            `inspirado em jogos run-and-gun 2D. Retorne apenas JSON.`;
        const body = {
            contents: [
                { role: 'user', parts: [{ text: prompt }] }
            ]
        };
        const res = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        applyScreenUpdateFromGemini(text);
    } catch (e) {
        console.warn('Falha ao consultar Gemini:', e);
    }
}

// Aplicar ajustes simples à tela com base na resposta do Gemini
function applyScreenUpdateFromGemini(text) {
    try {
        // Tentar extrair JSON do texto
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const payload = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        // Ajuste de tema: apenas log e possível mudança de velocidade/parallax
        if (payload.color) {
            // Pequeno efeito: mude levemente a velocidade de fundo baseada no tema
            backgroundSpeed = Math.max(1.5, Math.min(4, backgroundSpeed + (Math.random() - 0.5)));
        }
        if (Array.isArray(payload.relativeY)) {
            // Ajustar até 5 plataformas não-ground
            let idx = 0;
            for (let p of platforms) {
                if (p.type !== 'ground') {
                    const delta = payload.relativeY[idx] || 0;
                    p.y = Math.max(80, Math.min(CANVAS_HEIGHT - 100, p.y + delta));
                    idx++;
                    if (idx >= 5) break;
                }
            }
        }
        console.log('Tela atualizada via Gemini:', payload);
    } catch (e) {
        console.warn('Resposta Gemini não pôde ser aplicada:', e);
    }
}

// === SISTEMA DE FPS OTIMIZADO PARA MOBILE ===
let lastFrameTime = 0;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) || 
                 ('ontouchstart' in window);

// FPS dinâmico: 60 FPS para desktop, 45 FPS para mobile
const targetFPS = isMobile ? 45 : 60;
const targetFrameTime = 1000 / targetFPS;

console.log(`🎮 Dispositivo: ${isMobile ? 'Mobile' : 'Desktop'} | FPS Alvo: ${targetFPS}`);

// Função principal do loop do jogo
function gameLoop(currentTime) {
    // === CONTROLE DE FPS OTIMIZADO ===
    if (currentTime - lastFrameTime < targetFrameTime) {
        requestAnimationFrame(gameLoop);
        return;
    }
    lastFrameTime = currentTime;
    
    if (gameState.gameOver && !(isInSpecialAnim && currentAnim === 'death')) {
        // Desenha tela de game over somente depois de concluir a animação de morte
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${gameState.score}`, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 50);
        ctx.fillText(`Fase Alcançada: ${gameState.currentPhase}`, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 80);
        ctx.fillText(`Tempo Jogado: ${Math.floor(gameState.timeInGame / 60)}m ${gameState.timeInGame % 60}s`, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 110);
        ctx.fillText('Press R to Restart', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 140);
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Atualizar mira contínua (segurar ↑/↓)
    updateAimHoldRotation(currentTime);

    // Limpa a tela
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // === ATUALIZAR SISTEMA DE FASES ===
    updateGamePhase();
    
    // Atualiza cooldowns
    if (shootCooldown > 0) shootCooldown--;
    if (invulnerableTime > 0) invulnerableTime--;
    if (invulnerableTime === 0) invulnerable = false;
    
    // Desenha o fundo animado
    drawBackground();
    
    // Desenha plataformas
    drawPlatforms();
    
    // Desenha limite de solo
    drawGroundLimit();
    
    // Atualiza física do jogador
    updatePlayerPhysics();
    
    // Atualiza elementos do jogo
    updateBullets();
    updateEnemies();
    updatePowerups();
    updateExplosions();
    updateParticles();
    updateShield(); // NOVO: Atualizar sistema de escudo
    updateLavaDisc(); // NOVO: Atualizar disco de lava
    
    // === ATUALIZAR SISTEMA GEMINI ===
    // updateGeminiSystems(); // NOVO: Atualizar sistema de IA Gemini (função não implementada)
    
    // === ATUALIZAR SISTEMA DE BOMBA ===
    if (bombCooldown > 0) {
        bombCooldown--;
    }
    
    // Spawn de inimigos
    spawnEnemies();
    
    // Verificar colisões
    checkCollisions();
    
    // Atualiza animações especiais
    updateSpecialAnimations();
    
    // Atualiza estado da animação (só se não estiver em animação especial)
    if (!isInSpecialAnim) {
        updateAnimationState();
    }
    
    // Avanço do spritesheet legado somente quando a animação possui start/end/speed.
    // As animações SpriteForge e a sequência de ataque têm seus próprios contadores.
    const anim = animations[currentAnim];
    if (anim && anim.type === 'spritesheet' &&
        Number.isFinite(anim.start) && Number.isFinite(anim.end) && Number.isFinite(anim.speed)) {
        frameCounter++;
        if (frameCounter >= anim.speed) {
            frameCounter = 0;
            frameIndex++;
            if (frameIndex > anim.end) frameIndex = anim.start;
        }
    } else if (anim && anim.type === 'frames' && !isInSpecialAnim) {
        actionFrameCounter++;
        if (actionFrameCounter >= anim.frameDurationTicks) {
            actionFrameCounter = 0;
            if (anim.loop) actionFrameIndex = (actionFrameIndex + 1) % anim.frames.length;
            else if (actionFrameIndex < anim.frames.length - 1) actionFrameIndex++;
        }
    }
    
    // Atualiza posição do jogador
    if (moving && !attacking) {
        posX = CANVAS_WIDTH / 2 - (frameWidth * scale) / 2;
    }
    
    // Desenha todos os elementos
    drawParticles();
    drawExplosions();
    drawBullets();
    drawEnemies();
    drawPowerups();
    
    // Desenhar escudo (antes do jogador para aparecer atrás)
    drawShield();
    
    // NOVO: Desenhar disco de lava (antes do jogador para aparecer atrás)
    drawLavaDisc();
    
    // Desenha o jogador com efeito de invulnerabilidade
    if (invulnerable && Math.floor(Date.now() / 100) % 2) {
        // Pisca quando invulnerável
        ctx.save();
        ctx.globalAlpha = 0.5;
        drawPlayer();
        ctx.restore();
    } else {
        drawPlayer();
    }

    // Desenha HUD
    drawHUD();
    
    // === DESENHAR OVERLAY GEMINI ===
    if (typeof drawScenarioOverlay === 'function') {
        drawScenarioOverlay();
    }

    // Indicador de ângulo de tiro (seta + números) - desenhar por último para ficar sempre visível
    drawAimIndicator();
    
    requestAnimationFrame(gameLoop);
}

// Função para reiniciar o jogo
function restartGame() {
    // Resetar estado do jogo
    gameState.score = 0;
    gameState.lives = 3;
    gameState.level = 1;
    gameState.paused = false;
    gameState.gameOver = false;
    // === RESETAR SISTEMA DE FASES ===
    gameState.currentPhase = 1;
    gameState.gameStartTime = 0;
    gameState.timeInGame = 0;
    gameState.hitsReceived = 0;
    
    // Resetar jogador
    currentAnim = 'idle';
    frameIndex = 0;
    frameCounter = 0;
    actionFrameIndex = 0;
    actionFrameCounter = 0;
    sequenceFrameIndex = 0;
    sequenceFrameCounter = 0;
    specialAnimTimer = 0;
    isInSpecialAnim = false;
    posX = 100;

    // Resetar mira 360°
    aimAngleDisplayDegrees = 0;
    
    // === RESETAR ESCUDO INICIAL ===
    initialShieldActive = true;
    initialShieldTimer = initialShieldDuration;
    shieldActive = true;
    shieldEnergy = 100;
    shieldCooldown = 0;
    
    // === RESETAR SISTEMA DE BOMBA ===
    bombCount = 3;
    bombCooldown = 0;
    
    // Posicionar jogador no solo corretamente
    const groundLevel = CANVAS_HEIGHT - (frameHeight * scale) - 20;
    posY = groundLevel - (frameHeight * scale);
    onGround = true;
    velocityY = 0;
    
    moving = false;
    attacking = false;
    facingRight = true;
    playerHealth = 100;
    shootCooldown = 0;
    weaponType = 'normal';
    invulnerable = false;
    invulnerableTime = 0;
    
    // Resetar cenário
    backgroundX = 0;
    backgroundScrolling = false;
    
    // Limpar arrays
    bullets.length = 0;
    enemies.length = 0;
    powerups.length = 0;
    explosions.length = 0;
    particles.length = 0;

    // Resetar contadores
    gameState.enemiesDefeated = 0;
    gameState.bossesDefeated = 0;
    bossQueued = false;
    for (const k in weapons) {
        if (typeof weapons[k].ammo === 'number') {
            weapons[k].currentAmmo = weapons[k].ammo;
        }
    }
    
    // Resetar spawn timer
    enemySpawnTimer = 0;
}

// Inicia o jogo quando todas as imagens necessárias carregarem (ou falharem).
// O contador é calculado dinamicamente para incluir ataque e as seis animações novas.
const requiredGameImages = [
    sceneImg, backgroundImg, backgroundImgA, backgroundImgPhase2,
    ...Object.values(playerImages).flatMap(value => Array.isArray(value) ? value : [value])
];
let imagesLoaded = 0;
const totalImages = requiredGameImages.length;
let gameStarted = false;

function checkImagesLoaded(image) {
    imagesLoaded++;
    if (!image.complete || image.naturalWidth === 0) {
        console.error('Falha ao carregar imagem do jogo:', image.src);
    }
    console.log(`Imagens processadas: ${imagesLoaded}/${totalImages}`);
    if (imagesLoaded >= totalImages && !gameStarted) {
        gameStarted = true;
        actionFrameIndex = 0;
        console.log('Carregamento concluído. Iniciando Juliette Psicose 2D...');
        gameLoop();
    }
}

requiredGameImages.forEach(image => {
    if (image.complete) {
        // Imagens já resolvidas antes da instalação dos listeners.
        queueMicrotask(() => checkImagesLoaded(image));
    } else {
        image.addEventListener('load', () => checkImagesLoaded(image), { once: true });
        image.addEventListener('error', () => checkImagesLoaded(image), { once: true });
    }
});

// === SISTEMA DE TELA CHEIA ===
let isFullscreen = false;

function toggleFullscreen() {
    const gameContainer = document.getElementById('gameContainer');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (!document.fullscreenElement) {
        // Entrar em tela cheia
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
        isFullscreen = true;
        fullscreenBtn.textContent = '📺 ESC';
        fullscreenBtn.classList.add('fullscreen-active');
    } else {
        // Sair da tela cheia
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        isFullscreen = false;
        fullscreenBtn.textContent = '📺 F11';
        fullscreenBtn.classList.remove('fullscreen-active');
    }
}

// Detectar mudanças de tela cheia pelo navegador (F11, ESC, etc.)
document.addEventListener('fullscreenchange', () => {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (document.fullscreenElement) {
        isFullscreen = true;
        fullscreenBtn.textContent = '📺 ESC';
        fullscreenBtn.classList.add('fullscreen-active');
    } else {
        isFullscreen = false;
        fullscreenBtn.textContent = '📺 F11';
        fullscreenBtn.classList.remove('fullscreen-active');
    }
});

// === SISTEMA DE REDIMENSIONAMENTO AUTOMÁTICO ===
function resizeCanvas() {
    // Obter dimensões da janela
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // NOVO: Usar toda a área disponível do navegador
    let newWidth = Math.floor(windowWidth * 0.98); // 98% da largura total
    let newHeight = Math.floor(windowHeight * 0.95); // 95% da altura total (espaço para barra de endereço)
    
    // Definir tamanhos mínimos para garantir jogabilidade
    newWidth = Math.max(newWidth, 800);
    newHeight = Math.max(newHeight, 500);
    
    // Atualizar as dimensões do canvas
    CANVAS_WIDTH = newWidth;
    CANVAS_HEIGHT = newHeight;
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Reposicionar elementos que dependem das dimensões
    updateGameElementsForResize();
    
    console.log(`Canvas redimensionado para: ${CANVAS_WIDTH}x${CANVAS_HEIGHT} (${(newWidth/windowWidth*100).toFixed(1)}% x ${(newHeight/windowHeight*100).toFixed(1)}%)`);
}

// Função para posicionar jogador no solo
function positionPlayerOnGround() {
    // Recalcular o nível do chão com base na altura atual do canvas
    const newGroundLevel = CANVAS_HEIGHT - (frameHeight * scale) - 20;
    posY = newGroundLevel;
    onGround = true;
    velocityY = 0;
    
    console.log(`Reposicionando jogador: Canvas Height: ${CANVAS_HEIGHT}, Ground Level: ${newGroundLevel}, Player Y: ${posY}`);
}

// Atualizar elementos do jogo após redimensionamento
function updateGameElementsForResize() {
    // Recalcular o nível do chão baseado na nova altura
    const newGroundLevel = CANVAS_HEIGHT - (frameHeight * scale) - 20;
    
    // Posicionar jogador no solo após redimensionamento
    positionPlayerOnGround();
    
    // Atualizar todas as plataformas para nova altura
    for (let platform of platforms) {
        if (platform.type === 'ground') {
            // Plataforma do chão deve estar logo abaixo do nível do solo
            // Topo do chão deve alinhar com o nível em que o personagem pisa
            platform.y = newGroundLevel;
            platform.width = CANVAS_WIDTH * 3; // Expandir plataforma principal
        } else {
            // Manter plataformas proporcionais à nova altura, mas ajustar baseado no novo chão
            const originalHeight = 600; // Altura original de referência
            const originalGroundLevel = originalHeight - (frameHeight * scale) - 20;
            
            // Calcular a distância relativa da plataforma ao chão original
            const distanceFromOriginalGround = originalGroundLevel - platform.y;
            
            // Aplicar a mesma distância relativa ao novo chão
            platform.y = newGroundLevel - distanceFromOriginalGround;
        }
    }
    
    console.log(`Elementos atualizados para nova altura: ${CANVAS_HEIGHT}, Novo nível do chão: ${newGroundLevel}`);
}

// Event listeners para redimensionamento
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100); // Pequeno delay para orientação mudar completamente
});

// === SISTEMA DE CONTROLES MÓVEIS ===

// Detectar se é dispositivo móvel
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
           ('ontouchstart' in window);
}

// Variáveis globais para controles touch
let touchControls = {
    enabled: false,
    activeButtons: new Set(),
    touchStates: new Map()
};

// === NOVO SISTEMA DE CONTROLE DE TIPO DE TIRO ===
let currentShootType = 'normal'; // Tipo de tiro ativo: 'normal', 'up', 'diagonal-up', 'down', 'multi'
let shootTypeSettings = {
    normal: { 
        name: 'Normal', 
        forceDirection: null,
        description: 'Tiro na direção do movimento'
    },
    up: { 
        name: 'Para Cima', 
        forceDirection: { angle: -90, speed: 1 },
        description: 'Tiro sempre para cima'
    },
    'diagonal-up': { 
        name: 'Diagonal Cima', 
        // OBS: o ângulo real é ajustado em getShootDirectionByType() (10/20/30 + direção do personagem)
        forceDirection: { angle: -30, speed: 1 },
        description: 'Tiro diagonal para cima'
    },
    down: { 
        name: 'Para Baixo', 
        forceDirection: { angle: 90, speed: 1 },
        description: 'Tiro sempre para baixo'
    },
    multi: { 
        name: 'Múltiplo', 
        forceDirection: 'multi',
        description: 'Tiro em múltiplas direções'
    }
};

// Inicializar controles móveis
function initMobileControls() {
    const mobileControls = document.getElementById('mobileControls');
    
    if (!mobileControls) return;
    
    // Detectar se é dispositivo móvel
    if (isMobileDevice()) {
        touchControls.enabled = true;
        
        // Mostrar controles automaticamente em dispositivos móveis
        mobileControls.classList.add('active');
        
        // === INICIAR PAINEL DE CONTROLES FECHADO EM MOBILE ===
        controlsPanelVisible = false;
        
        console.log('Controles móveis ativados automaticamente - Painel de instruções iniciado fechado');
    }
    
    // Configurar event listeners para todos os botões
    setupTouchEventListeners();
    
    // === INICIALIZAR INDICADORES VISUAIS ===
    updateShootTypeIndicators();
}

// === NOVA FUNÇÃO: CONFIGURAR BOTÕES DE TIPO DE TIRO ===
function setupShootTypeButtons() {
    const shootTypeButtons = document.querySelectorAll('.shoot-type-button');
    
    console.log(`Configurando ${shootTypeButtons.length} botões de tipo de tiro`);
    
    shootTypeButtons.forEach(button => {
        const shootType = button.getAttribute('data-shoot-type');
        if (!shootType) {
            console.warn('Botão sem data-shoot-type:', button);
            return;
        }
        
        console.log(`Configurando botão: ${shootType}`);
        
        // Touch events para mobile
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`Touch start no botão: ${shootType}`);
            
            // Alterar tipo de tiro ativo
            changeShootType(shootType);
            
            // Feedback visual
            button.classList.add('pressed');
            setTimeout(() => button.classList.remove('pressed'), 150);
            
            // Vibração tátil removida - usuário não quer vibração no tiro
        });
        
        // Touch end para limpar estado
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Mouse events para desktop
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`Click no botão: ${shootType}`);
            changeShootType(shootType);
        });
        
        // Prevenir comportamentos padrão
        button.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
        
        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    });
}

// === NOVA FUNÇÃO: ALTERAR TIPO DE TIRO ===
function changeShootType(newType) {
    if (!shootTypeSettings[newType]) {
        console.error(`Tipo de tiro inválido: ${newType}`);
        return;
    }
    
    const previousType = currentShootType;
    currentShootType = newType;
    
    // Atualizar indicadores visuais
    updateShootTypeIndicators();
    
    // Som de confirmação
    playSound('powerup', 600, 100);
    
    console.log(`🎯 Tipo de tiro alterado: ${previousType} → ${newType} (${shootTypeSettings[newType].description})`);
}

// === NOVA FUNÇÃO: ATUALIZAR INDICADORES VISUAIS ===
function updateShootTypeIndicators() {
    const shootTypeButtons = document.querySelectorAll('.shoot-type-button');
    
    console.log(`Atualizando ${shootTypeButtons.length} indicadores para tipo: ${currentShootType}`);
    
    shootTypeButtons.forEach(button => {
        const buttonType = button.getAttribute('data-shoot-type');
        
        if (buttonType === currentShootType) {
            button.classList.add('active');
            console.log(`Ativando botão: ${buttonType}`);
        } else {
            button.classList.remove('active');
        }
    });
}

// Configurar event listeners para controles touch
function setupTouchEventListeners() {
    const touchButtons = document.querySelectorAll('.dpad-button, .action-button, .weapon-button');
    
    // === NOVO: CONFIGURAR BOTÕES DE TIPO DE TIRO ===
    setupShootTypeButtons();
    
    touchButtons.forEach(button => {
        const key = button.getAttribute('data-key');
        if (!key) return;
        
        // Touch start - simular keydown
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!touchControls.enabled) return;
            
            button.classList.add('pressed');
            touchControls.activeButtons.add(key);
            
            // Simular evento keydown
            simulateKeyEvent('keydown', key);
            
            // Vibração tátil removida - usuário não quer vibração nos controles
            
            // Efeito visual de vibração
            if (button.classList.contains('action-button') || button.classList.contains('weapon-button')) {
                button.classList.add('vibrate');
                setTimeout(() => button.classList.remove('vibrate'), 100);
            }
        });
        
        // Touch end - simular keyup
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!touchControls.enabled) return;
            
            button.classList.remove('pressed');
            touchControls.activeButtons.delete(key);
            
            // Simular evento keyup
            simulateKeyEvent('keyup', key);
        });
        
        // Prevenir comportamentos padrão
        button.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
        
        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    });
}

// Simular eventos de teclado para os controles touch
function simulateKeyEvent(eventType, keyCode) {
    // Atualizar estado das teclas diretamente
    if (eventType === 'keydown') {
        keys[keyCode] = true;
        
        // Executar ações específicas baseadas na tecla
        handleTouchKeyAction(keyCode, true);
    } else if (eventType === 'keyup') {
        keys[keyCode] = false;
        
        // Executar ações de release
        handleTouchKeyAction(keyCode, false);
    }
}

// Lidar com ações específicas dos controles touch
function handleTouchKeyAction(keyCode, isPressed) {
    if (!isPressed) {
        // Ações de release (keyup)
        if (keyCode === 'ArrowRight' || keyCode === 'ArrowLeft') {
            moving = false;
            backgroundScrolling = false;
        }
        if (keyCode === 'Space') {
            attacking = false;
        }
        if (keyCode === 'KeyD') {
            deactivateShield();
        }
        return;
    }
    
    // Ações de press (keydown)
    switch(keyCode) {
        case 'ArrowRight':
            if (!isInSpecialAnim) {
                moving = true;
                facingRight = true;
                backgroundScrolling = true;
            }
            break;
            
        case 'ArrowLeft':
            if (!isInSpecialAnim) {
                moving = true;
                facingRight = false;
                backgroundScrolling = true;
            }
            break;
            
        case 'ArrowUp':
            // Touch: cada toque em ArrowUp sobe +10°
            aimAngleDisplayDegrees = (aimAngleDisplayDegrees + 10) % 360;
            break;
            
        case 'ArrowDown':
            // Touch: cada toque em ArrowDown desce -10°
            aimAngleDisplayDegrees = (aimAngleDisplayDegrees - 10) % 360;
            if (aimAngleDisplayDegrees < 0) aimAngleDisplayDegrees += 360;
            break;
            
        case 'Space':
            if (!isInSpecialAnim) {
                // Sempre usar shoot() para permitir vários ângulos via combinação de teclas
                shoot();
                attacking = true;
            }
            break;
            
        case 'KeyZ':
            if (!isInSpecialAnim) {
                jump();
            }
            break;
            
        case 'KeyA':
            if (!isInSpecialAnim && chainAttackCooldown === 0) {
                chainAttack('left_hand');
            }
            break;
            
        case 'KeyS':
            // Ataque com corrente (ambas as mãos) - MESMO COMPORTAMENTO DO DESKTOP
            if (!isInSpecialAnim && chainAttackCooldown === 0) {
                chainAttack('both_hands');
            }
            break;
            
        case 'KeyB':
            if (bombCount > 0 && bombCooldown === 0) {
                activateBomb();
            }
            break;
            
            
        case 'KeyM':
            gameAudio.enabled = !gameAudio.enabled;
            console.log('Sons:', gameAudio.enabled ? 'Ligados' : 'Desligados');
            break;
            
        case 'KeyD':
            if (shieldEnergy > 20 && shieldCooldown === 0) {
                activateShield();
            }
            break;
            
        // === SELEÇÃO DE ARMAS ===
        case 'Digit1':
            weaponType = 'normal';
            break;
        case 'Digit2':
            weaponType = 'spread';
            break;
        case 'Digit3':
            weaponType = 'laser';
            break;
        case 'Digit4':
            weaponType = 'machine';
            break;
        case 'Digit5':
            weaponType = 'plasma';
            break;
        case 'Digit6':
            weaponType = 'storm';
            break;
        case 'Digit7':
            weaponType = 'nuclear';
            break;
        case 'Digit8':
            weaponType = 'nuclear'; // Por enquanto, usa a mesma arma nuclear
            break;
    }
}

// Prevenir zoom em dispositivos móveis durante o jogo
function preventMobileZoom() {
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

// Inicializar botão de tela cheia e redimensionamento quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // UI: sliders do mostrador de ângulos
    const opacityInput = document.getElementById('aimOpacity');
    const scaleInput = document.getElementById('aimScale');

    if (opacityInput) {
        // inicial
        opacityInput.value = String(aimIndicatorOpacity);
        opacityInput.addEventListener('input', () => {
            const v = parseFloat(opacityInput.value);
            if (!Number.isNaN(v)) aimIndicatorOpacity = Math.max(0, Math.min(1, v));
        });
    }

    if (scaleInput) {
        scaleInput.value = String(aimIndicatorScale);
        scaleInput.addEventListener('input', () => {
            const v = parseFloat(scaleInput.value);
            if (!Number.isNaN(v)) aimIndicatorScale = Math.max(0.5, Math.min(3, v));
        });
    }
    
    // Inicializar sistema de sons
    initializeSounds();
    
    // Inicializar controles móveis
    initMobileControls();
    
    // Prevenir zoom em dispositivos móveis
    preventMobileZoom();
    
    // Redimensionar canvas inicialmente
    resizeCanvas();
});
