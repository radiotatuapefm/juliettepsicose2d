// =====================================================
// SISTEMA DE INTEGRAÇÃO COM GOOGLE GEMINI API
// =====================================================

// Configuração da API Gemini
const GEMINI_CONFIG = {
    API_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
    API_KEY: "AIzaSyBTjtqSv8T3yqjYn_vXgYaKZAr3DUQgS2s",
    timeout: 10000 // 10 segundos de timeout
};

// Estado do sistema Gemini
const geminiState = {
    lastRequestTime: 0,
    requestCooldown: 5000, // 5 segundos entre requests
    isRequesting: false,
    requestQueue: [],
    bossQueue: [],
    scenarioDescriptions: []
};

// =====================================================
// SISTEMA DE REQUISIÇÕES À API GEMINI
// =====================================================

/**
 * Faz uma requisição à API Gemini
 * @param {string} prompt - Texto do prompt para enviar à IA
 * @param {string} type - Tipo de requisição ('boss' ou 'scenario')
 */
async function requestGeminiContent(prompt, type = 'boss') {
    // Verificar cooldown
    const now = Date.now();
    if (now - geminiState.lastRequestTime < geminiState.requestCooldown) {
        console.log(`⏳ Gemini em cooldown. Aguarde ${Math.ceil((geminiState.requestCooldown - (now - geminiState.lastRequestTime)) / 1000)} segundos.`);
        return null;
    }

    if (geminiState.isRequesting) {
        console.log("⏳ Gemini já processando uma requisição...");
        return null;
    }

    geminiState.isRequesting = true;
    geminiState.lastRequestTime = now;

    const requestData = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }]
    };

    try {
        console.log(`🧠 Enviando requisição para Gemini (${type}):`, prompt.substring(0, 100) + "...");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GEMINI_CONFIG.timeout);

        const response = await fetch(`${GEMINI_CONFIG.API_URL}?key=${GEMINI_CONFIG.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const content = data.candidates[0].content.parts[0].text;
            console.log(`✅ Resposta Gemini (${type}):`, content.substring(0, 150) + "...");
            
            // Processar resposta baseado no tipo
            if (type === 'boss') {
                processBossResponse(content);
            } else if (type === 'scenario') {
                processScenarioResponse(content);
            }
            
            return content;
        } else {
            throw new Error("Resposta inválida da API");
        }

    } catch (error) {
        console.error("❌ Erro na requisição Gemini:", error.message);
        
        // Fallback para conteúdo local se API falhar
        if (type === 'boss') {
            generateFallbackBoss();
        }
        
        return null;
    } finally {
        geminiState.isRequesting = false;
    }
}

// =====================================================
// SISTEMA DE GERAÇÃO DE CHEFÕES
// =====================================================

/**
 * Gera prompt para criação de chefão
 */
function generateBossPrompt() {
    const bossNumber = Math.floor((gameState.enemiesDefeated || 0) / 10) + 1;
    const currentLevel = gameState.level || 1;
    const currentScore = gameState.score || 0;
    
    const themes = [
        "cibernético com implantes tecnológicos",
        "mutante com habilidades especiais",
        "robô de guerra avançado",
        "criatura alienígena hostil",
        "soldado modificado geneticamente",
        "máquina de guerra industrial",
        "entidade digital materializada",
        "híbrido orgânico-mecânico"
    ];
    
    const selectedTheme = themes[Math.floor(Math.random() * themes.length)];
    
    return `Crie um chefão único para um jogo de tiro 2D no estilo Contra. 

CONTEXTO DO JOGO:
- Chefão número: ${bossNumber}
- Nível atual: ${currentLevel}
- Pontuação: ${currentScore}
- Tema sugerido: ${selectedTheme}

REQUISITOS:
1. Nome épico e intimidador
2. Descrição visual marcante (cores, forma, tamanho)
3. 2-3 ataques especiais únicos
4. Fraqueza específica
5. Som/efeito sonoro característico
6. Frase de entrada ameaçadora

FORMATO DE RESPOSTA (JSON):
{
  "name": "Nome do chefão",
  "description": "Descrição visual detalhada",
  "color": "Cor principal em hexadecimal",
  "size": "Tamanho relativo (50-100)",
  "attacks": [
    {"name": "Nome do ataque", "description": "Como funciona"},
    {"name": "Segundo ataque", "description": "Mecânica do ataque"}
  ],
  "weakness": "Ponto fraco específico",
  "sound": "Descrição do som característico",
  "entrance": "Frase de entrada intimidadora",
  "difficulty": "Nível de dificuldade (1-10)"
}

Seja criativo e único! Crie algo memorável e desafiador.`;
}

/**
 * Gera prompt para descrição de cenário
 */
function generateScenarioPrompt() {
    const themes = [
        "cidade futurística em ruínas",
        "complexo industrial abandonado",
        "laboratório científico secreto", 
        "base militar subterrânea",
        "estação espacial danificada",
        "zona de exclusão radioativa",
        "distrito cyberpunk noturno",
        "fábrica de robôs infectada"
    ];
    
    const selectedTheme = themes[Math.floor(Math.random() * themes.length)];
    
    return `Descreva uma nova "tela" ou cenário para um jogo de ação 2D no estilo Contra.

TEMA: ${selectedTheme}
NÍVEL: ${gameState.level || 1}
INIMIGOS DERROTADOS: ${gameState.enemiesDefeated || 0}

Crie uma descrição atmosférica e imersiva em 2-3 parágrafos que será exibida ao jogador. 
Inclua:
- Ambiente visual
- Atmosfera e mood
- Perigos ambientais
- Elementos narrativos interessantes

Seja cinematográfico e envolvente!`;
}

/**
 * Processa resposta de chefão da API
 */
function processBossResponse(content) {
    try {
        // Tentar extrair JSON da resposta
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const bossData = JSON.parse(jsonMatch[0]);
            geminiState.bossQueue.push(bossData);
            console.log("🎯 Chefão Gemini adicionado à fila:", bossData.name);
        } else {
            // Se não houver JSON válido, criar dados básicos
            const bossData = extractBossDataFromText(content);
            geminiState.bossQueue.push(bossData);
        }
    } catch (error) {
        console.error("❌ Erro ao processar chefão Gemini:", error);
        generateFallbackBoss();
    }
}

/**
 * Extrai dados de chefão de texto livre (fallback)
 */
function extractBossDataFromText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    
    return {
        name: extractValue(text, 'name', 'Nome') || `Chefão Gemini #${Date.now()}`,
        description: lines[0] || "Um chefão poderoso e ameaçador gerado pela IA",
        color: extractValue(text, 'color', 'cor') || '#8B00FF',
        size: parseInt(extractValue(text, 'size', 'tamanho')) || 80,
        attacks: [
            {name: "Ataque Especial", description: "Ataque poderoso único"},
            {name: "Rajada Intensa", description: "Múltiplos projéteis"}
        ],
        weakness: extractValue(text, 'weakness', 'fraqueza') || "Ataques concentrados",
        sound: extractValue(text, 'sound', 'som') || "Rugido metálico intimidador",
        entrance: extractValue(text, 'entrance', 'frase') || "Prepare-se para a destruição!",
        difficulty: parseInt(extractValue(text, 'difficulty', 'dificuldade')) || 7,
        geminiGenerated: true
    };
}

