"""Takes Tidelamp's 4 judge screenshots from real renders of the running game.

Serves game/ with serve.ts, opens it in headless Chromium at 1280x720 with ?frozen&seed=41
(the clock only moves when tidelamp.advance() steps it, so every run gives the same frames),
drives it with real keyboard and mouse input plus the game's own autoplay keeper, and writes:
  screenshots/01-title.png, 02-play.png, 03-night-cleared.png, 04-dawn.png
Usage: python3 tools/shots.py
"""

import os
import socket
import struct
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "screenshots"
SEED = 41
NAMES = ["01-title.png", "02-play.png", "03-night-cleared.png", "04-dawn.png"]
MAX_BYTES = 262144


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def png_size(path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n" and data[-8:-4] == b"IEND", f"{path} is not a whole PNG"
    return struct.unpack(">II", data[16:24])


def check(path):
    import re
    assert re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", path.name), path.name
    assert path.is_file() and not path.is_symlink(), path
    size = path.stat().st_size
    w, h = png_size(path)
    assert size <= MAX_BYTES, f"{path.name}: {size} bytes > {MAX_BYTES}"
    assert max(w, h) <= 1280 and min(w, h) >= 480, f"{path.name}: {w}x{h}"
    return size, w, h


def main():
    port = free_port()
    server = subprocess.Popen(["node", "serve.ts"], cwd=ROOT, env={**os.environ, "PORT": str(port)}, stdout=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                socket.create_connection(("127.0.0.1", port), 0.2).close()
                break
            except OSError:
                time.sleep(0.1)
        for old in SHOTS.iterdir():
            if old.is_file():
                old.unlink()
        errors = []
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"http://127.0.0.1:{port}/?frozen&seed={SEED}")
            page.wait_for_function("window.tidelamp")
            canvas = page.locator("#game")
            box = canvas.bounding_box()
            to_screen = lambda x, y: (box["x"] + x * box["width"] / 960, box["y"] + y * box["height"] / 600)

            def advance(frames):
                page.evaluate(f"tidelamp.advance({frames})")

            def state():
                return page.evaluate("tidelamp.state()")

            def advance_until(cond, limit_frames, chunk=30):
                for _ in range(0, limit_frames, chunk):
                    advance(chunk)
                    s = page.evaluate("({...tidelamp.state(), t: tidelamp.game.run?.world?.time ?? 0})")
                    if cond(s):
                        return s
                raise SystemExit(f"condition never met; last state {s}")

            def shoot(name):
                canvas.screenshot(path=str(SHOTS / name))

            # 1. Title: demo keeper playing behind the menu, mouse resting on Start.
            page.mouse.move(*to_screen(480, 342))
            advance(620)
            shoot(NAMES[0])

            # Start with the real Enter key, then let the autoplay keeper take the helm.
            canvas.focus()
            page.keyboard.press("Enter")
            advance(2)
            assert state()["state"] == "play", state()
            page.evaluate("tidelamp.setAutoplay(true)")

            # 3. First night cleared: the gift cards, mouse hovering the first.
            advance_until(lambda s: s["state"] == "nightClear", 60 * 200)
            page.mouse.move(*to_screen(250, 380))
            advance(60)
            shoot(NAMES[2])
            page.keyboard.press("Digit1")
            advance(2)

            # 2. Mid-play on the fourth night: whirlpool, driftwood, rain, several boats, full HUD.
            advance_until(lambda s: s["state"] == "play" and s["night"] == 4 and s["t"] > 28, 60 * 400)
            shoot(NAMES[1])

            # 4. Play on to dawn (or the end of the voyage), then show the results screen.
            end = advance_until(lambda s: s["state"] in ("victory", "gameOver"), 60 * 900, 60)
            page.mouse.move(*to_screen(350, 476))
            advance(60)
            shoot(NAMES[3])
            browser.close()
        assert not errors, errors
        print("end state:", end)
        for name in NAMES:
            size, w, h = check(SHOTS / name)
            print(f"screenshots/{name}  {size} bytes  {w}x{h}")
        assert sorted(p.name for p in SHOTS.iterdir()) == NAMES
    finally:
        server.terminate()


if __name__ == "__main__":
    sys.exit(main())
