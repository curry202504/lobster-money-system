# -*- coding: utf-8 -*-
"""Create visual persona cards/infographics for the report"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.environ['USERPROFILE'], '.openclaw', 'workspace', 'report-images-safe')
os.makedirs(OUT, exist_ok=True)

# Define personas
personas = [
    {
        'title': 'S级 · 超大型物业集团',
        'icon': '🏢',
        'examples': '万科物业 / 华润物业 / 碧桂园服务 / 保利物业',
        'needs': '安全合规 · 品牌形象 · 总部集中采购',
        'budget': '年预算 50-200万',
        'decision': '工程总监 → 副总裁 → 总部决策',
        'pain': '高空事故风险大 · 政策处罚压力 · 急需科技升级',
        'color': (0, 80, 160),
        'priority': 'P0 · 最优先攻坚'
    },
    {
        'title': 'A级 · 酒店管理集团',
        'icon': '🏨',
        'examples': '万豪 / 洲际 / 锦江 / 华住',
        'needs': '外立面形象 · 住客体验 · 品牌差异化',
        'budget': '年预算 20-80万',
        'decision': '总经理 → 工程部',
        'pain': '人工蜘蛛人不美观 · 清洁质量不稳定',
        'color': (180, 80, 0),
        'priority': 'P1 · 重点跟进'
    },
    {
        'title': 'A级 · 大型清洁公司',
        'icon': '🧹',
        'examples': '玉禾田（26亿+营收）等头部企业',
        'needs': '降本增效 · 用工替代 · 技术升级',
        'budget': '年预算 30-100万',
        'decision': '采购部 → 技术部',
        'pain': '招工难 · 人工成本年涨10-15% · 竞对压力',
        'color': (0, 120, 60),
        'priority': 'P1 · 重点跟进'
    },
    {
        'title': 'B级 · 政府及公建',
        'icon': '🏛️',
        'examples': '政务中心 / 机场 / 火车站 / 大型场馆',
        'needs': '安全合规 · 招投标制 · 预算有保障',
        'budget': '项目预算 30-150万',
        'decision': '招投标办公室',
        'pain': '安全事故问责 · 政府令强制清洗',
        'color': (100, 50, 150),
        'priority': 'P2 · 逐步布局'
    },
    {
        'title': 'C级 · 中小清洁公司',
        'icon': '🔧',
        'examples': '各地中小型清洗服务商',
        'needs': '价格敏感 · 租赁模式 · 技术门槛低',
        'budget': '年预算 5-30万',
        'decision': '老板直接决策',
        'pain': '资金有限 · 怕操作难 · 怕维护贵',
        'color': (150, 100, 0),
        'priority': 'P2 · 长期渗透'
    }
]

def create_persona_card(persona, filepath):
    w, h = 750, 280
    img = Image.new('RGB', (w, h), 'white')
    draw = ImageDraw.Draw(img)
    
    # Title bar
    draw.rectangle([(0, 0), (w, 65)], fill=persona['color'] + (255,))
    
    # Try to load fonts
    try:
        font_title = ImageFont.truetype("arial.ttf", 20)
        font_body = ImageFont.truetype("arial.ttf", 14)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except:
        font_title = ImageFont.load_default()
        font_body = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Title
    draw.text((20, 15), persona['title'], fill='white', font=font_title)
    
    # Priority badge
    p_color = persona['color']
    draw.rectangle([(w - 200, 10), (w - 20, 55)], fill=(255, 255, 255, 200))
    draw.text((w - 190, 20), persona['priority'], fill=p_color, font=font_body)
    
    y = 80
    line_h = 22
    
    # Example companies
    draw.text((20, y), f"代表客户：{persona['examples']}", fill=(50, 50, 50), font=font_body)
    y += line_h + 5
    
    # Core needs
    draw.text((20, y), f"核心诉求：{persona['needs']}", fill=p_color, font=font_body)
    y += line_h + 5
    
    # Budget
    draw.text((20, y), f"预算范围：{persona['budget']}", fill=(0, 120, 60), font=font_body)
    y += line_h + 5
    
    # Decision chain
    draw.rectangle([(20, y - 2), (w - 20, y + line_h + 2)], fill=(240, 245, 255))
    draw.text((25, y), f"决策流程：{persona['decision']}", fill=(80, 80, 80), font=font_body)
    y += line_h + 8
    
    # Pain points
    draw.text((20, y), f"核心痛点：{persona['pain']}", fill=(180, 50, 50), font=font_small)
    
    # Bottom divider line
    draw.line([(0, h - 1), (w, h - 1)], fill=persona['color'], width=3)
    
    img.save(filepath, 'PNG')
    print(f'Saved: {filepath}')

for p in personas:
    filename = f'用户画像_{p["title"].replace(" ","").replace("·","").replace("　","")}.png'
    filepath = os.path.join(OUT, filename)
    create_persona_card(p, filepath)

print(f'\nTotal: {len(personas)} persona images created')
