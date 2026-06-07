import requests
import os

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

output_dir = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace', 'report-images')
os.makedirs(output_dir, exist_ok=True)

# Try to find actual product images from known article sources
image_urls = {
    # 哈工鹏泽 - from sogou search results
    '哈工鹏泽-重载机器人': 'https://news.sznews.com/pic/2026-04/',
    # Let's try to find the actual image URLs from the sogou thumbnails
}

# Try to download Sogou thumbnails (they redirect to actual images)
sogou_urls = {
    '哈工鹏泽-产品图': 'https://img01.sogoucdn.com/v2/thumb/crop/xy/ai/x/0/y/0/w/300/h/200/iw/225/ih/150/t/0/ir/3/retype_exclude_gif/ext/auto/q/75?t=2&appid=200997&url=https%3A%2F%2Fnews.sznews.com%2Fpic%2F2026-04%2F',
    '埃欧珞-产品图': 'https://img04.sogoucdn.com/v2/thumb/crop/xy/ai/x/0/y/0/w/300/h/200/iw/225/ih/150/t/0/ir/3/retype_exclude_gif/ext/auto/q/75?t=2&appid=200997&url=http%3A%2F%2Fimages.ofweek.com%2FUpload%2FNews%2F',
    '凌度-产品图': 'https://img01.sogoucdn.com/v2/thumb/crop/xy/ai/x/0/y/0/w/300/h/200/iw/225/ih/150/t/0/ir/3/retype_exclude_gif/ext/auto/q/75?t=2&appid=200997&url=https%3A%2F%2Fp9.itc.cn%2Fq_70%2Fimages01%2F2023',
}

for name, url in sogou_urls.items():
    try:
        r = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        if r.status_code == 200:
            ext = '.jpg'
            if 'image' in r.headers.get('Content-Type', ''):
                ct = r.headers['Content-Type']
                if 'png' in ct: ext = '.png'
                elif 'gif' in ct: ext = '.gif'
                elif 'webp' in ct: ext = '.webp'
                fpath = os.path.join(output_dir, f'{name}{ext}')
                with open(fpath, 'wb') as f:
                    f.write(r.content)
                print(f'{name}: Downloaded {len(r.content)} bytes -> {fpath}')
            else:
                print(f'{name}: Not an image. Status={r.status_code}, Content-Type={r.headers.get("Content-Type")}')
        else:
            print(f'{name}: Failed with status {r.status_code}')
    except Exception as e:
        print(f'{name}: Error: {e}')

# Also try to find and save direct images from the competitor websites
print('\n--- Trying direct competitor URLs ---')
competitor_urls = {
    '哈工鹏泽-官网': 'https://www.hitpengze.com' if False else None,
}

print('\nDone.')
