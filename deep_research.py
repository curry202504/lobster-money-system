# -*- coding: utf-8 -*-
"""Deep research for the report - find more data"""
import os
import requests
import re
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
}

def search_sogou(query):
    url = 'https://www.sogou.com/web?query=' + requests.utils.quote(query)
    try:
        r = requests.get(url, headers=headers, timeout=15)
        # Extract result snippets
        snippets = re.findall(r'<p[^>]*class="str_info"[^>]*>(.*?)</p>', r.text, re.DOTALL)
        titles = re.findall(r'<h3[^>]*>(.*?)</h3>', r.text, re.DOTALL)
        links = re.findall(r'id="[^"]*"\s+href="([^"]+)"', r.text)
        results = []
        for i in range(min(len(titles), 10)):
            title = re.sub(r'<[^>]+>', '', titles[i]).strip()
            link = links[i] if i < len(links) else ''
            snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip() if i < len(snippets) else ''
            results.append({'title': title, 'snippet': snippet[:200]})
        return results
    except:
        return []

# Research queries
queries = [
    '哈工鹏泽 杨剑 GE02 产品参数 技术指标',
    '中国高空幕墙清洗 行业市场规模 年产值',
    '埃欧珞 高空清洁机器人 价格 代理条件',
    '凌度智能 凌空K3 产品参数 价格',
    '高空清洗机器人 行业报告 2025 2026 市场',
    '蜘蛛人 高空作业 安全事故 政策 禁用',
    '万科 物业 机器人 外墙清洗 采购',
    '高空清洗机器人 租赁 模式 回报周期',
    '哈工鹏泽 GE05 横向清洗 产品发布',
    '玉禾田 高空清洗 机器人 智能化',
]

print('=== Deep Research Results ===')
all_results = {}
for q in queries:
    results = search_sogou(q)
    print(f'\n--- {q[:25]}... ---')
    for r in results[:5]:
        print(f'  {r["title"][:80]}')
        print(f'  {r["snippet"][:150]}')
    all_results[q] = results

# Save results
with open(os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace', 'research_data.json'), 'w', encoding='utf-8') as f:
    json.dump(all_results, f, ensure_ascii=False, indent=2)

print('\nDone!')
