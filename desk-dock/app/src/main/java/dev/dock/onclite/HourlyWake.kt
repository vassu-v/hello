package dev.dock.onclite

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.util.Calendar

object HourlyWake {
    fun schedule(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        val pi = PendingIntent.getBroadcast(ctx, 1, Intent(ctx, HourlyWakeReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val next = Calendar.getInstance().apply {
            add(Calendar.HOUR_OF_DAY, 1); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        try { am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi) }
        catch (e: SecurityException) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi) }
        Log.i("DockWake", "next hourly wake at $next")
    }

    fun inQuiet(s: Store, hour: Int): Boolean =
        if (s.nightStart <= s.nightEnd) hour >= s.nightStart && hour < s.nightEnd
        else hour >= s.nightStart || hour < s.nightEnd
}

class HourlyWakeReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val pending = goAsync()
        Thread {
            try {
                val s = Store(ctx)
                val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
                when {
                    !s.hourlyWake -> Log.i("DockWake", "hourly wake disabled")
                    s.quietHours && HourlyWake.inQuiet(s, hour) -> Log.i("DockWake", "quiet hours, suppressed")
                    else -> Log.i("DockWake", "woke: ${Screen.wake()}")
                }
            } finally { HourlyWake.schedule(ctx); pending.finish() }
        }.start()
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) { DockService.start(ctx) }
}
