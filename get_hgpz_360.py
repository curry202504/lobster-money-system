# -*- coding: utf-8 -*-
"""Download 哈工鹏泽 images from 360 and Bing image search"""
import requests, re, os

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml;q=0.9,image/webp,*/*;q=0.8',
}

IMG_DIR = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace', 'report-images')
os.makedirs(IMG_DIR, exist_ok=True)

def fix_url(url):
    """Fix \\u002F unicode escapes and other issues"""
    url = url.replace('\\u002F', '/').replace('\\\\u002F', '/')
    url = url.replace('\\/', '/').replace('&amp;', '&')
    return url

# Try 360 image search
search_urls = [
    ('哈工鹏泽_360', 'https://image.so.com/i?q=' + requests.utils.quote('哈工鹏泽 高空清洗机器人')),
    ('哈工鹏泽_bing', 'https://www.bing.com/images/search?q=' + requests.utils.quote('哈工鹏泽 高空清洗机器人')),
    ('哈工鹏泽_baidu', 'https://image.baidu.com/s?wd=' + requests.utils.quote('哈工鹏泽 清洗机器人')),
]

for src_name, search_url in search_urls:
    print(f'\n=== {src_name} ===')
    try:
        r = requests.get(search_url, headers=headers, timeout=15)
        text = r.text[:500000]  # limit
        
        # Try multiple patterns
        patterns = [
            r'"thumb":"([^"]+)"',
            r'"middle":"([^"]+)"',
            r'"objURL":"([^"]+)"',
            r'"fromURL":"([^"]+)"',
            r'"hoverURL":"([^"]+)"',
            r'"imgurl":"([^"]+)"',
            r'"contentUrl":"([^"]+)"',
            r'<img[^>]+src2="([^"]+)"',
            r'<img[^>]+data-src="([^"]+)"',
            r'<img[^>]+src="(https?://[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"',
        ]
        
        all_urls = []
        for pat in patterns:
            found = re.findall(pat, text)
            all_urls.extend(found)
        
        # Also try to find image URLs directly
        direct = re.findall(r'(https?://[^"\'\\,\s<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\'\\,\s<>]*)?)', text)
        for d in direct:
            all_urls.append(d)
        
        print(f'  Found {len(all_urls)} potential image URLs')
        
        seen = set()
        downloaded = 0
        for img_url in all_urls:
            if downloaded >= 3:
                break
            img_url = fix_url(img_url).strip('"').strip("'")
            
            # Skip tiny/icon URLs and non-http
            if not img_url.startswith('http'):
                continue
            if any(skip in img_url.lower() for skip in ['logo', 'icon', 'favicon', 'avatar', 'placeholder', 'banner']):
                continue
            if img_url in seen:
                continue
            seen.add(img_url)
            
            try:
                ir = requests.get(img_url, headers=headers, timeout=10, allow_redirects=True)
                if len(ir.content) > 5000 and 'image' in ir.headers.get('Content-Type', ''):
                    ct = ir.headers['Content-Type']
                    ext = '.jpg'
                    if 'png' in ct: ext = '.png'
                    elif 'webp' in ct: ext = '.webp'
                    fpath = os.path.join(IMG_DIR, f'哈工鹏泽_{downloaded}{ext}')
                    with open(fpath, 'wb') as f:
                        f.write(ir.content)
                    print(f'  DOWNLOADED: {fpath} ({len(ir.content)} bytes)')
                    downloaded += 1
                else:
                    pass  # skip small files
            except:
                pass
        
        print(f'  Total downloaded from {src_name}: {downloaded}')
    except Exception as e:
        print(f'  Error: {e}')

print('\nDone!')
