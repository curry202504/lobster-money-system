# -*- coding: utf-8 -*-
"""Extract product images from QQ News article"""
import requests, re, os

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
}

url = 'https://news.qq.com/rain/a/20260423A0850O00'
r = requests.get(url, headers=headers, timeout=15)

# Find image URLs in HTML
images = re.findall(r'https?://[^"\'\\,<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\'\\,<>]*)?', r.text)
print(f'Found {len(images)} image URLs')

# Filter for likely product images (reasonable size URLs, not icons)
product_images = []
for img_url in images:
    if any(skip in img_url.lower() for skip in ['logo', 'icon', 'avatar', 'sns', 'share']):
        continue
    if len(img_url) > 40 and len(img_url) < 300:
        product_images.append(img_url)

print(f'Potential product images: {len(product_images)}')
for i, img in enumerate(product_images[:10]):
    print(f'{i+1}. {img[:150]}')

# Try to download the first few
OUT = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace', 'report-images-safe')
os.makedirs(OUT, exist_ok=True)

downloaded = 0
for img_url in product_images[:5]:
    try:
        ir = requests.get(img_url, headers=headers, timeout=10, allow_redirects=True)
        if len(ir.content) > 10000 and 'image' in ir.headers.get('Content-Type', ''):
            ct = ir.headers['Content-Type']
            ext = '.jpg'
            if 'png' in ct: ext = '.png'
            elif 'webp' in ct: ext = '.webp'
            fpath = os.path.join(OUT, f'QQ新闻_{downloaded}{ext}')
            with open(fpath, 'wb') as f:
                f.write(ir.content)
            print(f'Downloaded {downloaded+1}: {len(ir.content)} bytes -> {fpath}')
            downloaded += 1
    except:
        pass

print(f'Downloaded {downloaded} images')
