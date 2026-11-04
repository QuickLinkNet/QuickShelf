import json
import os
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer

DATA_ROOT = os.environ.get("OCR_DATA_ROOT", "/data")


def normalize_path(path: str) -> str:
    path = path.replace("\\", "/")
    if not path.startswith("/"):
        path = "/" + path
    return os.path.normpath(path)


def resolve_path(path: str) -> str | None:
    path = normalize_path(path)
    if path.startswith(".."):
        return None
    full = os.path.realpath(os.path.join(DATA_ROOT, path.lstrip("/")))
    root = os.path.realpath(DATA_ROOT)
    if not full.startswith(root):
        return None
    return full


def run_tesseract(image_path: str) -> str | None:
    cmd = ["tesseract", image_path, "stdout", "-l", "deu+eng"]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        return None
    return proc.stdout.decode("utf-8", errors="ignore")


def run_pdf_ocr(pdf_path: str) -> str | None:
    with tempfile.TemporaryDirectory() as tmp:
        prefix = os.path.join(tmp, "page")
        cmd = ["pdftoppm", "-png", pdf_path, prefix]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            return None
        texts = []
        for name in sorted(os.listdir(tmp)):
            if not name.endswith(".png"):
                continue
            text = run_tesseract(os.path.join(tmp, name))
            if text:
                texts.append(text)
        if not texts:
            return None
        return "\n".join(texts)


class Handler(BaseHTTPRequestHandler):
    def _json(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/health":
            return self._json(200, {"status": "ok"})
        return self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/ocr":
            return self._json(404, {"error": "not found"})
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception:
            return self._json(400, {"error": "invalid json"})

        rel = data.get("path", "")
        full = resolve_path(rel)
        if not full or not os.path.isfile(full):
            return self._json(404, {"error": "file not found"})

        ext = os.path.splitext(full)[1].lower().lstrip(".")
        if ext in {"png", "jpg", "jpeg", "tif", "tiff"}:
            text = run_tesseract(full)
        elif ext == "pdf":
            text = run_pdf_ocr(full)
        else:
            return self._json(400, {"error": "unsupported file type"})

        if not text:
            return self._json(500, {"error": "ocr failed"})
        return self._json(200, {"text": text})


if __name__ == "__main__":
    port = int(os.environ.get("OCR_PORT", "7070"))
    server = HTTPServer(("0.0.0.0", port), Handler)
    server.serve_forever()