/**
 * Extrai valor específico do texto
 */
function extractValue(text, key, altKey) {
    const patterns = [
        new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, 'i'),
        new RegExp(`${key}\\s*:\\s*([^,\n]+)`, 'i'),
        new RegExp(`${altKey}\\s*:\\s*([^,\n]+)`, 'i')
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }
    return null;
}

/**
 * Processa resposta de cenário da API
 */
function processScenarioResponse(content) {
    geminiState.scenarioDescriptions.push({
        content: content,
        timestamp: Date.now(),
        level: gameState.level || 1,
        enemiesDefeated: gameState.enemiesDefeated || 0
    });
    
    // Mostrar descrição do cenário
    displayScenarioDescription(content);
    
    console.log("🎬 Nova descrição de cenário adicionada");
}

/**
 * Gera chefão de fallback se API falhar
 */
function generateFallbackBoss() {
    const fallbackBosses = [
        {
            name: "Titã Destruidor",
            description: "Robô gigante com armadura pesada e canhões duplos",
            color: '#FF0000',
            size: 90,
            attacks: [
                {name: "Rajada Infernal", description: "Múltiplos mísseis teleguiados"},
                {name: "Laser Devastador", description: "Raio laser concentrado"}
            ],
            weakness: "Núcleo energético exposto",
            sound: "Rugido mecânico ensurdecedor",
            entrance: "Sua destruição é inevitável!",
            difficulty: 8,
            isFallback: true
        },
        {
            name: "Hydra Cibernética",
            description: "Criatura com múltiplas cabeças mecânicas e tentáculos",
            color: '#00FF88',
            size: 85,
            attacks: [
                {name: "Toxinas Digitais", description: "Projéteis venenosos"},
                {name: "Tentáculos Elétricos", description: "Ataques de alcance"}
            ],
            weakness: "Cabeça central",
            sound: "Silvo eletrônico perturbador",
            entrance: "Múltiplas ameaças, uma destruição!",
            difficulty: 7,
            isFallback: true
        }
    ];
    
    const selectedBoss = fallbackBosses[Math.floor(Math.random() * fallbackBosses.length)];
    geminiState.bossQueue.push(selectedBoss);
    console.log("🔧 Chefão fallback adicionado:", selectedBoss.name);
}

