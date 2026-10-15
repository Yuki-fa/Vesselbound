#!/usr/bin/env python3
"""prototypeを配信し、VFX LABの確定JSONだけを書き込む。外部パッケージ不要。"""
import functools
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
MAX_BYTES = 1_000_000
KINDS = {"character", "enchant", "item", "ring", "enemy", "npc", "board", "keyword", "other"}


def validate(data):
    def require(ok, message):
        if not ok:
            raise ValueError(message)

    def text(value):
        return isinstance(value, str) and len(value) <= 300

    require(isinstance(data, dict) and type(data.get("version")) is int and data["version"] == 1, "versionは1")
    stamp = data.get("savedAt")
    require(isinstance(stamp, str), "savedAtはISO時刻")
    datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    require(isinstance(data.get("effects"), dict), "effectsはオブジェクト")
    require(isinstance(data.get("suppressGeneric"), dict), "suppressGenericはオブジェクト")
    for name, effect in data["effects"].items():
        require(text(name) and name not in {"__proto__", "constructor", "prototype"}, "効果名が不正")
        require(isinstance(effect, dict) and text(effect.get("title")) and effect["title"].strip(), "見出しが空")
        tags = effect.get("tags")
        require(isinstance(tags, list) and len(tags) <= 30 and all(text(t) for t in tags), "tagsが不正")
        assigns = effect.get("assign")
        require(isinstance(assigns, list) and len(assigns) <= 10, "割り振りは10件まで")
        for item in assigns:
            require(isinstance(item, dict) and item.get("kind") in KINDS, "割り振り種別が不正")
            require(text(item.get("id")) and item["id"].strip() and text(item.get("name")) and item["name"].strip(), "割り振り先が空")
            require("trigger" in item and (item["trigger"] is None or text(item["trigger"])), "triggerが不正")
            require("se" in item and (item["se"] is None or text(item["se"])), "seが不正")
    import re
    for number, items in data["suppressGeneric"].items():
        require(re.fullmatch(r"[A-Z]+\d{3}(?:_\d+)?", number) is not None, "抑止の対象番号が不正")
        require(isinstance(items, list) and all(text(i) for i in items), "抑止が不正")
    return data


def atomic_write(path, content):
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".lab-save-", delete=False) as stream:
        temporary = Path(stream.name)
        try:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        except BaseException:
            temporary.unlink(missing_ok=True)
            raise
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        if urlsplit(self.path).path.endswith(("lab_assignments.json", "lab_assignments.prev.json")):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def reply(self, code, data):
        content = (json.dumps(data, ensure_ascii=False) + "\n").encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        if self.path != "/__vfx_lab/save":
            self.reply(404, {"ok": False, "error": "このPOSTは未対応"})
            return
        port = self.server.server_port
        allowed = {f"127.0.0.1:{port}", f"localhost:{port}"}
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin")
        if host not in allowed or (origin and origin not in {f"http://{h}" for h in allowed}):
            self.reply(403, {"ok": False, "error": "ローカルLABからだけ保存できます"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_BYTES:
                self.reply(413, {"ok": False, "error": "JSONは1MBまで"})
                return
            if self.headers.get_content_type() != "application/json":
                self.reply(415, {"ok": False, "error": "application/jsonが必要"})
                return
            data = validate(json.loads(self.rfile.read(length).decode("utf-8")))
            content = (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
            with self.server.save_lock:
                target = self.server.lab_root / "tools/vfx_preview/lab_assignments.json"
                previous = target.with_name("lab_assignments.prev.json")
                # 固定の保存先。リクエストのパスやJSONの値をファイル名に使わない。
                for entry in (target, previous):
                    if entry.is_symlink():
                        raise ValueError("保存先がシンボリックリンクです")
                if target.exists():
                    atomic_write(previous, target.read_bytes())
                atomic_write(target, content)
            self.reply(200, {"ok": True, "savedAt": data["savedAt"], "file": "tools/vfx_preview/lab_assignments.json"})
        except (ValueError, UnicodeError, KeyError, TypeError) as error:
            self.reply(400, {"ok": False, "error": str(error)})
        except OSError as error:
            self.reply(500, {"ok": False, "error": str(error)})


def create_server(port, root=ROOT):
    root = Path(root).resolve()
    server = ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=str(root)))
    server.lab_root = root
    server.save_lock = threading.Lock()
    return server


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    server = create_server(port)
    print(f"VFX LAB http://127.0.0.1:{server.server_port}/tools/vfx_preview.html", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
