import re
import requests
import os
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

# Search for competitor products on So.com
queries = [
    ('哈工鹏泽', 'https://www.so.com/s?q=哈工鹏泽+滚轮式越障+清洗机器人+GE-02'),
    ('埃欧珞', 'https://www.so.com/s?q=埃欧珞+高空幕墙清洁机器人+灵动跳跃Rs'),
    ('凌度智能', 'https://www.so.com/s?q=凌度智能+高空幕墙清洗机器人+凌空K3'),
    ('万勋', 'https://www.so.com/s?q=万勋科技+高空清洗+无人机'),
]

output_dir = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace', 'report-images')
os.makedirs(output_dir, exist_ok=True)

results = {}
for name, url in queries:
    try:
        r = requests.get(url, headers=headers, timeout=15)
        text = r.text
        
        # Extract all image URLs
        images = re.findall(r'<img[^>]+src="([^"]+)"', text)
        # Filter for actual product images (not icons)
        product_images = []
        for img in images:
            img_clean = img.replace('&amp;', '&')
            if any(ext in img_clean.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                if 'icon' not in img_clean.lower() and 'logo' not in img_clean.lower():
                    product_images.append(img_clean)
        
        results[name] = {
            'url': url,
            'status': r.status_code,
            'len': len(text),
            'images': product_images[:5]
        }
    except Exception as e:
        results[name] = {'error': str(e)}

print(json.dumps(results, ensure_ascii=False, indent=2))
