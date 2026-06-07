"""
用 dy-cli API 客户端批量拉取用户资料（性别/年龄/地区）
先确保 dy login 已登录
"""
import time, csv, os, json, re, sys
sys.path.insert(0, os.path.expanduser(r"~\AppData\Local\Programs\Python\Python310\lib\site-packages"))

INPUT_CSV = r"C:\Users\tu\Desktop\猴系粉丝名单.csv"
OUTPUT_DIR = r"C:\Users\tu\Desktop"
OUTPUT_ALL = os.path.join(OUTPUT_DIR, "猴系粉丝_完整资料.csv")
OUTPUT_FILTER = os.path.join(OUTPUT_DIR, "猴系粉丝_20-26岁女性.csv")
OUTPUT_GD = os.path.join(OUTPUT_DIR, "猴系粉丝_20-26岁广东女生.csv")

from dy_cli.engines.api_client import DouyinAPIClient, DouyinAPIError
from dy_cli.utils.signature import get_base_params, get_headers
from dy_cli.utils.config import get_cookie_file

def load_targets():
    targets = []
    with open(INPUT_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            link = (r.get("抖音主页链接") or r.get("链接") or "").strip()
            nick = (r.get("粉丝昵称") or r.get("昵称") or "").strip()
            reason = (r.get("匹配原因") or "").strip()
            sec_uid = ""
            if link:
                m = re.search(r'/user/([^/?\s]+)', link)
                if m:
                    sec_uid = m.group(1)
            targets.append({"nick": nick, "sec_uid": sec_uid, "link": link, "reason": reason,
                            "gender": "", "age": "", "region": ""})
    return targets

def main():
    # 检查 cookie
    cookie_file = get_cookie_file()
    if not os.path.exists(cookie_file):
        print("❌ 未登录，请先运行: dy login")
        return

    # 读取 cookie 检查是否有真正的 session
    with open(cookie_file, "r", encoding="utf-8") as f:
        cd = json.load(f)
    cookies = {c["name"]: c["value"][:20] for c in cd.get("cookies", []) if "douyin" in c.get("domain","")}
    print("Cookie keys:", list(cookies.keys()))
    has_real = any(k in cookies for k in ["sessionid", "sid_tt", "sid_uc", "sid_guard"])
    if not has_real:
        print("⚠️ Cookie 不含真正的登录态，建议: dy login")
        # 但先试试能不能用

    # 创建 API 客户端
    try:
        client = DouyinAPIClient.from_config()
    except Exception as e:
        print(f"❌ 创建客户端失败: {e}")
        return

    targets = load_targets()
    print(f"\n需要查询 {len(targets)} 个用户资料\n")

    successes = 0
    for i, t in enumerate(targets, 1):
        sec_uid = t["sec_uid"]
        nick = t["nick"]
        print(f"[{i}/{len(targets)}] {nick[:20]}", end="", flush=True)

        if not sec_uid:
            print(" ❌ 无 sec_uid")
            continue

        try:
            user = client.get_user_profile(sec_uid)
            if user:
                # 提取
                region = user.get("ip_location", "") or user.get("region", "") or ""
                gender_code = user.get("gender", 0)
                gender = {1: "男", 2: "女"}.get(gender_code, "")
                age = ""
                birthday = user.get("birthday", "") or user.get("birth", "") or ""
                if birthday and len(birthday) >= 4:
                    try:
                        birth_year = int(birthday[:4])
                        age = str(2026 - birth_year)
                    except:
                        pass
                t["region"] = region
                t["gender"] = gender
                t["age"] = age
                print(f" ✅ {gender or '?'} {age or '?'}岁 {region or '?'}")
                successes += 1
            else:
                print(" ⚠️ 空响应")
        except DouyinAPIError as e:
            print(f" ❌ {str(e)[:40]}")
        except Exception as e:
            print(f" ❌ {str(e)[:40]}")

        time.sleep(0.5)

    print(f"\n✅ 成功获取: {successes}/{len(targets)}")

    client.close()

    # === 写完整资料 ===
    results = targets
    with open(OUTPUT_ALL, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["序号","昵称","匹配原因","性别","年龄","地区","抖音主页链接"])
        for i, r in enumerate(results, 1):
            w.writerow([i, r["nick"], r["reason"], r["gender"], r["age"], r["region"], r["link"]])

    print(f"\n📄 完整资料: {OUTPUT_ALL}")

    # === 打印完整表 ===
    print(f"\n{'='*60}")
    print(f"  31人完整资料")
    print(f"{'='*60}")
    print(f"  {'#':3s} {'昵称':<20s} {'性别':4s} {'年龄':4s} {'地区':<12s}")
    print(f"  {'-'*55}")
    for i, r in enumerate(results, 1):
        n = r["nick"][:18]
        g = r["gender"] or "?"
        a = r["age"] or "?"
        reg = r["region"] or "?"
        print(f"  {i:3d} {n:<20s} {g:4s} {a:4s} {reg:<12s}")

    # === 20-26岁女性 ===
    filtered = [r for r in results if r["gender"] == "女" and r["age"].isdigit() and 20 <= int(r["age"]) <= 26]

    with open(OUTPUT_FILTER, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["序号","昵称","匹配原因","年龄","地区","抖音主页链接"])
        for i, r in enumerate(filtered, 1):
            w.writerow([i, r["nick"], r["reason"], r["age"], r["region"], r["link"]])

    print(f"\n{'='*60}")
    print(f"  🎯 20-26岁女性: {len(filtered)} 人")
    print(f"{'='*60}")
    if filtered:
        for i, r in enumerate(filtered, 1):
            print(f"  {i:2d}. {r['nick'][:18]:<18s} {r['age']}岁 {r['region']}")
            print(f"      {r['link']}")
    else:
        print("  (暂无符合条件的)")

    # === 广东 ===
    gd_cities = ["广东","广州","深圳","东莞","佛山","珠海","惠州","中山","汕头","湛江","肇庆","江门","茂名","梅州","清远","韶关","河源","汕尾","潮州","揭阳","阳江","云浮"]
    gd = [r for r in filtered if any(k in r.get("region","") for k in gd_cities)]

    with open(OUTPUT_GD, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["序号","昵称","匹配原因","年龄","地区","抖音主页链接"])
        for i, r in enumerate(gd, 1):
            w.writerow([i, r["nick"], r["reason"], r["age"], r["region"], r["link"]])

    print(f"\n{'='*60}")
    print(f"  🎯 20-26岁·广东女生: {len(gd)} 人")
    print(f"{'='*60}")
    if gd:
        for i, r in enumerate(gd, 1):
            print(f"  {i:2d}. {r['nick'][:18]:<18s} {r['age']}岁 {r['region']}")
            print(f"      {r['link']}")
    else:
        print("  (暂无符合条件的)")

    print(f"\n📄 桌面文件:")
    print(f"   1. 猴系粉丝_完整资料.csv — 全部31人")
    print(f"   2. 猴系粉丝_20-26岁女性.csv")
    print(f"   3. 猴系粉丝_20-26岁广东女生.csv")

if __name__ == "__main__":
    main()
