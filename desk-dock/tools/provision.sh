#!/usr/bin/env bash
# Run from your PC with the phone connected over USB (or `adb connect IP:5555`).
# Requires: Magisk root on the phone, and Shell granted root in Magisk once.
set -euo pipefail
APK="${1:-app/build/outputs/apk/debug/app-debug.apk}"
PKG=dev.dock.onclite

echo "== device"; adb shell getprop ro.product.device
adb shell su -c id | grep -q uid=0 || { echo "No root for adb shell — grant Shell in Magisk"; exit 1; }

echo "== install"; adb install -r -g "$APK"

echo "== grant root to the app (Magisk policy) + autostart"
UID_=$(adb shell dumpsys package $PKG | grep -m1 -o 'userId=[0-9]*' | cut -d= -f2)
adb shell su -c "magisk --sqlite \"REPLACE INTO policies (uid,policy,until,logging,notification) VALUES($UID_,2,0,0,0)\"" || \
  echo "!! could not auto-grant; approve the Magisk prompt (or grant via Magisk > Superuser over scrcpy)"

echo "== lockscreen off (clear PIN if you had one: locksettings clear --old <PIN>)"
adb shell su -c "locksettings set-disabled true; settings put secure lockscreen.disabled 1"

echo "== persistent wireless adb on :5555 (survives reboot via service.d)"
adb shell su -c "mkdir -p /data/adb/service.d && printf '#!/system/bin/sh\nsetprop service.adb.tcp.port 5555\nstop adbd; start adbd\n' > /data/adb/service.d/00-dock-adb.sh && chmod 755 /data/adb/service.d/00-dock-adb.sh"

echo "== start"
adb shell cmd package set-home-activity $PKG/.MainActivity || true
adb shell am start -n $PKG/.MainActivity
sleep 4
IP=$(adb shell ip -4 addr show wlan0 | grep -o 'inet [0-9.]*' | cut -d' ' -f2)
TOKEN=$(adb logcat -d -s Dock | grep -o 'token=[a-z0-9]*' | tail -1 | cut -d= -f2)
echo
echo "Remote:    http://$IP:8000/control?token=$TOKEN"
echo "PC agent:  python tools/pc_agent.py --phone $IP --token $TOKEN"
