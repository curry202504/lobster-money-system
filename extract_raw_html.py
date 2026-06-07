# -*- coding: utf-8 -*-
"""Fetch raw HTML and extract images"""
import requests, re, os

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
}

url = 'https://news.qq.com/rain/a/20260423A0850O00'
r = requests.get(url, headers=headers, timeout=15)
html = r.text
print(f'HTML size: {len(html)} bytes')

# Find all img tags
imgs = re.findall(r'<img[^>]+src="([^"]+)"', html)
print(f'Found {len(imgs)} img tags')
for i, img in enumerate(imgs[:15]):
    print(f'{i+1}. {img[:200]}')

# Also look for data-src (lazy loading)
data_imgs = re.findall(r'data-src="([^"]+)"', html)
print(f'\nFound {len(data_imgs)} data-src')
for i, img in enumerate(data_imgs[:10]):
    print(f'{i+1}. {img[:200]}')

# Also look for any image URLs
all_imgs = re.findall(r'(https?://[^"\'\\,<>\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\'\\,<>\s]*)?)', html)
print(f'\nTotal image URLs: {len(set(all_imgs))}')
for i, img in enumerate(list(set(all_imgs))[:10]):
    print(f'{i+1}. {img[:200]}')
