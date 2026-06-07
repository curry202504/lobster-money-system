import json
d = json.load(open(r'C:\Users\tu\.openclaw\workspace\openai_prices.json'))
countries = ['usa','england','canada','australia','indonesia','philippines','india','germany','france','italy','spain','brazil','japan','netherlands','poland','mexico','argentina','southafrica','taiwan']
for c in countries:
    if c in d['openai']:
        items = []
        for op,info in d['openai'][c].items():
            if isinstance(info, dict) and info.get('count', 0) > 0:
                items.append((op, info))
        if items:
            items.sort(key=lambda x: x[1]['cost'])
            print(f'--- {c} ---')
            for op, info in items:
                rate = info.get('rate', 'N/A')
                print(f'  {op}: ${info["cost"]}, qty={info["count"]}, rate={rate}%')
