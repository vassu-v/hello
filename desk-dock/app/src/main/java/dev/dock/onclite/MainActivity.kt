package dev.dock.onclite

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setShowWhenLocked(true)
        setTurnScreenOn(true)
        // Deliberately NO FLAG_KEEP_SCREEN_ON: screen_off_timeout must be allowed to fire.
        DockService.start(this)

        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            setBackgroundColor(0xFF000000.toInt())
            webViewClient = object : WebViewClient() {
                override fun onReceivedError(v: WebView, r: android.webkit.WebResourceRequest, e: android.webkit.WebResourceError) {
                    if (r.isForMainFrame) v.postDelayed({ v.reload() }, 1500)   // server still starting
                }
            }
        }
        setContentView(web)
        hideBars()
        web.postDelayed({ web.loadUrl("http://127.0.0.1:${DockServer.PORT}/dock/") }, 800)
    }

    private fun hideBars() {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.let {
                it.hide(WindowInsets.Type.systemBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else @Suppress("DEPRECATION") {
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        }
    }

    override fun onResume() { super.onResume(); hideBars(); web.evaluateJavascript("window.refresh&&refresh()", null) }
    @Deprecated("Deprecated in Java") override fun onBackPressed() { /* launcher: ignore */ }
}
