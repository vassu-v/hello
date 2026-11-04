package dev.dock.onclite

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** Settings + tasks + timer, persisted in SharedPreferences as JSON. */
class Store(ctx: Context) {
    private val sp = ctx.getSharedPreferences("dock", Context.MODE_PRIVATE)

    val token: String get() = sp.getString("token", null) ?: UUID.randomUUID().toString().take(8)
        .also { sp.edit().putString("token", it).apply() }

    private fun int(k: String, d: Int) = sp.getInt(k, d)
    var timeoutSec get() = int("timeoutSec", 120); set(v) = sp.edit().putInt("timeoutSec", v).apply()
    val guardEnabled get() = sp.getBoolean("guardEnabled", true)
    val pauseCap get() = int("pauseCap", 60)
    val resumeCap get() = int("resumeCap", 50)
    val pauseTemp get() = int("pauseTemp", 40)
    val resumeTemp get() = int("resumeTemp", 35)
    val hourlyWake get() = sp.getBoolean("hourlyWake", true)
    val quietHours get() = sp.getBoolean("quietHours", false)
    val nightStart get() = int("nightStart", 0)
    val nightEnd get() = int("nightEnd", 6)

    fun settings(): JSONObject = JSONObject(sp.getString("extra", "{}")!!).apply {
        put("timeoutSec", timeoutSec); put("guardEnabled", guardEnabled)
        put("pauseCap", pauseCap); put("resumeCap", resumeCap)
        put("pauseTemp", pauseTemp); put("resumeTemp", resumeTemp)
        put("hourlyWake", hourlyWake); put("quietHours", quietHours)
        put("nightStart", nightStart); put("nightEnd", nightEnd)
        if (!has("countdowns")) put("countdowns", JSONArray()
            .put(JSONObject().put("label", "JEE 2028").put("date", "2028-01-20")))
        if (!has("lat")) { put("lat", 28.61); put("lon", 77.21) }
        if (!has("place")) put("place", "New Delhi")
    }

    private val typedInts = setOf("timeoutSec", "pauseCap", "resumeCap", "pauseTemp", "resumeTemp", "nightStart", "nightEnd")
    private val typedBools = setOf("guardEnabled", "hourlyWake", "quietHours")

    fun updateSettings(patch: JSONObject) {
        val e = sp.edit()
        val extra = JSONObject(sp.getString("extra", "{}")!!)
        patch.keys().forEach { k ->
            when (k) {
                in typedInts -> e.putInt(k, patch.getInt(k))
                in typedBools -> e.putBoolean(k, patch.getBoolean(k))
                else -> extra.put(k, patch.get(k))   // lat, lon, countdowns, ...
            }
        }
        e.putString("extra", extra.toString()).apply()
    }

    // ---- tasks ----
    fun tasks() = JSONArray(sp.getString("tasks", "[]"))
    private fun saveTasks(a: JSONArray) = sp.edit().putString("tasks", a.toString()).apply()
    fun addTask(text: String) = saveTasks(tasks().put(JSONObject()
        .put("id", UUID.randomUUID().toString().take(8)).put("text", text).put("done", false)))
    fun patchTask(id: String, done: Boolean?, delete: Boolean) {
        val a = tasks(); val out = JSONArray()
        for (i in 0 until a.length()) {
            val t = a.getJSONObject(i)
            if (t.getString("id") == id) { if (delete) continue; done?.let { t.put("done", it) } }
            out.put(t)
        }
        saveTasks(out)
    }

    // ---- pomodoro (state only; the UI renders the countdown) ----
    fun timer() = JSONObject(sp.getString("timer", """{"running":false}"""))
    fun setTimer(t: JSONObject) = sp.edit().putString("timer", t.toString()).apply()
}
