#!/usr/bin/env python3
"""
Generate Tauri app icons using Pillow (Python Imaging Library).

IMPORTANT:
- This script MUST output the filenames referenced by `src-tauri/tauri.conf.json`
  (e.g. `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`).
- The design should match Narrative’s UI: minimal, professional, calm.
"""

import os
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

def create_icon(size):
    """Create the Narrative app icon at the specified size.

    Design goals:
    - Minimal + professional (reads well at 16–32px)
    - Consistent with the app UI palette (warm stone + sky)
    - A single “narrative thread” mark (curve + nodes), not busy detail
    """
    # App color palette (aligned to UI)
    stone_100 = (245, 245, 244)  # #f5f5f4 - background
    stone_200 = (231, 229, 228)  # #e7e5e4 - subtle gradient
    stone_300 = (214, 211, 209)  # #d6d3d1 - border
    stone_400 = (168, 162, 158)  # #a8a29e - muted stroke
    sky_500 = (14, 165, 233)     # #0ea5e9 - accent
    sky_600 = (2, 132, 199)      # #0284c7 - deeper accent
    white = (255, 255, 255)
    
    # macOS/iOS style rounded corners
    corner_radius = int(size * 0.22)
    
    # Create base image with subtle gradient (stone-100 to stone-200)
    img = Image.new('RGB', (size, size), stone_100)
    draw = ImageDraw.Draw(img)
    
    # Subtle vertical gradient overlay
    for y in range(size):
        ratio = y / size
        r = int(stone_100[0] + (stone_200[0] - stone_100[0]) * ratio * 0.3)
        g = int(stone_100[1] + (stone_200[1] - stone_100[1]) * ratio * 0.3)
        b = int(stone_100[2] + (stone_200[2] - stone_100[2]) * ratio * 0.3)
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    
    # Convert to RGBA for transparency support
    img = img.convert('RGBA')
    
    # Create mask for rounded corners
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, size, size], radius=corner_radius, fill=255)
    
    # Apply mask
    img.putalpha(mask)
    
    # Create draw object for the icon elements
    draw = ImageDraw.Draw(img)
    
    # Calculate sizes based on icon size
    center = size // 2
    # Geometry tuned to remain readable at small sizes
    line_width = max(6, size // 16)
    node_radius = max(8, size // 10)

    # “Narrative thread”: a single, bold curve with two nodes.
    # Coordinates are normalized so the mark remains optically centered.
    x0 = int(size * 0.20)
    x1 = int(size * 0.80)
    y_mid = int(size * 0.52)
    y_top = int(size * 0.36)
    y_bot = int(size * 0.68)

    # Shadow (very subtle) for the whole mark
    shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.line([(x0, y_top), (center, y_mid), (x1, y_bot)], fill=(0, 0, 0, 55), width=line_width)
    sd.ellipse([x0 - node_radius, y_top - node_radius, x0 + node_radius, y_top + node_radius], fill=(0, 0, 0, 55))
    sd.ellipse([x1 - node_radius, y_bot - node_radius, x1 + node_radius, y_bot + node_radius], fill=(0, 0, 0, 55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(1, size // 64)))
    img.alpha_composite(shadow, (0, int(size * 0.02)))

    # Main curve (accent)
    draw.line([(x0, y_top), (center, y_mid), (x1, y_bot)], fill=sky_500, width=line_width, joint="curve")

    # Nodes: solid accent with thin light ring (keeps crisp at 32px)
    ring_w = max(2, size // 96)
    for (cx, cy) in [(x0, y_top), (x1, y_bot)]:
        draw.ellipse([cx - node_radius - ring_w, cy - node_radius - ring_w,
                      cx + node_radius + ring_w, cy + node_radius + ring_w],
                     fill=white)
        draw.ellipse([cx - node_radius, cy - node_radius,
                      cx + node_radius, cy + node_radius],
                     fill=sky_600)
    
    # Subtle inner border to match card surfaces
    border_width = max(1, size // 256)
    padding = size // 36
    draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=max(1, corner_radius - padding),
        outline=(*stone_400, 55),
        width=border_width,
    )
    
    return img

def create_icns(iconset_dir, output_path):
    """Create .icns file from iconset using iconutil (macOS)."""
    try:
        subprocess.run(
            ['iconutil', '-c', 'icns', str(iconset_dir), '-o', str(output_path)],
            check=True,
            capture_output=True
        )
        print(f"Created: {output_path.name}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to create .icns: {e}")
        return False
    except FileNotFoundError:
        print("iconutil not found (macOS only)")
        return False

def create_ico(images, output_path):
    """Create .ico file from PIL images."""
    ico_images = []
    for size in [16, 32, 48, 64, 128, 256]:
        if size <= max(img.width for img in images):
            largest = max(images, key=lambda x: x.width)
            resized = largest.resize((size, size), Image.Resampling.LANCZOS)
            ico_images.append(resized)
    
    if ico_images:
        ico_images[0].save(
            output_path,
            format='ICO',
            sizes=[(img.width, img.height) for img in ico_images],
            append_images=ico_images[1:]
        )
        print(f"Created: {output_path.name}")
        return True
    return False

def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    icons_dir = project_root / "src-tauri" / "icons"
    iconset_dir = icons_dir / "icon.iconset"
    
    print(f"Output directory: {icons_dir}")
    print()
    
    # Ensure directories exist
    icons_dir.mkdir(parents=True, exist_ok=True)
    iconset_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate standard icon sizes (we'll also write filenames Tauri expects)
    print("=== Generating PNG Icons ===")
    standard_sizes = [32, 64, 128, 256, 512, 1024]
    generated_images = {}
    
    for size in standard_sizes:
        img = create_icon(size)
        generated_images[size] = img
        # Keep `icon{size}x{size}.png` for convenience/debugging
        debug_path = icons_dir / f"icon{size}x{size}.png"
        img.save(debug_path, 'PNG')
        print(f"  {debug_path.name}")

    # Write the exact filenames referenced by tauri.conf.json
    # bundle.icon = ["icons/32x32.png","icons/128x128.png","icons/128x128@2x.png",...]
    tauri_named = [
        (32, "32x32.png"),
        (64, "64x64.png"),
        (128, "128x128.png"),
        (256, "128x128@2x.png"),
    ]
    for sz, name in tauri_named:
        generated_images[1024].resize((sz, sz), Image.Resampling.LANCZOS).save(icons_dir / name, 'PNG')
        print(f"  {name}")
    
    # Create main icon.png (copy of 1024)
    main_icon_path = icons_dir / "icon.png"
    generated_images[1024].save(main_icon_path, 'PNG')
    print(f"  icon.png (1024x1024)")
    
    # Generate macOS iconset
    print()
    print("=== Generating macOS Icon Set ===")
    macos_sizes = [16, 32, 64, 128, 256, 512, 1024]
    
    for size in macos_sizes:
        if size in generated_images:
            img = generated_images[size]
        else:
            img = generated_images[1024].resize((size, size), Image.Resampling.LANCZOS)
        
        # Normal DPI
        png_path = iconset_dir / f"icon_{size}x{size}.png"
        img.save(png_path, 'PNG')
        
        # High DPI (@2x)
        if size <= 512:
            png_path_2x = iconset_dir / f"icon_{size}x{size}@2x.png"
            img_2x = generated_images[1024].resize((size * 2, size * 2), Image.Resampling.LANCZOS)
            img_2x.save(png_path_2x, 'PNG')
    
    print(f"  Generated {len(macos_sizes)} iconset entries")
    
    # Create .icns
    print()
    print("=== Creating Platform-Specific Formats ===")
    icns_path = icons_dir / "icon.icns"
    if create_icns(iconset_dir, icns_path):
        import shutil
        shutil.rmtree(iconset_dir)
        print(f"  Cleaned up iconset directory")
    
    # Create .ico for Windows
    ico_path = icons_dir / "icon.ico"
    create_ico(list(generated_images.values()), ico_path)
    
    # Windows Store assets (keep in sync so packaging looks consistent)
    store_logo = icons_dir / "StoreLogo.png"
    generated_images[1024].resize((50, 50), Image.Resampling.LANCZOS).save(store_logo, 'PNG')
    print("  StoreLogo.png")

    square_logos = [
        (30, "Square30x30Logo.png"),
        (44, "Square44x44Logo.png"),
        (71, "Square71x71Logo.png"),
        (89, "Square89x89Logo.png"),
        (107, "Square107x107Logo.png"),
        (142, "Square142x142Logo.png"),
        (150, "Square150x150Logo.png"),
        (284, "Square284x284Logo.png"),
        (310, "Square310x310Logo.png"),
    ]
    for sz, name in square_logos:
        generated_images[1024].resize((sz, sz), Image.Resampling.LANCZOS).save(icons_dir / name, 'PNG')
        # too noisy to print each; keep list at end
    
    print()
    print("=== Icon Generation Complete ===")
    print(f"All icons saved to: {icons_dir}")
    print()
    print("Generated files:")
    for f in sorted(icons_dir.iterdir()):
        if f.is_file():
            size_kb = f.stat().st_size / 1024
            print(f"  - {f.name:20s} ({size_kb:6.1f} KB)")

if __name__ == "__main__":
    main()
