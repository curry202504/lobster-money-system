"""
从抖音粉丝名单中筛选出可能跟"猴子"有关联的粉丝
"""
import csv, os

INPUT_FILE = r"C:\Users\tu\.openclaw\media\inbound\抖音粉丝名单_累计6235人---3032f11b-77cb-4d4d-8737-6a460797301f.csv"
OUTPUT_FILE = r"C:\Users\tu\Desktop\猴系粉丝名单.csv"

MONKEY_WORDS = {
    "猴科": ["猴", "猿", "猩", "狒", "猢", "狲"],
    "孙悟空": ["悟空", "大圣", "齐天", "孙悟", "美猴王", "行者孙", "孙行者",
               "弼马温", "金箍", "花果山", "水帘洞", "筋斗云", "火眼金睛",
               "斗战胜佛", "胜佛", "七十二变", "大闹天宫", "齐天大圣"],
    "西游": ["西游", "唐僧", "取经", "金蝉", "八戒", "猪八戒", "沙僧",
             "沙和尚", "牛魔王", "铁扇", "红孩儿", "白骨精", "女儿国",
             "火焰山", "盘丝洞", "五行山", "紧箍"],
    "食物": ["香蕉", "banana", "芭蕉", "大蕉", "桃子", "蟠桃", "水蜜桃", "水果"],
    "龙珠": ["龙珠", "七龙珠", "卡卡罗特", "kakarot", "goku",
            "赛亚", "悟饭", "悟天", "贝吉塔", "龟派气功", "神龙"],
    "生肖": ["申猴", "猴年", "属猴", "猴生肖"],
    "英文": ["monkey", "ape", "monke", "gorilla", "chimp", "simian", "primate"],
    "俗语": ["猴赛雷", "泼猴", "石猴", "猴哥", "耍猴", "杀鸡儆猴",
            "树倒猢狲散", "猴年马月", "山上无老虎"],
}

MONKEY_EMOJI = set("🐒🐵🙈🙉🙊🦧🍌🍑")

def match(text):
    if not text:
        return ""
    t = text.lower()
    results = []
    for cat, kws in MONKEY_WORDS.items():
        for kw in kws:
            if kw in t:
                results.append(f"[{cat}] {kw}")
                break
    for ch in text:
        if ch in MONKEY_EMOJI:
            results.append(f"[emoji] {ch}")
            break
    return " | ".join(results[:2]) if results else ""

def main():
    with open(INPUT_FILE, "r", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    col_nick = "粉丝昵称"
    col_uid = "个人主页ID(sec_uid)"
    col_sig = "个性签名"
    col_link = "个人主页链接"

    matched = []
    for r in rows:
        nick = r.get(col_nick, "").strip()
        sig = r.get(col_sig, "").strip()
        uid = r.get(col_uid, "").strip()
        link = r.get(col_link, "").strip()
        reason = match(nick) or match(sig)
        if reason:
            cat = reason.split("]")[0].strip("[").split()[0] if "]" in reason else "其他"
            matched.append((nick, reason, cat, sig[:60] if sig else "", uid, link))

    # 去重
    seen = set()
    unique = []
    for n, r, c, s, u, l in matched:
        key = (n, u)
        if key not in seen:
            seen.add(key)
            unique.append((n, r, c, s, u, l))

    # === 输出 CSV ===
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["序号", "粉丝昵称", "匹配原因", "分类", "个性签名", "抖音主页链接"])
        for i, (n, r, c, s, u, l) in enumerate(unique, 1):
            w.writerow([i, n, r, c, s, l])

    # === 输出表格到聊天 ===
    print(f"\n📊 总粉丝: {len(rows)} 人  →  猴系关联: {len(unique)} 人\n")

    # 按分类分组显示
    groups = {}
    for n, r, c, s, u, l in unique:
        groups.setdefault(c, []).append((n, s, l))

    for cat in ["猴科", "孙悟空", "西游", "食物", "emoji"]:
        items = groups.get(cat, [])
        if not items:
            continue
        emoji_map = {"猴科": "🐒", "孙悟空": "🪄", "西游": "📖", "食物": "🍌", "emoji": "🎭"}
        e = emoji_map.get(cat, "")
        print(f"\n{'='*60}")
        print(f" {e} {cat}")
        print(f"{'='*60}")
        for i, (n, s, l) in enumerate(items, 1):
            link_short = l[:50] + "..." if len(l) > 50 else l
            print(f"  {i:2d}. {n}")
            print(f"      链接: {link_short}")
            if s:
                print(f"      签名: {s[:50]}")

    # 分类统计一行
    print(f"\n{'='*60}")
    cat_counts = {}
    for _, _, c, _, _, _ in unique:
        cat_counts[c] = cat_counts.get(c, 0) + 1
    parts = [f"{k} {v}人" for k, v in sorted(cat_counts.items(), key=lambda x: -x[1])]
    print("  分类统计: " + " | ".join(parts))

    print(f"\n📄 完整列表已保存: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
