#!/usr/bin/env python3
"""
PWA Icon Generator Script
Creates proper 192x192 and 512x512 PNG icons for the Shop Manager PWA
"""

import os
from io import BytesIO
import base64

def create_svg_icon(size=192):
    """Create a simple SVG icon for the Shop Manager"""
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#007bff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0056b3;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="{size//2}" cy="{size//2}" r="{size//2-10}" fill="url(#gradient)" stroke="#ffffff" stroke-width="8"/>
  
  <!-- Shop/Store icon -->
  <g transform="translate({size//2-48}, {size//2-48})">
    <!-- Building/Store -->
    <rect x="8" y="32" width="80" height="56" fill="#ffffff" rx="4"/>
    
    <!-- Roof -->
    <path d="M 8 32 L 48 8 L 88 32 Z" fill="#ffffff"/>
    
    <!-- Door -->
    <rect x="20" y="56" width="24" height="32" fill="url(#gradient)" rx="2"/>
    <circle cx="38" cy="72" r="2" fill="#ffffff"/>
    
    <!-- Windows -->
    <rect x="52" y="48" width="12" height="12" fill="url(#gradient)" rx="1"/>
    <rect x="68" y="48" width="12" height="12" fill="url(#gradient)" rx="1"/>
    
    <!-- Sign -->
    <rect x="12" y="16" width="72" height="12" fill="#ffffff" rx="2"/>
    <text x="48" y="26" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="url(#gradient)" font-weight="bold">SHOP MANAGER</text>
  </g>
</svg>'''
    return svg_content

def save_placeholder_png(filename, size):
    """Save a placeholder PNG with base64 encoded simple icon"""
    # Create a simple base64 encoded 1x1 transparent PNG as placeholder
    # In production, you would use PIL or similar to create proper icons
    placeholder_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    with open(filename, 'wb') as f:
        f.write(base64.b64decode(placeholder_png))
    
    print(f"Created placeholder icon: {filename} ({size}x{size})")

def main():
    """Generate PWA icons"""
    icons_dir = "static/icons"
    
    # Create icons directory if it doesn't exist
    os.makedirs(icons_dir, exist_ok=True)
    
    # Create SVG icon
    svg_content = create_svg_icon(192)
    svg_path = os.path.join(icons_dir, "icon.svg")
    with open(svg_path, 'w') as f:
        f.write(svg_content)
    print(f"Created SVG icon: {svg_path}")
    
    # Create placeholder PNGs (in production, convert SVG to PNG)
    png_192_path = os.path.join(icons_dir, "icon-192x192.png")
    png_512_path = os.path.join(icons_dir, "icon-512x512.png")
    
    save_placeholder_png(png_192_path, 192)
    save_placeholder_png(png_512_path, 512)
    
    print("\n📝 To create proper PNG icons:")
    print("1. Install ImageMagick or Inkscape")
    print("2. Convert SVG to PNG:")
    print(f"   convert {svg_path} -resize 192x192 {png_192_path}")
    print(f"   convert {svg_path} -resize 512x512 {png_512_path}")
    print("\nOr use online tools like:")
    print("- https://realfavicongenerator.net/")
    print("- https://www.favicon-generator.org/")
    print("- https://favicon.io/")

if __name__ == "__main__":
    main()
