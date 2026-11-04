package dev.dock.onclite

import org.json.JSONObject

object Screen {
    fun wakefulness(): String =
        Regex("mWakefulness=(\\w+)").find(Root.sh("dumpsys power").out)?.groupValues?.get(1) ?: "Unknown"

    /** KEYCODE_WAKEUP (idempotent), verify, fall back to KEYCODE_POWER only if still not awake. */
    fun wake(): String {
        Root.sh("input keyevent 224")
        Thread.sleep(500)
        if (wakefulness() != "Awake") Root.sh("input keyevent 26")
        Root.sh("am start -n ${BuildConfigPkg.PKG}/.MainActivity")
        return wakefulness()
    }

    fun sleep(): String { Root.sh("input keyevent 223"); Thread.sleep(300); return wakefulness() }

    fun setTimeout(sec: Int) = Root.sh("settings put system screen_off_timeout ${sec * 1000}")
    fun setAutoRotate(on: Boolean) = Root.sh("settings put system accelerometer_rotation ${if (on) 1 else 0}")

    fun status() = JSONObject()
        .put("wakefulness", wakefulness())
        .put("timeout_s", (Root.sh("settings get system screen_off_timeout").out.toLongOrNull() ?: 0) / 1000)
        .put("auto_rotate", Root.sh("settings get system accelerometer_rotation").out == "1")

    /** One-time / boot-time OS policy (section 7.1 of the blueprint). */
    fun applyPolicies(timeoutSec: Int) {
        val pkg = BuildConfigPkg.PKG
        listOf(
            "settings put system screen_off_timeout ${timeoutSec * 1000}",
            "svc power stayon false",
            "settings put global stay_on_while_plugged_in 0",
            "settings put system accelerometer_rotation 1",
            "locksettings set-disabled true",
            "settings put secure lockscreen.disabled 1",
            "settings put global wifi_sleep_policy 2",
            "dumpsys deviceidle whitelist +$pkg",
            "appops set $pkg SCHEDULE_EXACT_ALARM allow",
            "pm grant $pkg android.permission.POST_NOTIFICATIONS",
            "cmd package set-home-activity $pkg/.MainActivity",
        ).forEach { Root.sh(it) }
    }
}

object BuildConfigPkg { const val PKG = "dev.dock.onclite" }
