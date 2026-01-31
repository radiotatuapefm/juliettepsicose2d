from PIL import Image, ImageOps
import os

def create_spritesheet():
    """
    Processa as imagens 'sprites 2.png' e 'sprites 3.png' para criar um spritesheet animado
    com mais frames de caminhada (Transparência já removida pelo usuário)
    """
    
    # Caminhos
    input_path1 = "assets/sprites 2.png"
    input_path2 = "assets/sprites 3.png"
    output_path = "assets/juliette_animated_spritesheet.png"
    
    print(f"Processando: {input_path1} e {input_path2}")
    
    # Verifica se os arquivos existem
    for path in [input_path1, input_path2]:
        if not os.path.exists(path):
            print(f"Erro: Arquivo {path} não encontrado!")
            return False
    
    # Configurações do frame e grid (6 frames walk + 4 frames attack = 10 total)
    frame_w, frame_h = 48, 64
    cols = 6  # 6 colunas para caminhada suave
    rows = 2  # 2 linhas: walk (linha 0) e attack (linha 1)
    sheet_w, sheet_h = frame_w * cols, frame_h * rows
    
    print(f"Dimensões do spritesheet: {sheet_w}x{sheet_h}")
    print(f"Frames: {cols}x{rows} ({frame_w}x{frame_h} cada)")
    print(f"- Linha 0: 6 frames de caminhada")
    print(f"- Linha 1: 4 frames de ataque + 2 extras")
    
    # Carrega imagens originais
    try:
        sprite2 = Image.open(input_path1).convert("RGBA")
        sprite3 = Image.open(input_path2).convert("RGBA")
        print(f"Sprite 2 carregado: {sprite2.size}")
        print(f"Sprite 3 carregado: {sprite3.size}")
    except Exception as e:
        print(f"Erro ao carregar imagens: {e}")
        return False
    
    # Redimensiona mantendo proporções pixel art
    sprite2_resized = sprite2.resize((frame_w, frame_h), resample=Image.NEAREST)
    sprite3_resized = sprite3.resize((frame_w, frame_h), resample=Image.NEAREST)
    print(f"Imagens redimensionadas para: {frame_w}x{frame_h}")
    
    # Cria o spritesheet
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    
    # Preenche o spritesheet
    create_walk_frames(sheet, sprite2_resized, sprite3_resized, frame_w, frame_h)
    create_attack_frames(sheet, sprite2_resized, frame_w, frame_h)
    
    # Salva o spritesheet
    try:
        sheet.save(output_path)
        print(f"Spritesheet salvo em: {output_path}")
        return True
    except Exception as e:
        print(f"Erro ao salvar: {e}")
        return False

def create_walk_frames(sheet, sprite2, sprite3, frame_w, frame_h):
    """
    Cria 6 frames de caminhada alternando entre sprite2 e sprite3 com variações
    """
    print("Criando frames de caminhada...")
    
    walk_variations = [
        # Frame 0: Sprite2 base (posição neutra)
        (sprite2, 0, 0, 0),
        # Frame 1: Sprite3 com leve movimento para frente (pé esquerdo)
        (sprite3, 1, 0, 0),
        # Frame 2: Sprite2 com movimento intermediário
        (sprite2, -1, 0, 1),
        # Frame 3: Sprite3 com movimento máximo (pé direito)
        (sprite3, 0, 0, -2),
        # Frame 4: Sprite2 com movimento de volta
        (sprite2, 1, 0, 1),
        # Frame 5: Sprite3 volta ao início (ciclo)
        (sprite3, 0, 0, 0)
    ]
    
    row = 0  # Linha da caminhada
    for col, (base_sprite, offset_x, offset_y, rotation) in enumerate(walk_variations):
        # Aplica transformações ao sprite
        frame = apply_walk_transformation(base_sprite, offset_x, offset_y, rotation)
        
        # Posição no spritesheet
        x = col * frame_w
        y = row * frame_h
        
        # Cola o frame no spritesheet
        sheet.paste(frame, (x, y))
        print(f"  Frame {col}: {base_sprite.size} -> posição ({x}, {y})")

