import os
from PIL import Image

def check_assets():
    """
    Verifica se todos os assets necessários estão presentes e com as dimensões corretas
    """
    print("=== Verificador de Assets - Juliette Psicose 2D ===\n")
    
    assets = {
        "assets/sprites 2.png": {"desc": "Imagem original do personagem 1", "required": False},
        "assets/sprites 3.png": {"desc": "Imagem original do personagem 2", "required": False},
        "assets/juliette_animated_spritesheet.png": {"desc": "Spritesheet final com 6 frames", "size": (288, 128), "required": True},
        "assets/juliette_transparent_spritesheet.png": {"desc": "Spritesheet antigo (4 frames)", "size": (192, 128), "required": False},
        "assets/fundo 2d.png": {"desc": "Fundo secundário", "size": None, "required": True},
        "assets/cena01.jpg": {"desc": "Cenário principal", "size": None, "required": True}
        "assets/cena01.gif": {"desc": "Cenário principal", "size": None, "required": True}
    }
    
    all_good = True
    
    for asset_path, info in assets.items():
        print(f"Verificando: {asset_path}")
        
        if not os.path.exists(asset_path):
            status = "❌ FALTANDO" if info["required"] else "⚠️  OPCIONAL (não encontrado)"
            print(f"  Status: {status}")
            if info["required"]:
                all_good = False
        else:
            try:
                img = Image.open(asset_path)
                size = img.size
                print(f"  Status: ✅ OK")
                print(f"  Tamanho: {size[0]}x{size[1]}px")
                print(f"  Modo: {img.mode}")
                
                # Verifica transparência
                if img.mode in ['RGBA', 'LA'] or 'transparency' in img.info:
                    print(f"  Transparência: ✅ Suportada")
                else:
                    print(f"  Transparência: ⚠️  Não detectada")
                
                # Verifica tamanho esperado
                if info.get("size") and size != info["size"]:
                    print(f"  ⚠️  Tamanho esperado: {info['size'][0]}x{info['size'][1]}px")
                    
            except Exception as e:
                print(f"  Status: ❌ ERRO ao carregar: {e}")
                all_good = False
                
        print(f"  Descrição: {info['desc']}\n")
    
    print("=" * 50)
    if all_good:
        print("🎮 ✅ Todos os assets necessários estão OK!")
        print("🚀 O jogo deve funcionar corretamente.")
    else:
        print("⚠️  Alguns assets estão faltando ou com problemas.")
        print("🔧 Execute 'python process_sprites.py' para criar o spritesheet.")
    
    return all_good

if __name__ == "__main__":
    check_assets()
