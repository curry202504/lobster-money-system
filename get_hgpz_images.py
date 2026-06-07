# -*- coding: utf-8 -*-
"""Download 哈工鹏泽 product images"""
import requests, re, os, json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
}

IMG_DIR = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace', 'report-images')
os.makedirs(IMG_DIR, exist_ok=True)

# Try Sogou image search for 哈工鹏泽
url = 'https://pic.sogou.com/pics?query=' + requests.utils.quote('哈工鹏泽 高空清洗机器人') + '&mode=1'
try:
    r = requests.get(url, headers=headers, timeout=15)
    text = r.text
    
    # Try various patterns to extract image URLs
    # Sogou's image search typically embeds images in JavaScript objects
    image_urls = []
    
    # Pattern 1: directly in img tags
    imgs = re.findall(r'<img[^>]+src="([^"]+)"', text)
    for img in imgs:
        if any(ext in img.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
            if 'logo' not in img.lower() and 'icon' not in img.lower():
                image_urls.append(img)
    
    # Pattern 2: in JavaScript data
    js_images = re.findall(r'thumbUrl["\': ]+["\']([^"\']+)["\']', text)
    image_urls.extend(js_images)
    
    # Pattern 3: look for image URLs in JSON-like data
    json_images = re.findall(r'https?://[^"\'\\,\s<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\'\\,\s<>]*)?', text)
    for jimg in json_images:
        image_urls.append(jimg)
    
    print(f'Total potential image URLs: {len(image_urls)}')
    
    # Try to download, skip duplicates
    seen = set()
    downloaded = 0
    for img_url in image_urls:
        if downloaded >= 3:
            break
        img_url = img_url.replace('\\/', '/').replace('\\\\u002F', '/').replace('&amp;', '&').strip('"').strip("'")
        if img_url in seen or len(img_url) < 20:
            continue
        seen.add(img_url)
        print(f'Trying: {img_url[:100]}...')
        try:
            ir = requests.get(img_url, headers=headers, timeout=10, allow_redirects=True)
            if len(ir.content) > 3000:
                ct = ir.headers.get('Content-Type', '')
                ext_map = {'png': '.png', 'webp': '.webp', 'jpeg': '.jpg', 'gif': '.gif'}
                ext = '.jpg'
                for k, v in ext_map.items():
                    if k in ct: ext = v; break
                fpath = os.path.join(IMG_DIR, f'哈工鹏泽_product_{downloaded}{ext}')
                with open(fpath, 'wb') as f:
                    f.write(ir.content)
                print(f'  SAVED: {fpath} ({len(ir.content)} bytes)')
                downloaded += 1
            else:
                print(f'  Too small: {len(ir.content)} bytes')
        except Exception as e:
            print(f'  Error: {e}')
    
    if downloaded == 0:
        print('\nCould not download images from sogou. Saving the search HTML for inspection...')
        
    print(f'\nDownloaded {downloaded} images for 哈工鹏泽')
    
except Exception as e:
    print(f'Search error: {e}')
    import traceback
    traceback.print_exc()
