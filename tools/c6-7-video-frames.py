"""Stream C6.7 Cycles PNG sequence as raw RGB to ffmpeg (supports ffmpeg builds without PNG decoder).
Example: python3 tools/c6-7-video-frames.py | ffmpeg -f rawvideo -pixel_format rgb24 -video_size 1080x1080 -framerate 30 -i pipe:0 -c:v libx264 -crf 20 -pix_fmt yuv420p output.mp4
"""
from pathlib import Path
from PIL import Image
import sys
root=Path('/tmp/jg-C6-7-render-160-final')
frames=[*range(160),*range(158,-1,-1)]
for n in frames:
 with Image.open(root/f'core01-{n:03d}.png') as opened:
  assert opened.size==(1080,1080)
  src=opened.convert('RGBA')
  bg=Image.new('RGBA',src.size,(7,11,22,255))
  bg.alpha_composite(src)
  sys.stdout.buffer.write(bg.convert('RGB').tobytes())
