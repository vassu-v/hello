package dev.dock.onclite

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class DockService : Service() {
    private var server: DockServer? = null
    private val bg = Executors.newSingleThreadScheduledExecutor()

    override fun onCreate() {
        super.onCreate()
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("dock", "Desk Dock", NotificationManager.IMPORTANCE_MIN))
        val n = Notification.Builder(this, "dock").setContentTitle("Desk Dock running")
            .setSmallIcon(android.R.drawable.ic_lock_idle_charging).build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        else startForeground(1, n)

        val store = Store(this)
        Log.i("Dock", "LAN token: ${store.token}  ->  http://<phone-ip>:${DockServer.PORT}/control?token=${store.token}")
        server = DockServer(this, store).also { it.start(5000, false) }
        bg.execute { if (Root.available) Screen.applyPolicies(store.timeoutSec) else Log.e("Dock", "NO ROOT") }
        bg.scheduleWithFixedDelay({ runCatching { BatteryGuard.tick(store) } }, 5, 30, TimeUnit.SECONDS)
        HourlyWake.schedule(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) = START_STICKY
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onDestroy() { server?.stop(); bg.shutdownNow(); super.onDestroy() }

    companion object {
        fun start(ctx: Context) = ctx.startForegroundService(Intent(ctx, DockService::class.java))
    }
}
