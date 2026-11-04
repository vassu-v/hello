package dev.dock.onclite

import android.util.Log
import java.io.File
import java.util.concurrent.TimeUnit

object Root {
    private const val TAG = "DockRoot"

    data class Result(val code: Int, val out: String)

    fun sh(cmd: String, timeoutSec: Long = 10): Result = try {
        val p = ProcessBuilder("su", "-c", cmd).redirectErrorStream(true).start()
        val out = p.inputStream.bufferedReader().readText()
        if (!p.waitFor(timeoutSec, TimeUnit.SECONDS)) { p.destroy(); Result(-1, "timeout") }
        else Result(p.exitValue(), out.trim())
    } catch (e: Exception) {
        Log.w(TAG, "su failed: $cmd", e); Result(-1, e.message ?: "error")
    }

    val available: Boolean by lazy { sh("id").out.contains("uid=0") }

    /** Read a sysfs node: try directly (battery nodes are often world-readable), else via su. */
    fun read(path: String): String? {
        try { File(path).takeIf { it.canRead() }?.readText()?.trim()?.let { return it } } catch (_: Exception) {}
        val r = sh("cat $path")
        return if (r.code == 0) r.out else null
    }

    fun write(path: String, value: String): Boolean = sh("echo $value > $path").code == 0
}
