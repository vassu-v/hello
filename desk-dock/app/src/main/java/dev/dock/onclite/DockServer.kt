package dev.dock.onclite

import android.content.Context
import fi.iki.elonen.NanoHTTPD
import org.json.JSONArray
import org.json.JSONObject

class DockServer(private val ctx: Context, private val store: Store) : NanoHTTPD(PORT) {
    companion object { const val PORT = 8000 }

    @Volatile private var pcStats: JSONObject? = null
    @Volatile private var pcSeen = 0L

    private fun json(o: Any, status: Response.Status = Response.Status.OK) =
        newFixedLengthResponse(status, "application/json", o.toString())
    private fun err(code: Response.Status, msg: String) = json(JSONObject().put("error", msg), code)

    private fun authed(s: IHTTPSession): Boolean {
        val ip = s.remoteIpAddress ?: ""
        if (ip == "127.0.0.1" || ip == "::1" || ip.endsWith(":127.0.0.1")) return true
        val t = s.headers["x-token"] ?: s.parameters["token"]?.firstOrNull()
        return t == store.token
    }

    private fun body(s: IHTTPSession): JSONObject {
        val m = HashMap<String, String>(); s.parseBody(m)
        return m["postData"]?.takeIf { it.isNotBlank() }?.let { JSONObject(it) } ?: JSONObject()
    }

    private fun asset(path: String): Response {
        val clean = path.trim('/').ifEmpty { "dock" }.let { if (!it.contains('.')) "$it/index.html" else it }
        if (clean.contains("..")) return err(Response.Status.FORBIDDEN, "no")
        val mime = when (clean.substringAfterLast('.')) {
            "html" -> "text/html"; "js" -> "application/javascript"; "css" -> "text/css"
            "svg" -> "image/svg+xml"; "woff2" -> "font/woff2"; else -> "application/octet-stream"
        }
        return try { newChunkedResponse(Response.Status.OK, mime, ctx.assets.open("web/$clean")) }
        catch (e: Exception) { err(Response.Status.NOT_FOUND, "not found") }
    }

    override fun serve(s: IHTTPSession): Response = try { route(s) }
        catch (e: Exception) { err(Response.Status.INTERNAL_ERROR, e.message ?: "error") }

    private fun route(s: IHTTPSession): Response {
        val uri = s.uri; val post = s.method == Method.POST
        if (!uri.startsWith("/api/")) return asset(uri)   // static UI is public; it holds no data
        if (!authed(s)) return err(Response.Status.UNAUTHORIZED, "bad token")

        return when {
            uri == "/api/state" -> json(JSONObject()
                .put("battery", Battery.snapshot())
                .put("tasks", store.tasks())
                .put("timer", store.timer())
                .put("settings", store.settings())
                .put("pc", if (System.currentTimeMillis() - pcSeen < 6000) pcStats else JSONObject.NULL)
                .put("token", if (s.remoteIpAddress?.contains("127.0.0.1") == true) store.token else null)
                .put("now", System.currentTimeMillis()))

            uri == "/api/pc" && post -> { pcStats = body(s); pcSeen = System.currentTimeMillis(); json(JSONObject().put("ok", true)) }

            uri == "/api/tasks" && post -> { store.addTask(body(s).getString("text")); json(store.tasks()) }
            uri.startsWith("/api/tasks/") && post -> {
                val b = body(s)
                store.patchTask(uri.removePrefix("/api/tasks/"),
                    if (b.has("done")) b.getBoolean("done") else null, b.optBoolean("delete"))
                json(store.tasks())
            }

            uri == "/api/timer" && post -> {
                val b = body(s); val now = System.currentTimeMillis()
                val t = when (b.optString("action")) {
                    "start" -> JSONObject().put("running", true).put("label", b.optString("label", "Focus"))
                        .put("endsAt", now + b.optInt("minutes", 25) * 60_000L)
                    else -> JSONObject().put("running", false)
                }
                store.setTimer(t); json(t)
            }

            uri == "/api/settings" && post -> {
                store.updateSettings(body(s))
                Screen.setTimeout(store.timeoutSec); HourlyWake.schedule(ctx)
                json(store.settings())
            }

            uri == "/api/screen/status" -> json(Screen.status().put("battery_temp", Battery.snapshot().opt("temp_c")))
            uri == "/api/screen/wake" && post -> json(JSONObject().put("wakefulness", Screen.wake()))
            uri == "/api/screen/sleep" && post -> json(JSONObject().put("wakefulness", Screen.sleep()))
            uri == "/api/screen/timeout" && post -> {
                val sec = body(s).getInt("timeout_seconds").coerceIn(15, 3600)
                store.timeoutSec = sec; Screen.setTimeout(sec); json(Screen.status())
            }
            uri == "/api/screen/rotate" && post -> { Screen.setAutoRotate(body(s).getBoolean("auto_rotate")); json(Screen.status()) }

            else -> err(Response.Status.NOT_FOUND, "no route")
        }
    }
}
