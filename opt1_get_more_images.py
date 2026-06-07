# -*- coding: utf-8 -*-
"""Optimization 1: Get more competitor product images"""
import os, requests, re

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml;q=0.9,image/webp,*/*;q=0.8',
}
IMG_DIR = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace', 'report-images')
os.makedirs(IMG_DIR, exist_ok=True)

# Try to get more images from multiple image search engines
search_queries = {
    '哈工鹏泽_ge02': ['https://image.so.com/i?q=' + requests.utils.quote('哈工鹏泽 GE-02 高空清洗机器人'), 'bing'],
    '埃欧珞_rs': ['https://image.so.com/i?q=' + requests.utils.quote('埃欧珞 灵动跳跃Rs 高空清洁'), 'bing'],
    '凌度_k3': ['https://image.so.com/i?q=' + requests.utils.quote('凌度智能 凌空K3 幕墙清洗'), 'bing'],
    '华蔚_robot': ['https://image.so.com/i?q=' + requests.utils.quote('华蔚 幕墙清洗机器人'), 'bing'],
    '万勋_drone': ['https://image.so.com/i?q=' + requests.utils.quote('万勋科技 高空清洗无人机'), 'bing'],
    'market_chart': ['https://image.so.com/i?q=' + requests.utils.quote('中国幕墙清洗市场规模 增长 图表'), 'bing'],
    '蜘蛛人_accident': ['https://image.so.com/i?q=' + requests.utils.quote('高空蜘蛛人 清洗 事故'), 'bing'],
    'glass_curtain_wall': ['https://image.so.com/i?q=' + requests.utils.quote('中国玻璃幕墙 建筑 高空'), 'bing'],
}

def download(url, name):
    try:
        r = requests.get(url, headers=headers, timeout=15)
        # Extract image URLs from 360 image search
        images = re.findall(r'("thumb":"([^"]+)"|"qhimg_url":"([^"]+)"|"img":"([^"]+)"|"middle":"([^"]+)")', r.text)
        all_urls = set()
        for match in images:
            for g in match[1:]:
                if g and g.startswith('http'):
                    all_urls.add(g.replace('\\/', '/'))
        if not all_urls:
            # Try direct image URLs
            direct = re.findall(r'https?://[^"\'\\,<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\'\\,<>]*)?', r.text)
            for d in direct[:20]:
                all_urls.add(d)
        count = 0
        for img_url in list(all_urls)[:5]:
            if count >= 2: break
            try:
                ir = requests.get(img_url, headers=headers, timeout=10, allow_redirects=True)
                if len(ir.content) > 5000 and 'image' in ir.headers.get('Content-Type', ''):
                    ext = '.jpg'
                    ct = ir.headers['Content-Type']
                    if 'png' in ct: ext = '.png'
                    elif 'webp' in ct: ext = '.webp'
                    fpath = os.path.join(IMG_DIR, f'{name}_{count}{ext}')
                    with open(fpath, 'wb') as f: f.write(ir.content)
                    print(f'  DOWNLOADED {name}_{count}: {len(ir.content)} bytes')
                    count += 1
            except: pass
        print(f'  {name}: got {count} images from {len(all_urls)} candidates')
    except Exception as e:
        print(f'  {name}: Error - {e}')

for name, urls in search_queries.items():
    print(f'Searching: {name}')
    for url in urls[:2]:
        if isinstance(url, str) and url.startswith('http'):
            download(url, name)

print('\n=== All images in directory ===')
for f in sorted(os.listdir(IMG_DIR)):
    fpath = os.path.join(IMG_DIR, f)
    print(f'  {f}: {os.path.getsize(fpath)} bytes')
