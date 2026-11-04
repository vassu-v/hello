package dev.dock.onclite

/**
 * Everything hardware-specific lives here. To support another phone later,
 * this becomes an auto-detected profile instead of constants.
 * Target: Xiaomi Redmi Y3 / Redmi 7 ("onclite"), Snapdragon 632, QCOM PMIC.
 */
object DeviceProfile {
    const val CODENAME = "onclite"
    const val BATTERY = "/sys/class/power_supply/battery"
    const val CAPACITY = "$BATTERY/capacity"
    const val VOLTAGE_UV = "$BATTERY/voltage_now"      // microvolts
    const val CURRENT_UA = "$BATTERY/current_now"      // microamps (negative = charging on QCOM)
    const val TEMP_DECI_C = "$BATTERY/temp"            // tenths of °C
    const val STATUS = "$BATTERY/status"
    const val HEALTH = "$BATTERY/health"

    /** Charge-control nodes, tried in order. Value written = "disable charging". */
    val CHARGE_SWITCHES = listOf(
        Triple("$BATTERY/input_suspend", "1", "0"),
        Triple("$BATTERY/battery_charging_enabled", "0", "1"),
        Triple("$BATTERY/charging_enabled", "0", "1"),
    )
}