// =====================================================
// INTEGRAÇÃO COM O JOGO PRINCIPAL
// =====================================================

/**
 * Solicita geração de chefão via Gemini (chamada principal)
 */
function requestGeminiScreenUpdate() {
    console.log("🧠 Solicitando atualização de tela via Gemini...");
    
    // Gerar chefão
    const bossPrompt = generateBossPrompt();
    requestGeminiContent(bossPrompt, 'boss');
    
    // Gerar cenário (com delay)
    setTimeout(() => {
        const scenarioPrompt = generateScenarioPrompt();
        requestGeminiContent(scenarioPrompt, 'scenario');
    }, 2000);
}

/**
 * Spawna chefão da fila Gemini
 */
function queueBossSpawn() {
    console.log("👾 Preparando spawn de chefão...");
    
    // Se não há chefão na fila, usar fallback
    if (geminiState.bossQueue.length === 0) {
        generateFallbackBoss();
    }
    
    // Agendar spawn do chefão após um delay dramático
    setTimeout(() => {
        spawnGeminiBoss();
    }, 3000);
}

/**
 * Cria chefão baseado nos dados Gemini
 */
function spawnGeminiBoss() {
    if (geminiState.bossQueue.length === 0) {
        console.error("❌ Nenhum chefão na fila para spawnar");
        return;
    }
    
    const bossData = geminiState.bossQueue.shift(); // Remove da fila
    console.log("🔥 SPAWNING GEMINI BOSS:", bossData.name);
    
    // Criar chefão especial com dados da Gemini
    const boss = {
        x: CANVAS_WIDTH + 50,
        y: Math.random() * (CANVAS_HEIGHT - 300) + 150,
        vx: -0.5, // Mais lento que inimigos normais
        vy: Math.sin(Date.now() * 0.001) * 2,
        health: 1000, // Muito mais resistente
        maxHealth: 1000,
        damage: 45,
        color: bossData.color || '#8B00FF',
        size: Math.max(60, Math.min(100, bossData.size || 80)),
        type: 'gemini_boss',
        isBoss: true,
        
        // Dados específicos do Gemini
        geminiData: bossData,
        
        // Atributos especiais do chefão
        shootChance: 0.08, // Atira mais frequentemente
        shootCooldown: 0,
        
        // Sistema de ataques especiais
        specialAttackCooldown: 0,
        specialAttackTimer: 300, // 5 segundos
        
        // Padrão de movimento especial
        movementPattern: 0,
        movementTimer: 0,
        
        // Átomos orbitantes melhorados
        atomOrbs: {
            count: 6, // Mais átomos que inimigos normais
            orbs: [],
            rotationSpeed: 0.02,
            radius: 60,
            initialized: false
        },
        
        // Efeitos visuais especiais
        aura: {
            intensity: 0,
            phase: 0,
            particles: []
        }
    };
    
    // Inicializar sistemas especiais do chefão
    initializeGeminiBoss(boss);
    
    // Adicionar à lista de inimigos
    enemies.push(boss);
    
    // Anunciar chegada do chefão
    announceBossArrival(bossData);
    
    // Som especial de spawn
    playSound('enemyDestroy', 100, 1000);
    
    console.log(`🎯 Chefão '${bossData.name}' spawnado com sucesso!`);
}

