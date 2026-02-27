from PIL import Image, ImageDraw
import os

os.makedirs('assets', exist_ok=True)

# Icon - shield on dark navy
img = Image.new('RGB', (1024, 1024), '#0f172a')
draw = ImageDraw.Draw(img)
shield_points = [
    (512, 150), (800, 280), (800, 580),
    (512, 750), (224, 580), (224, 280)
]
draw.polygon(shield_points, fill='#3b82f6')
img.save('assets/icon.png')

# Splash
splash = Image.new('RGB', (1284, 2778), '#0f172a')
draw2 = ImageDraw.Draw(splash)
shield_pts = [(642, 700), (900, 850), (900, 1150), (642, 1300), (384, 1150), (384, 850)]
draw2.polygon(shield_pts, fill='#1e3a5f')
draw2.polygon([(x+10, y+10) for x, y in shield_pts], fill='#3b82f6', outline='#60a5fa')
splash.save('assets/splash.png')
print('Done')
