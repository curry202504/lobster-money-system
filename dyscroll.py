"""
抖音粉丝列表 v11 — 调试版，打印页面状态和 cookie
"""
import time, csv, os, json, re
from playwright.sync_api import sync_playwright

OUTPUT = os.path.expanduser(r"~\Desktop\dy_fans.csv")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context(viewport={"width": 1280, "height": 900}, locale="zh-CN")
        page = ctx.new_page()

        page.goto("https://www.douyin.com", wait_until="domcontentloaded")
        time.sleep(3)

        if "passport" in page.url or "login" in page.url:
            print("请用抖音 App 扫码登录")
            page.wait_for_url(lambda u: "passport" not in u and "login" not in u, timeout=120000)
            print("登录成功！")
            time.sleep(3)

        # 打印所有 cookie
        cookies = ctx.cookies()
        print("\n=== 所有 Cookie ===")
        for c in cookies:
            domain = c.get("domain", "")
            name = c["name"]
            val = c["value"][:40]
            print(f"  {domain:25s} {name:25s} = {val}")

        # 打印 localStorage
        try:
            ls = page.evaluate("JSON.stringify(window.localStorage)")
            ls_items = json.loads(ls)
            print("\n=== localStorage keys ===")
            for k in ls_items:
                v = ls_items[k]
                if isinstance(v, str) and len(v) > 50:
                    v = v[:50] + "..."
                print(f"  {k}: {v}")
        except:
            pass

        # 打印当前页面 URL
        print(f"\n当前 URL: {page.url}")
        
        # 尝试直接 fetch user profile API
        print("\n尝试调 user profile API...")
        try:
            result = page.evaluate("""async () => {
                const r = await fetch('/aweme/v1/web/user/profile/self/', {
                    credentials: 'include',
                    headers: {'Accept': 'application/json'}
                });
                return await r.json();
            }""")
            print(f"  status_code: {result.get('status_code')}")
            if result.get("status_code") == 0:
                user = result.get("user", {})
                print(f"  user: {user.get('nickname')} / sec_uid: {user.get('sec_uid')}")
        except Exception as e:
            print(f"  error: {e}")

        # 试试 follower list API
        print("\n尝试调 follower list API...")
        try:
            result = page.evaluate("""async () => {
                const r = await fetch('/aweme/v1/web/user/follower/list/?sec_user_id=x&count=1&offset=0', {
                    credentials: 'include',
                    headers: {'Accept': 'application/json'}
                });
                return await r.json();
            }""")
            print(f"  status_code: {result.get('status_code')}")
            print(f"  status_msg: {result.get('status_msg')}")
        except Exception as e:
            print(f"  error: {e}")

        input("\n按回车关闭...")
        browser.close()

if __name__ == "__main__":
    main()
