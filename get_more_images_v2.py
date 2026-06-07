# -*- coding: utf-8 -*-
"""Get more competitor images - 华蔚, 万勋, R-storm + more"""
import os, requests, re

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml;q=0.9,image/webp,*/*;q=0.8',
}
IMG_DIR = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace', 'report-images')
os.makedirs(IMG_DIR, exist_ok=True)

queries = [
    ('华蔚_清洗机器人', 'https://image.so.com/i?q=' + requests.utils.quote('华蔚科技 高空幕墙清洗机器人')),
    ('万勋_无人机清洗', 'https://image.so.com/i?q=' + requests.utils.quote('万勋科技 高空清洗无人机')),
    ('R_storm_机器人', 'https://image.so.com/i?q=' + requests.utils.quote('R-storm 高空清洁机器人')),
    ('幕墙_建筑', 'https://image.so.com/i?q=' + requests.utils.quote('中国玻璃幕墙 建筑外墙')),
    ('蜘蛛人_高空', 'https://image.so.com/i?q=' + requests.utils.quote('蜘蛛人 高空清洗外墙')),
    ('哈工鹏泽_补充', 'https://image.so.com/i?q=' + requests.utils.quote('哈工鹏泽 机器人 深圳')),
    ('凌度_补充', 'https://image.so.com/i?q=' + requests.utils.quote('凌度智能 幕墙清洗机器人 广东')),
    ('史河_BeeBot', 'https://image.so.com/i?q=' + requests.utils.quote('史河机器人 BeeBot 外墙清洗')),
    ('CCE_清洁展', 'https://image.so.com/i?q=' + requests.utils.quote('CCE上海清洁博览会 高空清洁机器人')),
]

for name, url in queries:
    try:
        r = requests.get(url, headers=headers, timeout=15)
        images = re.findall(r'"thumb":"([^"]+)"', r.text)
        all_urls = set()
        for img in images[:15]:
            u = img.replace('\\/', '/')
            if u.startswith('http'):
                all_urls.add(u)
        if not all_urls:
            direct = re.findall(r'https?://[^"\'\\,<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\'\\,<>]*)?', r.text)
            for d in direct[:20]:
                if any(ext in d.lower() for ext in ['.jpg', '.jpeg', '.png']):
                    all_urls.add(d)
        
        count = 0
        for img_url in list(all_urls)[:5]:
            if count >= 2: break
            try:
                ir = requests.get(img_url, headers=headers, timeout=10, allow_redirects=True)
                if len(ir.content) > 5000 and 'image' in ir.headers.get('Content-Type', ''):
                    ct = ir.headers['Content-Type']
                    ext = '.jpg'
                    if 'png' in ct: ext = '.png'
                    elif 'webp' in ct: ext = '.webp'
                    fpath = os.path.join(IMG_DIR, f'{name}_{count}{ext}')
                    with open(fpath, 'wb') as f: f.write(ir.content)
                    print(f'  OK {name}_{count}: {len(ir.content)} bytes')
                    count += 1
            except: pass
        print(f'{name}: {count} new images')
    except Exception as e:
        print(f'{name}: Error - {e}')