/**
 * Inicializa sistemas especiais do chefão Gemini
 */
function initializeGeminiBoss(boss) {
    // Inicializar átomos orbitantes especiais
    initializeEnemyAtoms(boss);
    
    // Efeitos visuais especiais
    boss.aura.particles = [];
    
    // Padrão de movimento único
    boss.movementPattern = Math.floor(Math.random() * 3); // 0: horizontal, 1: senoidal, 2: circular
    
    console.log(`⚡ Sistemas especiais do chefão ${boss.geminiData.name} inicializados`);
}

/**
 * Anuncia chegada do chefão
 */
function announceBossArrival(bossData) {
    // Criar efeito visual de anúncio
    createBossAnnouncementEffect(bossData.name, bossData.entrance);
    
    // Log de anúncio
    console.log(`🚨 ===== CHEFÃO CHEGOU =====`);
    console.log(`👾 Nome: ${bossData.name}`);
    console.log(`💬 Frase: "${bossData.entrance}"`);
    console.log(`🎯 Dificuldade: ${bossData.difficulty}/10`);
    console.log(`🔧 Fonte: ${bossData.geminiGenerated ? 'Gemini AI' : 'Fallback'}`);
    console.log(`🚨 ==========================`);
}

/**
 * Cria efeito visual de anúncio do chefão
 */
function createBossAnnouncementEffect(bossName, entrance) {
    // Criar partículas especiais de anúncio
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 120,
            color: '#FFD700',
            size: Math.random() * 6 + 2,
            type: 'boss_announcement'
        });
    }
    
    // TODO: Adicionar texto de anúncio na tela
    // displayBossText(bossName, entrance);
}

// Estado do overlay de cenário
const scenarioOverlay = {
    active: false,
    content: '',
    timer: 0,
    maxTimer: 600, // 10 segundos
    alpha: 0,
    fadeSpeed: 0.02
};

/**
 * Exibe descrição de cenário na tela
 */
function displayScenarioDescription(description) {
    console.log("🎬 NOVA TELA GEMINI:");
    console.log("════════════════════");
    console.log(description);
    console.log("════════════════════");
    
    // Ativar overlay visual
    scenarioOverlay.active = true;
    scenarioOverlay.content = description;
    scenarioOverlay.timer = scenarioOverlay.maxTimer;
    scenarioOverlay.alpha = 0;
}

// =====================================================
// SISTEMA DE ATUALIZAÇÃO CONTÍNUA
// =====================================================

/**
 * Atualiza sistemas Gemini (chamada no loop principal do jogo)
 */
function updateGeminiSystems() {
    // Atualizar chefões especiais na tela
    updateGeminiBosses();
    
    // Atualizar overlay de cenário
    updateScenarioOverlay();
    
    // Processar fila de requisições se necessário
    processGeminiQueue();
}

