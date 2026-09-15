from pathlib import Path
import shutil
from PIL import Image

ROOT = Path('/home/ubuntu/p6fq')
ASSETS = ROOT / 'client/public/assets'
BACKUP = Path('/home/ubuntu/p6fq-image-backup')
NAMES = [
    'athar-hero.webp',
    'athar-social-preview.webp',
    'story1-original.jpeg',
    'story1-page-01.png',
    'story1-page-02.png',
    'story1-page-03.png',
    'story2-original.jpg',
    'story2-page-01.png',
    'story2-page-02.png',
    'story2-page-03.png',
]

BACKUP.mkdir(parents=True, exist_ok=True)
for name in NAMES:
    source = ASSETS / name
    if not source.exists():
        raise FileNotFoundError(source)
    shutil.copy2(source, BACKUP / name)
    with Image.open(source) as image:
        if image.mode in ('RGBA', 'LA'):
            prepared = image.convert('RGBA')
        else:
            prepared = image.convert('RGB')
        target = source.with_suffix('.webp')
        prepared.save(target, 'WEBP', quality=82, method=6, optimize=True)
        before = source.stat().st_size
        after = target.stat().st_size
        print(f'{name}: {before:,} -> {target.name}: {after:,} bytes ({after / before:.1%})')
