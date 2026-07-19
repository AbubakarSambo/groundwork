"""Stack lifecycle for the overnight targets (spec 0).

Each target (LOCAL working tree, MAIN clean worktree) is booted on the
STANDARD ports with its OWN fresh database, run, then torn down - sequential
same-port runs keep the client's dev proxy untouched (harness-only rule) and
make each target fully independent. The mailcatcher is booted once per
overnight run and CLEARED at each target start; suite fixtures use unique
timestamped addresses, so cross-target mail bleed cannot satisfy an
assertion.
"""

from __future__ import annotations

import getpass
import os
import shutil
import signal
import subprocess
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).parent.parent.parent  # the repo root
HARNESS = Path(__file__).parent.parent


def http_ok(url: str, timeout: int = 4) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return 200 <= r.status < 300
    except Exception:
        return False


def port_busy(port: int) -> bool:
    r = subprocess.run(["lsof", "-ti", f":{port}"], capture_output=True, text=True)
    return bool(r.stdout.strip())


def sh(cmd: list[str], cwd: Path | None = None, env: dict | None = None, timeout: int = 600) -> tuple[int, str]:
    r = subprocess.run(cmd, cwd=str(cwd) if cwd else None,
                       env={**os.environ, **(env or {})},
                       capture_output=True, text=True, timeout=timeout)
    return r.returncode, (r.stdout + r.stderr)[-2000:]


class Stack:
    """One booted target stack: API + client (+ the shared mailcatcher)."""

    def __init__(self, checkout: Path, db_url: str, log_dir: Path):
        self.checkout = checkout
        self.db_url = db_url
        self.log_dir = log_dir
        self.procs: list[subprocess.Popen] = []

    def _spawn(self, cmd: list[str], cwd: Path, env: dict, log_name: str) -> subprocess.Popen:
        self.log_dir.mkdir(parents=True, exist_ok=True)
        log = open(self.log_dir / log_name, "w")
        p = subprocess.Popen(cmd, cwd=str(cwd), env={**os.environ, **env},
                             stdout=log, stderr=subprocess.STDOUT,
                             start_new_session=True)
        self.procs.append(p)
        return p

    def boot(self) -> list[str]:
        """Boot API + client from this checkout. Returns failures (empty = ok)."""
        failures: list[str] = []
        api_dir = self.checkout / "api"
        client_dir = self.checkout / "client"

        # deps: a clean worktree has no node_modules - link the local ones
        # when the lockfile is identical, else npm ci (slow but correct).
        for sub in ("api", "client"):
            d = self.checkout / sub
            if not (d / "node_modules").exists():
                local_lock = REPO / sub / "package-lock.json"
                wt_lock = d / "package-lock.json"
                if local_lock.read_bytes() == wt_lock.read_bytes() and (REPO / sub / "node_modules").exists():
                    (d / "node_modules").symlink_to(REPO / sub / "node_modules")
                else:
                    code, out = sh(["npm", "ci", "--no-audit", "--no-fund"], cwd=d, timeout=600)
                    if code != 0:
                        failures.append(f"npm ci failed in {sub}: {out[-200:]}")
        if failures:
            return failures

        # env files: reuse the local dev env (API keys), override per-target DB
        for sub in ("api", "client"):
            src, dst = REPO / sub / ".env", self.checkout / sub / ".env"
            if src.exists() and not dst.exists():
                shutil.copy(src, dst)
        # the marketing redirect must be blank for suite runs
        cl_env = self.checkout / "client" / ".env"
        if cl_env.exists():
            txt = cl_env.read_text()
            cl_env.write_text("\n".join(
                "VITE_MARKETING_URL=" if line.startswith("VITE_MARKETING_URL=") else line
                for line in txt.splitlines()) + "\n")

        api_env = {"DATABASE_URL": self.db_url, "NODE_ENV": "development", "PORT": "3000"}
        code, out = sh(["npx", "prisma", "migrate", "deploy"], cwd=api_dir, env=api_env, timeout=300)
        if code != 0:
            return [f"prisma migrate deploy failed: {out[-300:]}"]

        self._spawn(["npm", "run", "start:dev"], api_dir, api_env, "api.log")
        self._spawn(["npm", "run", "dev", "--", "--port", "5173", "--host", "127.0.0.1"],
                    client_dir, {}, "client.log")

        deadline = time.time() + 240
        while time.time() < deadline:
            if http_ok("http://127.0.0.1:3000/health") and http_ok("http://127.0.0.1:5173"):
                return []
            time.sleep(3)
        if not http_ok("http://127.0.0.1:3000/health"):
            failures.append(f"API never became healthy (see {self.log_dir/'api.log'})")
        if not http_ok("http://127.0.0.1:5173"):
            failures.append(f"client never served (see {self.log_dir/'client.log'})")
        return failures

    def teardown(self):
        for p in self.procs:
            try:
                os.killpg(os.getpgid(p.pid), signal.SIGTERM)
            except Exception:
                pass
        self.procs.clear()
        deadline = time.time() + 20
        while time.time() < deadline and (port_busy(3000) or port_busy(5173)):
            time.sleep(1)


def fresh_db(name: str) -> str:
    """Drop + create a database; returns its URL. Spec 0: each target migrates
    from scratch - a shared DB would make the diff meaningless."""
    subprocess.run(["dropdb", "--if-exists", name], capture_output=True, timeout=60)
    code = subprocess.run(["createdb", name], capture_output=True, text=True, timeout=60)
    if code.returncode != 0:
        raise RuntimeError(f"createdb {name} failed: {code.stderr[-200:]}")
    return f"postgresql://{getpass.getuser()}@localhost/{name}"


def prepare_main_worktree(base: Path) -> tuple[Path, str]:
    """A clean checkout of origin/main at HEAD (spec 0). Asserts cleanliness
    and the SHA match - anything else is grounds to abort red."""
    sh(["git", "fetch", "origin"], cwd=REPO, timeout=120)
    _, main_sha = sh(["git", "rev-parse", "origin/main"], cwd=REPO)
    main_sha = main_sha.strip()
    wt = base / "overnight-main"
    if wt.exists():
        sh(["git", "worktree", "remove", "--force", str(wt)], cwd=REPO)
        shutil.rmtree(wt, ignore_errors=True)
    code, out = sh(["git", "worktree", "add", "--detach", str(wt), main_sha], cwd=REPO, timeout=120)
    if code != 0:
        raise RuntimeError(f"worktree add failed: {out[-200:]}")
    _, wt_sha = sh(["git", "rev-parse", "HEAD"], cwd=wt)
    _, dirty = sh(["git", "status", "--porcelain"], cwd=wt)
    if wt_sha.strip() != main_sha or dirty.strip():
        raise RuntimeError("main target is not clean origin/main")
    return wt, main_sha[:7]


def ensure_mailcatcher() -> bool:
    if http_ok("http://127.0.0.1:1080/health"):
        return True
    subprocess.Popen(["python3", str(HARNESS / "mailcatcher.py")],
                     stdout=open("/tmp/overnight_mailcatcher.log", "w"),
                     stderr=subprocess.STDOUT, start_new_session=True)
    deadline = time.time() + 15
    while time.time() < deadline:
        if http_ok("http://127.0.0.1:1080/health"):
            return True
        time.sleep(1)
    return False