/**
 * Atualiza chefões Gemini especiais
 */
function updateGeminiBosses() {
    for (let boss of enemies) {
        if (boss.type === 'gemini_boss') {
            updateGeminiBossAI(boss);
            updateGeminiBossVisuals(boss);
        }
    }
}

/**
 * IA avançada para chefões Gemini
 */
function updateGeminiBossAI(boss) {
    // Movimento especial baseado no padrão
    boss.movementTimer++;
    
    switch (boss.movementPattern) {
        case 0: // Movimento horizontal simples
            boss.vy = 0;
            break;
        case 1: // Movimento senoidal
            boss.vy = Math.sin(boss.movementTimer * 0.02) * 3;
            break;
        case 2: // Movimento circular
            boss.vy = Math.cos(boss.movementTimer * 0.03) * 2;
            boss.vx = -0.5 + Math.sin(boss.movementTimer * 0.03) * 0.3;
            break;
    }
    
    // Sistema de ataques especiais
    if (boss.specialAttackCooldown > 0) {
        boss.specialAttackCooldown--;
    } else if (boss.specialAttackTimer > 0) {
        boss.specialAttackTimer--;
    } else {
        // Executar ataque especial
        executeGeminiBossSpecialAttack(boss);
        boss.specialAttackTimer = 180 + Math.random() * 120; // 3-5 segundos
        boss.specialAttackCooldown = 60; // 1 segundo de cooldown
    }
    
    // Ataques normais mais frequentes
    if (Math.random() < boss.shootChance && boss.shootCooldown === 0) {
        createGeminiBossProjectile(boss);
        boss.shootCooldown = 30 + Math.random() * 30; // Intervalo variável
    }
    
    if (boss.shootCooldown > 0) boss.shootCooldown--;
}

/**
 * Executa ataque especial do chefão
 */
function executeGeminiBossSpecialAttack(boss) {
    const attacks = boss.geminiData.attacks || [];
    if (attacks.length === 0) return;
    
    const selectedAttack = attacks[Math.floor(Math.random() * attacks.length)];
    
    console.log(`⚡ ${boss.geminiData.name} usa ${selectedAttack.name}!`);
    
    // Implementar diferentes tipos de ataques especiais
    switch (selectedAttack.name.toLowerCase()) {
        case 'rajada infernal':
        case 'rajada':
        case 'múltiplos':
            createMultiProjectileAttack(boss);
            break;
        case 'laser':
        case 'raio':
            createLaserAttack(boss);
            break;
        case 'míssil':
        case 'missile':
            createMissileAttack(boss);
            break;
        default:
            // Ataque especial genérico - rajada tripla
            createTripleProjectileAttack(boss);
            break;
    }
    
    // Som especial baseado na descrição
    playSound('chainAttack', 180, 600);
}

/**
 * Cria projétil especial do chefão
 */
function createGeminiBossProjectile(boss) {
    const centerX = boss.x + boss.size / 2;
    const centerY = boss.y + boss.size / 2;
    
    // Projétil mais poderoso e visualmente distintivo
    bullets.push({
        x: centerX,
        y: centerY,
        vx: -6, // Mais rápido que projéteis normais
        vy: (Math.random() - 0.5) * 4,
        damage: boss.damage,
        color: boss.color,
        type: 'gemini_boss_bullet',
        size: 5, // Maior que projéteis normais
        life: 150,
        trail: [], // Para rastro visual
        glowIntensity: 1.0
    });
}

/**
 * Ataque multi-projétil
 */
function createMultiProjectileAttack(boss) {
    const centerX = boss.x + boss.size / 2;
    const centerY = boss.y + boss.size / 2;
    
    // Criar 5 projéteis em leque
    for (let i = 0; i < 5; i++) {
        const angle = -45 + (i * 22.5); // -45° a +45°
        const angleRad = (angle * Math.PI) / 180;
        
        bullets.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angleRad) * -8,
            vy: Math.sin(angleRad) * 8,
            damage: boss.damage * 0.8,
            color: boss.color,
            type: 'gemini_boss_special',
            size: 6,
            life: 120,
            explosive: true
        });
    }
}

