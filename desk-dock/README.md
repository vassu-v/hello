# Desk Dock — onclite

Turns an old rooted **Redmi Y3 / Redmi 7 (`onclite`)** with a dead touchscreen into a 24/7 desk clock and study dashboard.

It's one APK. Termux isn't needed. The APK contains:
- the dashboard
- a small web server on the phone (port 8000) that you control from your PC or main phone
- a battery guard that keeps the battery at 50–60%
- an hourly screen wake
- hand-drawn scenes over a live sky that react to the real weather and time of day

> Status: the APK builds, and the UI was checked in a browser at 1520×720. **It hasn't been tested on a real device yet.** Problems will show in `adb logcat -s Dock DockWake DockRoot`.

---

## 1. What you need

| | |
|---|---|
| Phone | Redmi Y3 / 7 (`onclite`), custom ROM or MIUI, **Magisk root** |
| PC | `adb` (Android platform-tools), plus optionally `scrcpy` (lets you use the phone with your PC's mouse, since the touchscreen is broken) and Python 3 for the PC agent |
| Network | Phone and PC on the same Wi-Fi |

On the phone, **USB debugging** must be on: Developer options → USB debugging. If you can't tap anything, connect once with `scrcpy` and use your mouse.

---

## 2. Install (about 5 minutes)

1. Plug the phone into your PC by USB and run `adb devices`. Accept the prompt on the phone; use scrcpy to click it.
2. In Magisk → Superuser, allow **Shell** (`com.android.shell`) to use root. The first time you run `adb shell su`, a prompt will appear.
3. From the project folder, run:
   ```bash
   tools/provision.sh desk-dock-onclite-debug.apk
   ```
   The script:
   - installs the APK
   - grants the app root in Magisk. If that step fails, approve the Magisk prompt through scrcpy.
   - turns off the lockscreen. If you had a PIN, first run `adb shell locksettings clear --old <PIN>`.
   - keeps wireless ADB on port 5555 after every reboot
   - sets the dock as the Home app and starts it
   - prints your **remote URL** and **token**, for example:
     ```
     Remote:    http://192.168.1.42:8000/control?token=ab12cd34
     PC agent:  python tools/pc_agent.py --phone 192.168.1.42 --token ab12cd34
     ```
4. Unplug the USB cable and put the phone on its stand. After this, you can reach it over Wi-Fi with `adb connect <phone-ip>:5555`.

**Lost the token?** Run:
```bash
adb logcat -d -s Dock | grep token
```

**Installing by hand instead of using the script:**
```bash
adb install -r -g desk-dock-onclite-debug.apk
adb shell am start -n dev.dock.onclite/.MainActivity
```
When it starts, approve the Magisk root prompt (through scrcpy). Everything else is applied by the app on its own every time it starts.

---

## 3. Daily use

### The screen
- **The screen sleeps after 2 minutes** to keep the battery cool. Press the **power button** to wake it. There's no lockscreen, so it opens straight to the dashboard.
- **The screen wakes itself at the start of every hour** for 2 minutes.
- **Auto-rotate is on**, so you can stand it in landscape or portrait.
- **Night mode:** between 00:00 and 06:00 (you can change the hours), everything turns dim red.

### What's on it
| Area | Shows |
|---|---|
| Top-left | City · next sunrise/sunset |
| Big | Date and time |
| Right | Current temperature, condition, high/low |
| "Now" slot | Your **focus timer** if one is running, otherwise your **next task**, plus your nearest **countdown** (e.g. JEE 2028) |
| Bottom line | Changes every 7 s: outside conditions (feels-like, wind, humidity, AQI) → next 12 h (rain warning, temperature range) → tasks done → PC stats (if the agent is running) → phone battery |

Weather comes from **Open-Meteo**, which needs no API key. It refreshes every 30 minutes.

### Scenes
| Scene | Description |
|---|---|
| `desk` (default) | A room with a window looking out on mountains. The desk lamp comes on after sunset and in storms. Rain beads on the glass. The mug steams. |
| `mountains` | Layered ridges, a lake and pines. Snow caps the ridges. Fog fades the distance. |
| `sakura` | A cherry tree with drifting petals that follow the real wind. |
| `sky` | The live sky only, no scenery. |

Every scene takes its colours from the real sun position and weather: dawn, day, golden hour, dusk and night, and clear, cloudy, overcast, fog, rain, snow and thunder (lightning flashes the whole screen).

### Remote control (from your PC or main phone)
Open the remote URL in any browser on the same Wi-Fi. The token is saved after the first visit. From the remote you can:
- **Wake or sleep** the screen, change the sleep timeout (1 / 2 / 5 / 30 / 60 min), and toggle auto-rotate
- **Start a Pomodoro** (Focus 25, Deep 50 or Break 5), or stop it
- **Add, tick off or delete tasks**
- **Pick a scene**
- **Settings:** charge limits, temperature limits, night hours, hourly wake on/off, quiet hours (no hourly wake at night), city search (sets the location for weather and sun), and countdowns (one per line, as `2028-01-20 JEE 2028`)

Tip: bookmark it on your main phone's home screen.

### PC stats (optional)
On your PC, install the dependencies:
```bash
pip install psutil requests
```
Then start the agent:
```bash
python tools/pc_agent.py --phone <phone-ip> --token <token>
```
It sends CPU, RAM, CPU temperature, network speed and the active window name every 2 s. When the PC is off, that item drops out of the bottom line automatically.

To start it with your PC:
- **Windows:** put a shortcut in `shell:startup` that runs `pythonw tools\pc_agent.py ...`.
- **Linux:** add it to your desktop's autostart, or create a `systemd --user` service.

CPU temperature works on Linux. On Windows, psutil can't read it.

---

## 4. Battery protection

The battery is kept between **50% and 60%**. Charging pauses above **40 °C** and resumes below **35 °C**.

- **If ACC (the Magisk module) is installed and running,** the app leaves charging to ACC. Set ACC to the same limits.
- **Otherwise the app's own guard does it.** Every 30 s it switches charging on or off through `/sys/class/power_supply/battery/input_suspend`. While charging is paused, the phone runs from USB power and slowly drifts from 60% down to 50% before charging again. That's expected.
- The original blueprint also capped the voltage at 3.8 V. That's left out on purpose: 3.8 V is only about 40–50% charge, which would conflict with the 60% limit, and this kernel doesn't support a voltage cap reliably.

All the limits can be changed on the remote page.

---

## 5. API

Requests from your Wi-Fi need the token, either as an `X-Token: <token>` header or `?token=<token>` in the URL. Requests from the phone itself don't.

| Method | Path | Body | Does |
|---|---|---|---|
| GET | `/api/state` | | Everything: battery, tasks, timer, settings, PC |
| GET | `/api/screen/status` | | Screen state, timeout, rotation |
| POST | `/api/screen/wake` / `sleep` | | Turns the screen on or off |
| POST | `/api/screen/timeout` | `{"timeout_seconds":120}` | Sets the sleep timeout |
| POST | `/api/screen/rotate` | `{"auto_rotate":true}` | Turns auto-rotate on or off |
| POST | `/api/tasks` | `{"text":"Maths mock"}` | Adds a task |
| POST | `/api/tasks/<id>` | `{"done":true}` or `{"delete":true}` | Ticks off or deletes a task |
| POST | `/api/timer` | `{"action":"start","minutes":25,"label":"Focus"}` / `{"action":"stop"}` | Starts or stops the Pomodoro |
| POST | `/api/settings` | e.g. `{"scene":"sakura","lat":26.9,"lon":75.8,"place":"Jaipur"}` | Changes settings |
| POST | `/api/pc` | stats JSON | Used by the PC agent |

Example: start a 50-minute focus session from a terminal.
```bash
curl -X POST -H "X-Token: ab12cd34" -d '{"action":"start","minutes":50,"label":"Deep work"}' http://192.168.1.42:8000/api/timer
```

---

## 6. Preview and tweak the UI without the phone

The dashboard is plain HTML/JS in `app/src/main/assets/web/dock/`. Add these settings to the dashboard URL to force a time and weather:

| Setting | Example | Meaning |
|---|---|---|
| `scene` | `desk` `mountains` `sakura` `sky` | Which scene |
| `hour` | `17.5` | Pretend it's 17:30 |
| `code` | `0` clear · `2` partly cloudy · `3` overcast · `45` fog · `61/63/65` rain · `73` snow · `95` thunder | Weather type (WMO code) |
| `cc` | `80` | Cloud cover in % |
| `tick` | `0`–`4` | Fix the bottom line on one item |

Example: `http://<phone-ip>:8000/dock/?scene=mountains&hour=18&code=63&cc=90`

### Adding your own scene
In `dock/scene.js`:
```js
Scene.register("beach", {
  outdoor: true,                       // draws rain and snow in front of the scene
  draw(ctx, W, H, env, kit) {          // redrawn when the light or weather changes
    const L = kit.look(env);           // gives L.haze, L.ink, L.layer(depth 0..1), L.amb, L.night, L.gold
    kit.scrim(ctx, env);
    kit.range(ctx, [0, 0, W, H], env, L, { seed: 9, bases: [.7, .8, .9], amps: [.08, .05, .03] });
  },
  fx(ctx, W, H, env, kit, dt, state) { return state; }   // optional, runs at 24 fps
});
```
Then add it to the scene list in `control/index.html`.

---

## 7. Build from source

You need JDK 17+ and the Android SDK, with `sdk.dir=/path/to/sdk` in `local.properties`. Then run:
```bash
./gradlew assembleDebug
```
The APK ends up at `app/build/outputs/apk/debug/app-debug.apk`.

### Project layout
```
app/src/main/java/dev/dock/onclite/
  DeviceProfile.kt   every onclite-specific path (sysfs battery nodes); the only file to change for another phone
  DockService.kt     foreground service: starts the server, battery guard and hourly alarm; applies screen policies
  DockServer.kt      HTTP API + serves the web UI (NanoHTTPD, port 8000)
  Screen.kt          wake/sleep/timeout/rotate, plus the OS setup (keyguard off, stay-awake off, doze whitelist…)
  Battery.kt         battery readings + built-in guard (steps aside if ACC is running)
  HourlyWake.kt      exact alarm at every :00, quiet hours, boot receiver
  Store.kt           settings, tasks and timer (SharedPreferences)
  MainActivity.kt    fullscreen WebView; set as Home; shows over the lockscreen; never forces the screen to stay on
app/src/main/assets/web/
  dock/   index.html · dock.css · dock.js (data + layout) · sky.js (WebGL sky) · scene.js (scenes)
  control/index.html   the remote page
  fonts/  Inter Tight, JetBrains Mono, Instrument Serif (bundled, work offline)
  lib/suncalc.js       sun and moon position (BSD licence)
tools/
  provision.sh   one-shot install and setup over adb
  pc_agent.py    PC stats sender
```

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Black screen or "page not found" after boot | The server takes a few seconds to start; the page retries on its own. Check `adb logcat -s Dock`. |
| Screen never sleeps | Check `adb shell settings get global stay_on_while_plugged_in`; it should be `0`. Also turn off Developer options → Stay awake. |
| Lockscreen still appears | Your ROM ignored the setting. Clear the PIN (`locksettings clear --old <PIN>`), then run `adb shell locksettings set-disabled true`, or set Screen lock to None through scrcpy. |
| No hourly wake | Check `adb logcat -s DockWake`. Run `adb shell appops set dev.dock.onclite SCHEDULE_EXACT_ALARM allow`. |
| Battery guard shows "unsupported" | No charge-control file was found. Install ACC, or check `ls /sys/class/power_supply/battery/` and add the right file to `DeviceProfile.kt`. |
| Bottom line says "Bad token" on the remote | Open `/control?token=<token>` once more; the token is saved after that. |
| No weather | The phone needs internet. Check that the latitude and longitude are set (city search on the remote). |
| Sky animation is choppy | Lower the frame rate (`FPS = 24`) or the resolution (`SCALE = 1 / 3`) at the top of `sky.js`, or choose the `sky` scene. |
| Root prompts keep appearing | In Magisk → Superuser, set Desk Dock to "Allow, forever". |

Logs: `adb logcat -s Dock DockWake DockRoot`

---

## 9. Plans
- Detect phone-specific paths automatically (generic `DeviceProfile`), so it works on any rooted phone
- IR blaster remote for room appliances
- More scenes (city window, beach, forest)
