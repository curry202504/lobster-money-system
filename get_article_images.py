import requests
import re
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

# Try to fetch actual article content with images from various public pages
urls_to_try = [
    # 哈工鹏泽 - try to find articles on platforms
    ('哈工鹏泽_news', 'https://www.163.com/search?keyword=哈工鹏泽+高空清洗机器人'),
    ('哈工鹏泽_zhihu', 'https://www.zhihu.com/search?type=content&q=哈工鹏泽%20高空清洗机器人'),
    # Try to fetch search engine pages that might have images
    ('sogou_哈工鹏泽', 'https://www.sogou.com/web?query=哈工鹏泽+机器人+产品图'),
    ('sogou_埃欧珞', 'https://www.sogou.com/web?query=埃欧珞+机器人+产品图'),
    ('sogou_凌度', 'https://www.sogou.com/web?query=凌度智能+幕墙清洗+机器人+产品'),
]

for name, url in urls_to_try:
    try:
        r = requests.get(url, headers=headers, timeout=15)
        # Extract all image URLs
        images = re.findall(r'<img[^>]+src="([^"]+)"', r.text)
        # Filter for actual product images (reasonable size)
        product_imgs = []
        for img in images:
            if any(ext in img.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                if 'icon' not in img.lower() and 'logo' not in img.lower():
                    if not img.startswith('data:'):
                        product_imgs.append(img[:200])
        print(f'\n=== {name} === Status: {r.status_code}')
        print(f'Found {len(product_imgs)} images')
        for img in product_imgs[:8]:
            print(f'  {img}')
    except Exception as e:
        print(f'\n=== {name} === Error: {e}')
