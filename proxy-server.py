#!/usr/bin/env python3
"""HTTP server serving proxy config in multiple formats."""
import http.server
import json
import base64
import urllib.parse

HOST = "0.0.0.0"
PORT = 8080

VLESS_LINK = "vless://550e8400-e29b-41d4-a716-446655440000@144.202.123.50:443?security=tls&type=tcp&flow=xtls-rprx-vision&encryption=none#Vultr-TLS"

HTML_PAGE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Proxy Config - Vultr VPS</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  max-width: 640px; margin: 0 auto; padding: 30px 20px 60px;
  background: #f8f9fa; color: #1a1a2e;
}
.card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin-bottom: 20px; }
h2 { font-size: 22px; margin-bottom: 8px; }
h3 { font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
h3 span { font-size: 20px; }
.link-box { background: #f0f4ff; border: 1px solid #d0d9ff; border-radius: 10px; padding: 14px; font-size: 13px; word-break: break-all; color: #333; user-select: all; margin: 8px 0 4px; line-height: 1.5; }
.copy-btn { display: inline-block; background: #4a6cf7; color: #fff; border: none; border-radius: 8px; padding: 8px 18px; font-size: 14px; cursor: pointer; margin-top: 10px; transition: background 0.2s; }
.copy-btn:hover { background: #3b5de7; }
.copy-btn:active { background: #2f4fd6; }
.copy-btn.copied { background: #10b981; }
.qr-row { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; margin: 16px 0 8px; }
.qr-item { text-align: center; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
.qr-item canvas { border-radius: 8px; }
.qr-item p { margin-top: 8px; font-size: 13px; color: #666; }
.qr-item .tag { font-size: 11px; color: #999; margin-top: 2px; }
ul { list-style: none; padding: 0; }
ul li { padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
ul li strong { min-width: 70px; }
.sub-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; font-size: 13px; word-break: break-all; margin: 8px 0; }
.info-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.info-table td { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; }
.info-table td:first-child { font-weight: 600; color: #555; width: 90px; }
.info-table tr:last-child td { border-bottom: none; }
.note { margin-top: 16px; padding: 12px 16px; background: #fff8e1; border-radius: 10px; font-size: 13px; color: #8d6e00; line-height: 1.5; }
</style>
</head>
<body>
<div class="card">
  <h2>Proxy Configuration</h2>
  <p style="color:#666;font-size:13px;">VPS Vultr · Los Angeles · VLESS + TLS</p>
</div>

<div class="card">
  <h3><span>🌐</span> 订阅链接（Subscription URLs）</h3>
  <p style="font-size:13px;color:#666;margin-bottom:8px;">在客户端中添加订阅时填入以下任一链接</p>
  <div class="sub-box" id="subV2ray">http://144.202.123.50:8080/sub/v2ray</div>
  <button class="copy-btn" onclick="copyText('subV2ray')" style="font-size:13px;margin-right:6px;">📋 v2rayNG</button>
  <div class="sub-box" id="subClash" style="margin-top:8px;">http://144.202.123.50:8080/sub/clash</div>
  <button class="copy-btn" onclick="copyText('subClash')" style="font-size:13px;margin-right:6px;">📋 Clash/Mihomo</button>
  <div class="sub-box" id="subSingbox" style="margin-top:8px;">http://144.202.123.50:8080/sub/singbox</div>
  <button class="copy-btn" onclick="copyText('subSingbox')" style="font-size:13px;">📋 Sing-box</button>
</div>

<div class="card">
  <h3><span>🔗</span> 分享链接</h3>
  <p style="font-size:13px;color:#666;margin-bottom:8px;">扫码或复制，在客户端中导入</p>
  <div class="link-box" id="shareLink">vless://550e8400-e29b-41d4-a716-446655440000@144.202.123.50:443?security=tls&type=tcp&flow=xtls-rprx-vision&encryption=none#Vultr-TLS</div>
  <button class="copy-btn" onclick="copyLink()">📋 复制链接</button>
</div>

<div class="card">
  <h3><span>📱</span> 扫码导入</h3>
  <div class="qr-row">
    <div class="qr-item">
      <div id="qrcode-link"></div>
      <p>vless 链接</p>
      <span class="tag">通用扫码</span>
    </div>
    <div class="qr-item">
      <div id="qrcode-sub"></div>
      <p>订阅链接</p>
      <span class="tag">http://</span>
    </div>
  </div>
</div>

<div class="card">
  <h3><span>📋</span> 参数一览</h3>
  <table class="info-table">
    <tr><td>协议</td><td>VLESS</td></tr>
    <tr><td>地址</td><td>144.202.123.50</td></tr>
    <tr><td>端口</td><td>443</td></tr>
    <tr><td>UUID</td><td>550e8400-e29b-41d4-a716-446655440000</td></tr>
    <tr><td>Flow</td><td>xtls-rprx-vision</td></tr>
    <tr><td>传输</td><td>TCP</td></tr>
    <tr><td>安全</td><td>TLS</td></tr>
    <tr><td>加密</td><td>none</td></tr>
  </table>
</div>

<div class="card">
  <h3><span>📲</span> 推荐客户端</h3>
  <ul>
    <li><strong>Android</strong> v2rayNG / NekoBox / Hiddify / Clash Meta</li>
    <li><strong>iOS</strong> Shadowrocket / V2Box / Stash / FoXray / Sing-box</li>
  </ul>
</div>

<div class="note">
  ⚠️ 证书为自签名证书，客户端需开启「允许不安全连接」<br>
  Shadowrocket: 节点详情 → Allow Insecure 打开<br>
  v2rayNG: 节点设置 → 允许不安全连接 打开
</div>

<script>
function copyText(id) {
  const text = document.getElementById(id).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btns = document.querySelectorAll('.copy-btn');
    btns.forEach(b => {
      if (b.textContent.includes(id.replace('sub','').replace('V2ray','v2rayNG'))) return;
    });
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '\u2705 \u5df2\u590d\u5236';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
  });
}

function copyLink() {
  const link = document.getElementById('shareLink').textContent;
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.querySelector('.copy-btn:not([onclick*=\"copyText\"])');
    btn.textContent = '\u2705 \u5df2\u590d\u5236';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '\U0001f4cb \u590d\u5236\u94fe\u63a5'; btn.classList.remove('copied'); }, 2000);
  });
}

window.onload = function() {
  const link = document.getElementById('shareLink').textContent;
  new QRCode(document.getElementById('qrcode-link'), { text: link, width: 200, height: 200, colorDark: '#1a1a2e', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  new QRCode(document.getElementById('qrcode-sub'), { text: 'http://144.202.123.50:8080/sub/v2ray', width: 200, height: 200, colorDark: '#1a1a2e', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
};
</script>
</body>
</html>"""

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        body = json.dumps(data, indent=2)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body.encode())))
        self.end_headers()
        self.wfile.write(body.encode())

    def _send_text(self, text, content_type="text/plain; charset=utf-8", status=200):
        body = text.encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, html, status=200):
        self._send_text(html, "text/html; charset=utf-8", status)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")

        # --- v2rayNG base64 subscription ---
        if path == "/sub/v2ray":
            encoded = base64.b64encode(VLESS_LINK.encode()).decode()
            self._send_text(encoded, "text/plain; charset=utf-8")

        # --- Clash/Mihomo YAML ---
        elif path == "/sub/clash":
            clash = (
                "port: 7890\n"
                "socks-port: 7891\n"
                "allow-lan: true\n"
                "mode: rule\n"
                "log-level: info\n"
                "\n"
                "proxies:\n"
                "  - name: Vultr-TLS\n"
                "    type: vless\n"
                "    server: 144.202.123.50\n"
                "    port: 443\n"
                "    uuid: 550e8400-e29b-41d4-a716-446655440000\n"
                "    tls: true\n"
                "    skip-cert-verify: true\n"
                "    network: tcp\n"
                "    flow: xtls-rprx-vision\n"
                "    udp: true\n"
                "\n"
                "proxy-groups:\n"
                "  - name: Proxy\n"
                "    type: select\n"
                "    proxies:\n"
                "      - Vultr-TLS\n"
                "\n"
                "rules:\n"
                "  - GEOIP,CN,DIRECT\n"
                "  - MATCH,Proxy\n"
            )
            self._send_text(clash, "text/yaml; charset=utf-8")

        # --- Sing-box JSON ---
        elif path == "/sub/singbox":
            singbox = {
                "log": {"level": "info"},
                "dns": {
                    "servers": [
                        {"address": "https://1.1.1.1/dns-query", "detour": "proxy"},
                        {"address": "223.5.5.5", "detour": "direct", "tag": "dns-direct"}
                    ]
                },
                "inbounds": [
                    {"type": "mixed", "tag": "mixed-in", "listen": "127.0.0.1", "listen_port": 2080},
                    {"type": "tun", "tag": "tun-in", "mtu": 1500}
                ],
                "outbounds": [
                    {
                        "type": "vless",
                        "tag": "Vultr-TLS",
                        "server": "144.202.123.50",
                        "server_port": 443,
                        "uuid": "550e8400-e29b-41d4-a716-446655440000",
                        "flow": "xtls-rprx-vision",
                        "tls": {
                            "enabled": True,
                            "insecure": True
                        },
                        "multiplex": {
                            "enabled": True,
                            "protocol": "h2mux"
                        }
                    },
                    {"type": "direct", "tag": "direct"}
                ],
                "route": {
                    "rules": [
                        {"protocol": "dns", "outbound": "dns-out"},
                        {"geoip": "cn", "outbound": "direct"},
                        {"geosite": "cn", "outbound": "direct"}
                    ],
                    "auto_detect_interface": True
                }
            }
            self._send_json(singbox)

        # --- HTML page ---
        elif path in ("", "/", "/index.html", "/proxy-config.html"):
            self._send_html(HTML_PAGE)

        else:
            self._send_text("404 Not Found", status=404)

    def log_message(self, format, *args):
        # Quiet logging
        pass

if __name__ == "__main__":
    server = http.server.HTTPServer((HOST, PORT), ProxyHandler)
    print(f"Serving proxy config at http://{HOST}:{PORT}")
    server.serve_forever()
