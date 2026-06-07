# -*- coding: utf-8 -*-
"""Create localized Shenzhen customer personas with company names & addresses"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace', 'report-images-safe')
os.makedirs(OUT, exist_ok=True)

personas = [
    {
        'title': 'S级 · 万科物业（深圳总部）',
        'company': '深圳市万科物业服务有限公司',
        'address': '深圳市福田区梅林路63号万科大厦',
        'buildings': '万科臻山府 / 万科瑧湾汇 / 万科云城',
        'needs': '安全合规 · 总部集中采购 · 科技物业示范',
        'budget': '年预算100-300万',
        'decision': '深圳总部工程总监→物业副总裁',
        'pain': '福田地王大厦安全事故教训·政策检查频繁',
        'color': (180, 60, 30),
        'priority': 'P0 · 距离哈工鹏泽最近'
    },
    {
        'title': 'S级 · 华润物业（深圳总部）',
        'company': '华润置地（深圳）物业有限公司',
        'address': '深圳市南山区粤海街道大冲一路华润置地大厦',
        'buildings': '华润万象天地 / 华润春笋 / 深圳湾悦府',
        'needs': '高品质保洁 · 品牌形象 · 总部战略采购',
        'budget': '年预算80-200万',
        'decision': '深圳湾总部采购中心→工程部',
        'pain': '深圳湾超总基地多栋幕墙需清洁·标准高',
        'color': (0, 80, 160),
        'priority': 'P0 · 南山重点客户'
    },
    {
        'title': 'A级 · 平安金融中心',
        'company': '深圳平安金融中心物业公司',
        'address': '深圳市福田区益田路5033号平安金融中心（599m）',
        'buildings': 'PAFC大厦 / 平安金融中心南塔',
        'needs': '超高层幕墙清洁 · 安全第一 · 形象标杆',
        'budget': '年预算50-150万',
        'decision': '物业总经理→平安不动产',
        'pain': '599米超高层·蜘蛛人清洗极危险·机器人刚需',
        'color': (0, 100, 160),
        'priority': 'P0 · 深圳地标级客户'
    },
    {
        'title': 'A级 · 京基100 · 瑞吉酒店',
        'company': '京基物业 / 瑞吉酒店管理',
        'address': '深圳市罗湖区深南东路5016号京基100大厦（441m）',
        'buildings': '京基100大厦 / KK MALL / 瑞吉酒店',
        'needs': '酒店幕墙形象 · 住客体验 · 高端维护',
        'budget': '年预算30-100万',
        'decision': '酒店总经理→物业总监',
        'pain': '罗湖老牌地标·幕墙老化需精细清洗',
        'color': (150, 100, 0),
        'priority': 'P1 · 罗湖标杆客户'
    },
    {
        'title': 'A级 · 深圳湾1号 · 莱佛士酒店',
        'company': '鹏瑞物业 / 莱佛士酒店',
        'address': '深圳市南山区中心路3008号深圳湾1号',
        'buildings': '深圳湾1号超高层/莱佛士酒店/湾汇商业',
        'needs': '顶级豪宅清洗 · 高端酒店 · 品质至上',
        'budget': '年预算30-80万',
        'decision': '物业总经理→业主委员会',
        'pain': '幕墙材质复杂（玻璃+金属）·不允许蜘蛛人',
        'color': (0, 120, 80),
        'priority': 'P1 · 南山高端客户'
    },
    {
        'title': 'B级 · 深圳市民中心 · 福田区政府',
        'company': '福田区机关事务管理局',
        'address': '深圳市福田区福中三路市民中心',
        'buildings': '市民中心 / 福田区政府大楼 / 会展中心',
        'needs': '安全第一 · 招投标制 · 预算保障',
        'budget': '项目预算50-200万',
        'decision': '招投标→机关事务管理局',
        'pain': '政府形象工程·频繁检查·安全要求极高',
        'color': (100, 50, 150),
        'priority': 'P2 · 需政企关系'
    },
    {
        'title': 'C级 · 深圳中小清洁公司',
        'company': '深圳各地区清洗服务商（约200家）',
        'address': '遍布福田/南山/罗湖/宝安/龙岗',
        'buildings': '各类中小型商业楼宇/住宅小区',
        'needs': '价格敏感 · 租赁模式 · 操作简单',
        'budget': '年预算5-20万',
        'decision': '老板直接决定',
        'pain': '资金周转·技术门槛·怕维护贵·怕机器坏',
        'color': (150, 100, 50),
        'priority': 'P2 · 量大但需教育'
    }
]

def create_card(persona, filepath):
    w, h = 780, 320
    img = Image.new('RGB', (w, h), 'white')
    draw = ImageDraw.Draw(img)
    
    try:
        ft = ImageFont.truetype("arial.ttf", 18)
        fb = ImageFont.truetype("arial.ttf", 13)
        fs = ImageFont.truetype("arial.ttf", 11)
    except:
        ft = fb = fs = ImageFont.load_default()
    
    c = persona['color']
    
    # Top bar
    draw.rectangle([(0, 0), (w, 60)], fill=c)
    draw.text((15, 12), persona['title'], fill='white', font=ft)
    
    # Priority badge right
    draw.rectangle([(w - 220, 8), (w - 15, 52)], fill=(255, 255, 255))
    draw.text((w - 210, 18), persona['priority'], fill=c, font=fs)
    
    y = 72
    lh = 24
    
    # Company
    draw.text((15, y), f"公司：{persona['company']}", fill=c, font=fb)
    y += lh
    
    # Address
    draw.text((15, y), f"地址：{persona['address']}", fill=(60, 60, 60), font=fb)
    y += lh
    
    # Buildings
    draw.text((15, y), f"管理项目：{persona['buildings']}", fill=(60, 60, 60), font=fb)
    y += lh + 5
    
    # Needs
    draw.rectangle([(15, y - 3), (w - 15, y + lh + 3)], fill=(235, 240, 255))
    draw.text((20, y), f"核心诉求：{persona['needs']}", fill=c, font=fb)
    y += lh + 8
    
    # Budget
    draw.text((15, y), f"预算：{persona['budget']}", fill=(0, 120, 60), font=fb)
    y += lh
    
    # Decision
    draw.text((300, y - lh), f"决策链：{persona['decision']}", fill=(80, 80, 80), font=fs)
    
    # Pain
    draw.text((15, y), f"痛点：{persona['pain']}", fill=(180, 40, 40), font=fs)
    
    # Bottom bar
    draw.rectangle([(0, h - 5), (w, h)], fill=c)
    
    img.save(filepath, 'PNG')
    print(f'{filepath}')

for p in personas:
    fn = f'深圳本地画像_{p["title"].replace(" ","").replace("·","-")}.png'
    fp = os.path.join(OUT, fn)
    create_card(p, fp)

print(f'Total: {len(personas)} local persona cards')
