# -*- coding: utf-8 -*-
"""Download actual competitor product images and embed into the Word document"""
import os
import requests
import re
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn

OUTPUT_DIR = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace')
IMAGE_DIR = os.path.join(OUTPUT_DIR, 'report-images')
os.makedirs(IMAGE_DIR, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

def download_image(url, filename):
    """Download image from URL and save locally"""
    try:
        r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        ct = r.headers.get('Content-Type', '')
        if 'image' not in ct and 'octet' not in ct:
            return None, f'Not an image: {ct}'
        ext = '.jpg'
        if 'png' in ct: ext = '.png'
        elif 'gif' in ct: ext = '.gif'
        elif 'webp' in ct: ext = '.webp'
        elif 'jpeg' in ct or 'jpg' in ct: ext = '.jpg'
        elif 'svg' in ct: ext = '.svg'
        fpath = os.path.join(IMAGE_DIR, filename + ext)
        with open(fpath, 'wb') as f:
            f.write(r.content)
        if len(r.content) > 2000:
            return fpath, f'OK ({len(r.content)} bytes)'
        else:
            return None, f'Too small: {len(r.content)} bytes'
    except Exception as e:
        return None, str(e)

# Try to find actual product images from various public sources
image_candidates = [
    # Try to get images from sogou search thumbnails (they redirect to actual images)
    ('哈工鹏泽-GE02', [
        'https://img01.sogoucdn.com/v2/thumb/crop/xy/ai/x/0/y/0/w/400/h/300/iw/400/ih/300/t/0/ir/3/retype_exclude_gif/ext/auto/q/85?t=2&appid=200997&url=https%3A%2F%2Fnews.sznews.com%2Fpic%2F2026-04%2F',
        'https://www.sznews.com/pic/2026-04/',
    ]),
]

# Try direct approach - search for product images on public sites
search_urls = {
    '埃欧珞': 'https://image.so.com/i?q=埃欧珞+高空幕墙清洁机器人',
    '凌度智能': 'https://image.so.com/i?q=凌度智能+高空幕墙清洗机器人',
    '哈工鹏泽': 'https://image.so.com/i?q=哈工鹏泽+高空清洗机器人',
}

all_images = {}
for name, search_url in search_urls.items():
    try:
        r = requests.get(search_url, headers=headers, timeout=15)
        # Extract JSON image data from 360 image search
        # 360 uses a JSONP format: Q.thumburls(...) or window.lzData = {...}
        images = re.findall(r'"thumb":"([^"]+)"', r.text)
        print(f'{name}: Found {len(images)} image thumbnails')
        if images:
            # Download first 2 images
            for i, img_url in enumerate(images[:2]):
                img_url = img_url.replace('\\/', '/').replace('\\', '')
                fpath, status = download_image(img_url, f'{name}_{i}')
                if fpath:
                    print(f'  Downloaded: {fpath} ({status})')
                    all_images[f'{name}_{i}'] = fpath
                else:
                    print(f'  Failed: {img_url[:80]}... ({status})')
    except Exception as e:
        print(f'{name}: Error - {e}')

print(f'\nTotal images downloaded: {len(all_images)}')
for k, v in all_images.items():
    print(f'  {k}: {v}')