/**
 * Ataque triplo
 */
function createTripleProjectileAttack(boss) {
    const centerX = boss.x + boss.size / 2;
    const centerY = boss.y + boss.size / 2;
    
    // Três projéteis: reto, diagonal cima, diagonal baixo
    const angles = [0, -30, 30];
    
    for (let angle of angles) {
        const angleRad = (angle * Math.PI) / 180;
        bullets.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angleRad) * -7,
            vy: Math.sin(angleRad) * 7,
            damage: boss.damage,
            color: boss.color,
            type: 'gemini_boss_special',
            size: 5,
            life: 140
        });
    }
}

/**
 * Ataque laser (placeholder)
 */
function createLaserAttack(boss) {
    // Implementação simplificada - laser como projétil largo
    const centerX = boss.x + boss.size / 2;
    const centerY = boss.y + boss.size / 2;
    
    bullets.push({
        x: centerX,
        y: centerY,
        vx: -12,
        vy: 0,
        damage: boss.damage * 1.5,
        color: '#FF00FF',
        type: 'laser',
        size: 15,
        life: 80,
        piercing: true
    });
}

/**
 * Ataque de míssil (placeholder)  
 */
function createMissileAttack(boss) {
    // Míssil teleguiado simplificado
    const centerX = boss.x + boss.size / 2;
    const centerY = boss.y + boss.size / 2;
    
    bullets.push({
        x: centerX,
        y: centerY,
        vx: -4,
        vy: 0,
        damage: boss.damage * 2,
        color: '#FF8800',
        type: 'missile',
        size: 8,
        life: 200,
        explosive: true,
        homing: true // Para implementação futura
    });
}

/**
 * Atualiza visuais especiais dos chefões Gemini
 */
function updateGeminiBossVisuals(boss) {
    // Atualizar aura especial
    boss.aura.phase += 0.05;
    boss.aura.intensity = Math.sin(boss.aura.phase) * 0.5 + 0.5;
    
    // Gerar partículas de aura
    if (Math.random() < 0.3) {
        const angle = Math.random() * Math.PI * 2;
        const radius = boss.size + 20;
        
        boss.aura.particles.push({
            x: boss.x + boss.size/2 + Math.cos(angle) * radius,
            y: boss.y + boss.size/2 + Math.sin(angle) * radius,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            life: 60,
            size: Math.random() * 4 + 2,
            color: boss.color
        });
    }
    
    // Atualizar partículas de aura
    for (let i = boss.aura.particles.length - 1; i >= 0; i--) {
        const particle = boss.aura.particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        if (particle.life <= 0) {
            boss.aura.particles.splice(i, 1);
        }
    }
}

/**
 * Atualiza overlay de cenário
 */
function updateScenarioOverlay() {
    if (!scenarioOverlay.active) return;
    
    // Atualizar timer
    if (scenarioOverlay.timer > 0) {
        scenarioOverlay.timer--;
    }
    
    // Controlar fade in/out
    if (scenarioOverlay.timer > scenarioOverlay.maxTimer * 0.8) {
        // Fade in (primeiros 20%)
        scenarioOverlay.alpha = Math.min(1, scenarioOverlay.alpha + scenarioOverlay.fadeSpeed * 3);
    } else if (scenarioOverlay.timer < scenarioOverlay.maxTimer * 0.2) {
        // Fade out (últimos 20%)
        scenarioOverlay.alpha = Math.max(0, scenarioOverlay.alpha - scenarioOverlay.fadeSpeed * 2);
    } else {
        // Totalmente visível
        scenarioOverlay.alpha = Math.min(1, scenarioOverlay.alpha + scenarioOverlay.fadeSpeed);
    }
    
    // Desativar quando timer acabar
    if (scenarioOverlay.timer <= 0) {
        scenarioOverlay.active = false;
        scenarioOverlay.alpha = 0;
    }
}

