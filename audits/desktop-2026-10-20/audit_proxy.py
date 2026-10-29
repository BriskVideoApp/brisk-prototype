"""Temporary loopback-only audit origin. No application or working storage edits."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import argparse

UPSTREAM = "http://127.0.0.1:3000"
HOP_HEADERS = {"connection", "transfer-encoding", "content-length", "keep-alive"}


class AuditProxy(BaseHTTPRequestHandler):
    def do_GET(self):
        headers = {key: value for key, value in self.headers.items()
                   if key.lower() not in {"host", "connection", "accept-encoding"}}
        request = Request(UPSTREAM + self.path, headers=headers)
        try:
            response = urlopen(request, timeout=90)
        except HTTPError as error:
            response = error
        body = response.read()
        self.send_response(response.status)
        for key, value in response.headers.items():
            if key.lower() not in HOP_HEADERS:
                self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8766)
    args = parser.parse_args()
    print(f"Disposable audit origin: http://127.0.0.1:{args.port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), AuditProxy).serve_forever()