def create_attack_frames(sheet, sprite_base, frame_w, frame_h):
    """
    Cria 4 frames de ataque + 2 extras na segunda linha
    """
    print("Criando frames de ataque...")
    
    attack_variations = [
        # 4 frames principais de ataque
        (0, 5),    # Frame 0: preparação
        (2, 10),   # Frame 1: ataque inicial
        (-3, -15), # Frame 2: ataque máximo
        (1, 3),    # Frame 3: recuperação
        # 2 frames extras
        (0, 0),    # Frame 4: neutro
        (1, 8)     # Frame 5: variação
    ]
    
    row = 1  # Linha do ataque
    for col, (offset_x, rotation) in enumerate(attack_variations):
        # Aplica transformações de ataque
        frame = apply_attack_transformation(sprite_base, offset_x, rotation)
        
        # Posição no spritesheet
        x = col * frame_w
        y = row * frame_h
        
        # Cola o frame no spritesheet
        sheet.paste(frame, (x, y))
        print(f"  Frame {col}: ataque -> posição ({x}, {y})")

def apply_walk_transformation(sprite, offset_x, offset_y, rotation):
    """
    Aplica transformações sutis para animação de caminhada
    """
    img = sprite.copy()
    
    # Aplica rotação se necessário
    if rotation != 0:
        img = img.rotate(rotation, expand=False, fillcolor=(0, 0, 0, 0))
    
    # Aplica transformação de posição
    if offset_x != 0 or offset_y != 0:
        # Matriz de transformação afim: (a, b, c, d, e, f)
        # onde: x' = a*x + b*y + c, y' = d*x + e*y + f
        transform_matrix = (1, 0, offset_x, 0, 1, offset_y)
        img = img.transform(img.size, Image.AFFINE, transform_matrix, fillcolor=(0, 0, 0, 0))
    
    return img

def apply_attack_transformation(sprite, offset_x, rotation):
    """
    Aplica transformações para animação de ataque
    """
    img = sprite.copy()
    
    # Aplica rotação para simular movimento de ataque
    if rotation != 0:
        img = img.rotate(rotation, expand=False, fillcolor=(0, 0, 0, 0))
    
    # Aplica offset horizontal para simular impulso
    if offset_x != 0:
        transform_matrix = (1, 0, offset_x, 0, 1, 0)
        img = img.transform(img.size, Image.AFFINE, transform_matrix, fillcolor=(0, 0, 0, 0))
    
    return img

def create_animation_frame(base_img, col, row):
    """
    Cria variações do frame para simular animação
    """
    img = base_img.copy()
    
    # Primeira linha: frames de caminhada
    if row == 0:
        if col == 1:
            # Frame 2: leve movimento
            img = img.transform(img.size, Image.AFFINE, (1, 0, 1, 0, 1, 0))
        elif col == 2:
            # Frame 3: movimento maior
            img = img.transform(img.size, Image.AFFINE, (1, 0, -1, 0, 1, 1))
        elif col == 3:
            # Frame 4: volta à posição
            img = img.transform(img.size, Image.AFFINE, (1, 0, 0, 0, 1, -1))
    
    # Segunda linha: frames de ataque
    elif row == 1:
        if col == 1:
            # Frame de ataque 1: rotação leve
            img = img.rotate(5, expand=False, fillcolor=(0, 0, 0, 0))
        elif col == 2:
            # Frame de ataque 2: rotação maior
            img = img.rotate(-10, expand=False, fillcolor=(0, 0, 0, 0))
        elif col == 3:
            # Frame de ataque 3: volta ao normal
            img = img.rotate(2, expand=False, fillcolor=(0, 0, 0, 0))
    
    return img

def main():
    """
    Função principal
    """
    print("=== Processador de Sprites - Juliette Psicose 2D ===")
    print("Criando spritesheet animado (sem processamento de transparência)...")
    
    if create_spritesheet():
        print("\n✅ Spritesheet criado com sucesso!")
        print("🎮 Agora você pode usar 'juliette_animated_spritesheet.png' no jogo")
        print("🚶‍♀️ 6 frames de caminhada + 6 frames de ataque = animação mais fluida!")
    else:
        print("\n❌ Erro ao criar spritesheet")

if __name__ == "__main__":
    main()
