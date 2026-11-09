import math
import os
from PIL import Image, ImageDraw

def gerar_gif_tech():
    os.makedirs('assets/img', exist_ok=True)
    out_path = 'assets/img/fundo-tecnologico.gif'
    
    # Parâmetros de renderização
    width = 960
    height = 540
    total_frames = 60  # 60 frames a 15 fps = 4.0 segundos de loop sereno e elegante
    fps = 15
    
    import random
    random.seed(101)  # Seed calibrada para excelente distribuição visual
    
    nodes = []
    num_nodes = 38
    
    for i in range(num_nodes):
        cx = random.uniform(width * 0.04, width * 0.96)
        cy = random.uniform(height * 0.06, height * 0.94)
        rx = random.uniform(18, 45)
        ry = random.uniform(15, 38)
        # 1 ciclo por loop = movimento contínuo e suave
        freq = 1
        phase = random.uniform(0, 2 * math.pi)
        base_size = random.uniform(2.0, 4.2)
        color_type = random.choice(['sky', 'cyan', 'blue', 'white', 'sky'])
        nodes.append({
            'cx': cx, 'cy': cy,
            'rx': rx, 'ry': ry,
            'freq': freq,
            'phase': phase,
            'size': base_size,
            'color': color_type
        })
    
    # Ondas de fluxo de dados sutis no fundo
    waves = [
        {'amp': 28, 'wl': 480, 'speed': 1, 'y_base': height * 0.32, 'color': (14, 116, 144, 25)},
        {'amp': 42, 'wl': 640, 'speed': -1, 'y_base': height * 0.52, 'color': (3, 105, 161, 30)},
        {'amp': 32, 'wl': 520, 'speed': 1, 'y_base': height * 0.72, 'color': (2, 132, 199, 22)},
    ]
    
    max_dist = 138  # Distância de conexão
    
    frames = []
    
    for f in range(total_frames):
        t = f / total_frames
        angle_base = 2 * math.pi * t
        
        # Fundo tom HUB Navy profundo (#040914)
        img = Image.new('RGBA', (width, height), (4, 9, 20, 255))
        draw = ImageDraw.Draw(img, 'RGBA')
        
        # 1. Grid tecnológico sutil com cruzes de coordenadas
        grid_step_x = 75
        grid_step_y = 60
        for gx in range(30, width, grid_step_x):
            for gy in range(30, height, grid_step_y):
                cs = 2
                draw.line([(gx - cs, gy), (gx + cs, gy)], fill=(30, 58, 95, 35), width=1)
                draw.line([(gx, gy - cs), (gx, gy + cs)], fill=(30, 58, 95, 35), width=1)
        
        # 2. Ondas digitais no fundo
        for w in waves:
            pts = []
            for px in range(0, width + 10, 15):
                phase_shift = angle_base * w['speed']
                py = w['y_base'] + w['amp'] * math.sin((px / w['wl']) * 2 * math.pi + phase_shift)
                pts.append((px, py))
            if len(pts) > 1:
                draw.line(pts, fill=w['color'], width=2)
        
        # 3. Posições dos nós
        current_pos = []
        for n in nodes:
            theta = angle_base * n['freq'] + n['phase']
            nx = n['cx'] + n['rx'] * math.cos(theta)
            ny = n['cy'] + n['ry'] * math.sin(theta)
            current_pos.append((nx, ny, n))
            
        # 4. Linhas de conexão dinâmicas
        for i in range(len(current_pos)):
            x1, y1, n1 = current_pos[i]
            for j in range(i + 1, len(current_pos)):
                x2, y2, n2 = current_pos[j]
                dx = x2 - x1
                dy = y2 - y1
                dist = math.hypot(dx, dy)
                if dist < max_dist:
                    alpha_factor = (1.0 - (dist / max_dist)) ** 1.35
                    alpha = int(alpha_factor * 105)
                    if alpha > 8:
                        line_color = (56, 189, 248, alpha) if (i + j) % 2 == 0 else (14, 165, 233, alpha)
                        draw.line([(x1, y1), (x2, y2)], fill=line_color, width=1)
                        
                        # Pulso de dados viajando na linha
                        if alpha > 35:
                            pulse_prog = (t * 2.0 + (i * 0.12 + j * 0.18)) % 1.0
                            px = x1 + dx * pulse_prog
                            py = y1 + dy * pulse_prog
                            draw.ellipse([(px - 1.2, py - 1.2), (px + 1.2, py + 1.2)], fill=(255, 255, 255, int(alpha * 1.4)))
        
        # 5. Desenhar nós com halos luminosos
        for nx, ny, n in current_pos:
            r = n['size']
            # Halo exterior
            halo_r = r * 2.6
            draw.ellipse([(nx - halo_r, ny - halo_r), (nx + halo_r, ny + halo_r)], fill=(14, 165, 233, 22))
            
            # Halo médio
            mid_r = r * 1.5
            draw.ellipse([(nx - mid_r, ny - mid_r), (nx + mid_r, ny + mid_r)], fill=(56, 189, 248, 55))
            
            # Núcleo
            if n['color'] == 'white':
                core_col = (255, 255, 255, 225)
            elif n['color'] == 'cyan':
                core_col = (103, 232, 249, 215)
            elif n['color'] == 'blue':
                core_col = (59, 130, 246, 215)
            else:
                core_col = (56, 189, 248, 220)
            draw.ellipse([(nx - r, ny - r), (nx + r, ny + r)], fill=core_col)
            
        # 6. Vinheta perimetral para transição natural
        vignette = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        v_draw = ImageDraw.Draw(vignette, 'RGBA')
        v_draw.rectangle([(0, 0), (width, 35)], fill=(4, 9, 20, 80))
        v_draw.rectangle([(0, height - 35), (width, height)], fill=(4, 9, 20, 95))
        img = Image.alpha_composite(img, vignette)
        
        # Quantização de paleta otimizada
        frame_rgb = img.convert('RGB')
        frame_p = frame_rgb.quantize(colors=64, method=Image.Quantize.MEDIANCUT)
        frames.append(frame_p)
        
    duration_ms = int(1000 / fps)
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        optimize=True
    )
    
    file_size_kb = os.path.getsize(out_path) / 1024
    print(f'GIF gerado com sucesso: {out_path} ({file_size_kb:.1f} KB, {len(frames)} frames @ {fps}fps)')

if __name__ == '__main__':
    gerar_gif_tech()
