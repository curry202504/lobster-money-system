# -*- coding: utf-8 -*-
"""Search Baidu for official company websites and product info"""
import requests, re, json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
}

searches = [
    '哈工鹏泽 深圳 机器人 有限公司 官网',
    '埃欧珞 杭州 机器人 官网',
    '凌度智能 广东 幕墙清洗 机器人 官网',
]

for q in searches:
    print(f'\n=== {q[:20]}... ===')
    url = 'https://www.baidu.com/s?wd=' + requests.utils.quote(q)
    try:
        r = requests.get(url, headers=headers, timeout=15)
        text = r.text
        
        # Find all href links from result items
        hrefs = re.findall(r'href="(https?://[^"]+)"', text)
        for h in hrefs:
            if any(skip in h for skip in ['baidu.com', 'baiducontent', 'beian']):
                continue
            # Decode Baidu redirect URLs
            decoded = requests.utils.unquote(h)
            if 'http' in decoded:
                # Extract the actual URL from Baidu's redirect
                real_url = re.findall(r'https?://[^&]+', decoded)
                if real_url:
                    print(f'  {real_url[0][:120]}')
    except Exception as e:
        print(f'  Error: {e}')
