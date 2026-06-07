#!/usr/bin/env python3
"""Simple forward HTTP proxy for OpenAI registration."""
import http.server
import urllib.request
import select
import socket
import sys

PROXY_PORT = 8081
PROXY_HOST = "0.0.0.0"

class ProxyRequestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self._proxy_request()
    
    def do_POST(self):
        self._proxy_request()
    
    def do_CONNECT(self):
        # HTTPS CONNECT tunnel
        host, port = self.path.split(":")
        port = int(port)
        try:
            remote = socket.create_connection((host, port), timeout=30)
            self.send_response(200, "Connection Established")
            self.end_headers()
            
            # Tunnel data
            self.connection.setblocking(False)
            remote.setblocking(False)
            while True:
                r, _, _ = select.select([self.connection, remote], [], [], 1)
                if self.connection in r:
                    data = self.connection.recv(4096)
                    if not data:
                        break
                    remote.sendall(data)
                if remote in r:
                    data = remote.recv(4096)
                    if not data:
                        break
                    self.connection.sendall(data)
            remote.close()
        except Exception as e:
            self.send_error(502, f"Tunnel failed: {e}")

    def _proxy_request(self):
        try:
            url = self.path
            data = None
            if self.command == "POST":
                length = int(self.headers.get("Content-Length", 0))
                data = self.rfile.read(length)
            
            req = urllib.request.Request(url, data=data, headers=dict(self.headers), method=self.command)
            
            with urllib.request.urlopen(req, timeout=30) as resp:
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ("transfer-encoding", "content-encoding"):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp.read())
        except Exception as e:
            self.send_error(502, str(e))
    
    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    server = http.server.HTTPServer((PROXY_HOST, PROXY_PORT), ProxyRequestHandler)
    print(f"HTTP Proxy running on {PROXY_HOST}:{PROXY_PORT}")
    server.serve_forever()
