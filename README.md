# 🎮 Juliette Psicose 2D

Um jogo run-and-gun 2D inspirado em Contra, protagonizado pela personagem Juliette com mecânicas avançadas e efeitos visuais cyberpunk.

## 🌟 Características do Jogo

### 🎯 Sistema de Combate Avançado
- **Tiro Multi-direcional**: Atire em 8 direções diferentes com variações aleatórias
- **Armas Progressivas**: 7 tipos de armas (Normal, Spread, Laser, Machine, Plasma, Storm, Nuclear)
- **Sistema de Munição**: Controle de munição limitada para cada arma
- **Ataques Especiais**: Corrente (1 mão e 2 mãos) e bombas devastadoras

### 🛡️ Sistema de Defesa
- **Escudo Inicial**: 60 segundos de proteção total no início do jogo
- **Escudo Recarregável**: Sistema de energia que regenera ao longo do tempo
- **Invulnerabilidade Temporária**: Proteção após receber dano

### 🎭 Sistema de Animações
- **9 Sprites Específicas**: Cada ação tem sua animação única
- **Animações de Tiro**: Diferentes sprites para ângulos de tiro específicos
- **Animações Especiais**: Correntes, celebração, mãos para cima

### 👾 Inimigos Diversos
- **Formas Geométricas**: Inimigos aparecem como quadrados, círculos e triângulos
- **Tipos Variados**: Soldados, robôs e chefões com características únicas
- **Átomos Orbitantes**: Efeito visual de partículas orbitando os inimigos
- **IA Básica**: Padrões de movimento e ataque

### 🌋 Recursos Especiais
- **Disco de Lava Flutuante**: Power-up especial que segue o jogador
- **Bombas**: Destroem todos os inimigos e projéteis na tela
- **Sistema de Fases**: 2 fases com diferentes níveis de resistência

### 🎨 Efeitos Visuais
- **Cyberpunk**: Neon, brilhos piscantes e partículas de energia
- **Plataformas Animadas**: Efeitos de energia correndo pelas plataformas
- **Explosões e Partículas**: Sistema avançado de efeitos visuais
- **Parallax**: Fundo com scroll infinito

### 🤖 Integração com IA
- **Gemini AI**: Sistema dinâmico que modifica cenário baseado no progresso
- **Geração Procedural**: Ajustes automáticos de plataformas e temas

### 📱 Sistema de FPS Otimizado
- **Detecção Automática**: Identifica dispositivos móveis automaticamente
- **FPS Adaptativo**: 60 FPS para Desktop, 45 FPS para Mobile
- **Otimização Mobile**: Performance otimizada para smartphones e tablets
- **Controle Temporal**: Sistema preciso de throttling de frames

## 🎮 Controles

### Básicos
- `←→`: Mover
- `Z`: Pular
- `X/SPACE`: Atirar
- `↑+X`: Atirar para cima
- `↓+X`: Atirar para baixo
- `↗+X`: Atirar diagonal

### Especiais
- `A`: Corrente (1 mão)
- `S`: Corrente (2 mãos)
- `B`: Bomba
- `C`: Celebração
- `D`: Escudo
- `L`: Disco de Lava

### Sistema
- `P`: Pausar
- `M`: Som On/Off
- `H`: Mostrar/Ocultar Controles
- `F11`: Tela Cheia
- `R`: Reiniciar (Game Over)

### Cheats de Armas
- `1-4`: Armas básicas
- `5-7`: Armas avançadas

## 🚀 Sistema de Fases

### Fase 1 (0-5 minutos)
- Resistência: 10 tiros para morrer
- Escudo inicial ativo
- Aprendizado das mecânicas

### Fase 2 (após 5 minutos)
- Resistência: 1000 tiros para morrer
- Desafio extremo
- Fundo diferenciado

## 📁 Estrutura do Projeto

```
Juliette-Psicose-2D/
├── assets/                 # Sprites e recursos visuais
├── game.js                # Motor principal do jogo
├── gemini_integration.js  # Integração com IA Gemini
├── index.html            # Arquivo principal
├── style.css             # Estilos e interface
└── sound_generator.html  # Gerador de sons
```

## 🛠️ Tecnologias

- **HTML5 Canvas**: Renderização gráfica
- **JavaScript ES6+**: Lógica do jogo
- **Web Audio API**: Sistema de som
- **Google Gemini AI**: Geração dinâmica de conteúdo
- **CSS3**: Interface e responsividade

## 🎯 Recursos Técnicos

- **FPS Adaptativo**: 60 FPS (Desktop) / 45 FPS (Mobile) com detecção automática
- **Otimização Mobile**: Sistema inteligente de performance para dispositivos móveis
- **Redimensionamento Automático**: Adapta-se a diferentes resoluções
- **Sistema de Colisão**: Detecção precisa de colisões
- **Gerenciamento de Estado**: Sistema robusto de controle de jogo
- **Pool de Objetos**: Otimização de performance para partículas
- **Detecção de Dispositivo**: User Agent + Touch Points + Touch Events

## 🎨 Assets Necessários

- Spritesheet da Juliette (9 poses diferentes)
- Fundos para fase 1 e fase 2
- Cena de primeiro plano
- Sons (opcionais, com fallback para Web Audio)

## 🚀 Como Executar

1. Clone o repositório
2. Configure a API key do Gemini (opcional)
3. Abra `index.html` em um navegador moderno
4. Enjoy!

## 📈 Estatísticas do Projeto

- **+2500 linhas** de código JavaScript
- **9 sprites** específicas da protagonista
- **7 tipos** de armas
- **3 formas** geométricas para inimigos
- **2 fases** com mecânicas diferentes
- **Sistema completo** de HUD e controles
- **Sistema de FPS** adaptativo para Mobile/Desktop
- **Detecção automática** de tipo de dispositivo

---

**Desenvolvido com ❤️ por Julio Campos Machado**

*Um tributo aos clássicos jogos run-and-gun dos anos 90, com tecnologia moderna!*

<img width="1365" height="767" alt="image" src="https://github.com/user-attachments/assets/d463e768-ca0c-4bee-a86f-24bd83e2d642" />

