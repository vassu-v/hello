#!/usr/bin/env python3
"""Pushes PC stats to the desk dock every 2s. pip install psutil requests
Run at login: Windows -> shortcut in shell:startup with pythonw; Linux -> systemd --user / autostart."""
import argparse, platform, socket, time
import psutil, requests

def active_window():
    try:
        if platform.system() == "Windows":
            import ctypes
            h = ctypes.windll.user32.GetForegroundWindow()
            buf = ctypes.create_unicode_buffer(512)
            ctypes.windll.user32.GetWindowTextW(h, buf, 512)
            return buf.value
        import subprocess
        return subprocess.run(["xdotool", "getactivewindow", "getwindowname"], capture_output=True, text=True, timeout=1).stdout.strip()
    except Exception:
        return None

def cpu_temp():
    try:
        temps = psutil.sensors_temperatures()
        for key in ("coretemp", "k10temp", "zenpower", "cpu_thermal"):
            if temps.get(key):
                return max(t.current for t in temps[key])
    except Exception:
        pass
    return None  # Windows: psutil can't read temps; use LibreHardwareMonitor if you want this

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phone", required=True); ap.add_argument("--token", required=True)
    ap.add_argument("--interval", type=float, default=2.0)
    a = ap.parse_args()
    url = f"http://{a.phone}:8000/api/pc"
    last = psutil.net_io_counters(); last_t = time.time()
    psutil.cpu_percent()
    while True:
        time.sleep(a.interval)
        now = psutil.net_io_counters(); t = time.time(); dt = t - last_t
        stats = {
            "host": socket.gethostname(),
            "cpu": psutil.cpu_percent(),
            "ram": psutil.virtual_memory().percent,
            "cpu_temp": cpu_temp(),
            "net_down": (now.bytes_recv - last.bytes_recv) / 1024 / dt,
            "net_up": (now.bytes_sent - last.bytes_sent) / 1024 / dt,
            "window": active_window(),
        }
        last, last_t = now, t
        try: requests.post(url, json=stats, headers={"X-Token": a.token}, timeout=2)
        except requests.RequestException: pass  # phone asleep/offline: keep trying

if __name__ == "__main__":
    main()
