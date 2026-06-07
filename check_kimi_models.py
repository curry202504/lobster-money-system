# -*- coding: utf-8 -*-
"""Check latest Kimi/Moonshot models available"""
import json, os, requests

cfg_path = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'agents', 'main', 'agent', 'models.json')
with open(cfg_path, 'r') as f:
    cfg = json.load(f)

moonshot = cfg['providers']['moonshot']
api_key = moonshot['apiKey']
base_url = moonshot['baseUrl']

print(f'Current configured models:')
for m in moonshot['models']:
    print(f'  {m["id"]} - supports image: {"image" in m.get("input", [])}')

print(f'\nChecking API for latest models...')
headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json',
}
try:
    r = requests.get(f'{base_url}/models', headers=headers, timeout=15)
    data = r.json()
    if 'data' in data:
        print(f'Available from API ({len(data["data"])} models):')
        for m in data['data']:
            print(f'  {m["id"]}')
    else:
        print(f'Response: {r.text[:500]}')
except Exception as e:
    print(f'Error: {e}')
