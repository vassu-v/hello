package dev.dock.onclite

import org.json.JSONObject

object Battery {
    fun snapshot(): JSONObject {
        val p = DeviceProfile
        val o = JSONObject()
        Root.read(p.CAPACITY)?.toIntOrNull()?.let { o.put("capacity", it) }
        Root.read(p.VOLTAGE_UV)?.toLongOrNull()?.let { o.put("voltage", it / 1_000_000.0) }
        Root.read(p.CURRENT_UA)?.toLongOrNull()?.let { o.put("current_ma", it / 1000) }
        Root.read(p.TEMP_DECI_C)?.toIntOrNull()?.let { o.put("temp_c", it / 10.0) }
        Root.read(p.STATUS)?.let { o.put("status", it) }
        Root.read(p.HEALTH)?.let { o.put("health", it) }
        o.put("guard", BatteryGuard.describe())
        return o
    }
}

/**
 * Keeps the cell between resume% and pause%, and pauses above maxTemp.
 * If ACC's daemon is running we stay out of its way.
 */
object BatteryGuard {
    @Volatile var mode = "init"; private set
    @Volatile var chargingAllowed = true; private set
    private var switch: Triple<String, String, String>? = null

    fun accRunning(): Boolean = Root.sh("pgrep -f accd").out.isNotBlank()

    private fun findSwitch(): Triple<String, String, String>? =
        switch ?: DeviceProfile.CHARGE_SWITCHES.firstOrNull { Root.read(it.first) != null }.also { switch = it }

    fun tick(s: Store) {
        if (!s.guardEnabled) { mode = "disabled"; setCharging(true); return }
        if (accRunning()) { mode = "acc"; return }
        val sw = findSwitch() ?: run { mode = "unsupported"; return }
        mode = "builtin:${sw.first.substringAfterLast('/')}"
        val cap = Root.read(DeviceProfile.CAPACITY)?.toIntOrNull() ?: return
        val temp = (Root.read(DeviceProfile.TEMP_DECI_C)?.toIntOrNull() ?: 0) / 10.0
        val want = when {
            temp >= s.pauseTemp -> false
            cap >= s.pauseCap -> false
            cap <= s.resumeCap && temp <= s.resumeTemp -> true
            else -> chargingAllowed // hysteresis band: keep current state
        }
        setCharging(want)
    }

    private fun setCharging(on: Boolean) {
        val sw = findSwitch() ?: return
        if (Root.write(sw.first, if (on) sw.third else sw.second)) chargingAllowed = on
    }

    fun describe() = JSONObject().put("mode", mode).put("charging_allowed", chargingAllowed)
}
