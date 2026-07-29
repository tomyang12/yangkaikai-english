#!/usr/bin/env python3
"""Simple static file server with SPA fallback (all non-file routes → index.html)."""

import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__)) + "/dist"


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # If the path doesn't exist as a file, serve index.html (SPA fallback)
        file_path = os.path.join(DIRECTORY, self.path.lstrip("/"))
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", PORT), SPAHandler)
    print(f"Serving SPA from {DIRECTORY} on 0.0.0.0:{PORT}")
    server.serve_forever()