/**
 * Renderiza overlay de cenário na tela
 */
function drawScenarioOverlay() {
    if (!scenarioOverlay.active || scenarioOverlay.alpha <= 0) return;
    
    const ctx = document.getElementById('gameCanvas').getContext('2d');
    if (!ctx) return;
    
    ctx.save();
    ctx.globalAlpha = scenarioOverlay.alpha;
    
    // Fundo semi-transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Borda decorativa
    const margin = 50;
    const panelWidth = Math.min(CANVAS_WIDTH - margin * 2, 800);
    const panelHeight = Math.min(CANVAS_HEIGHT - margin * 2, 400);
    const panelX = (CANVAS_WIDTH - panelWidth) / 2;
    const panelY = (CANVAS_HEIGHT - panelHeight) / 2;
    
    // Painel principal
    ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    // Borda brilhante
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Título
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎬 NOVA TELA GEMINI', CANVAS_WIDTH / 2, panelY + 40);
    
    // Conteúdo
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    
    // Quebrar texto em linhas
    const maxWidth = panelWidth - 60;
    const lines = wrapText(ctx, scenarioOverlay.content, maxWidth);
    const lineHeight = 22;
    const startY = panelY + 80;
    
    for (let i = 0; i < lines.length && i < 12; i++) {
        ctx.fillText(lines[i], panelX + 30, startY + i * lineHeight);
    }
    
    // Indicador de progresso
    const progressWidth = panelWidth - 60;
    const progressHeight = 4;
    const progressX = panelX + 30;
    const progressY = panelY + panelHeight - 30;
    
    // Fundo da barra
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
    
    // Progresso
    const progress = 1 - (scenarioOverlay.timer / scenarioOverlay.maxTimer);
    ctx.fillStyle = '#00FFFF';
    ctx.fillRect(progressX, progressY, progressWidth * progress, progressHeight);
    
    // Instrução
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Esta mensagem desaparecerá automaticamente', CANVAS_WIDTH / 2, panelY + panelHeight - 10);
    
    ctx.restore();
}

/**
 * Quebra texto em linhas para caber na largura especificada
 */
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (let word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

/**
 * Processa fila de requisições Gemini
 */
function processGeminiQueue() {
    // Implementação futura para fila de requisições pendentes
    // Por enquanto, requisições são feitas diretamente
}

// =====================================================
// FUNÇÕES DE DEBUG E CONTROLE
// =====================================================

/**
 * Força spawn de chefão para teste
 */
function debugSpawnGeminiBoss() {
    console.log("🔧 DEBUG: Forçando spawn de chefão Gemini");
    generateFallbackBoss();
    queueBossSpawn();
}

/**
 * Força requisição Gemini para teste
 */
function debugRequestGemini() {
    console.log("🔧 DEBUG: Forçando requisição Gemini");
    requestGeminiScreenUpdate();
}

/**
 * Mostra status do sistema Gemini
 */
function debugGeminiStatus() {
    console.log("🔧 STATUS GEMINI:");
    console.log("- Requisitando:", geminiState.isRequesting);
    console.log("- Chefões na fila:", geminiState.bossQueue.length);
    console.log("- Cenários salvos:", geminiState.scenarioDescriptions.length);
    console.log("- Último request:", new Date(geminiState.lastRequestTime).toLocaleTimeString());
}

// =====================================================
// EXPORTAR FUNÇÕES PRINCIPAIS
// =====================================================

// As funções principais que serão chamadas do jogo:
// - requestGeminiScreenUpdate() - Chama quando 10 inimigos forem derrotados
// - queueBossSpawn() - Agenda spawn de chefão
// - updateGeminiSystems() - Chama no loop principal do jogo

console.log("✅ Sistema Gemini carregado e pronto!");
