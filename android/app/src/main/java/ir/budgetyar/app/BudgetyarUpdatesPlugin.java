package ir.budgetyar.app;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

@CapacitorPlugin(name = "BudgetyarUpdates")
public class BudgetyarUpdatesPlugin extends Plugin {
    private static final String LATEST_APK_PATH = "/downloads/budgetyar-latest.apk";

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences("budgetyar-origin-migration-v1", Context.MODE_PRIVATE);
    }

    // URL is set by the activity's navigation callback on the UI thread.
    private boolean atOrigin(String origin) {
        return MainActivity.currentUrl.equals(origin) || MainActivity.currentUrl.startsWith(origin + "/");
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        if (!atOrigin("https://localhost")) { call.reject("Local bootstrap only"); return; }
        if (!MainActivity.remoteBridgeReady) {
            call.reject("‏برای آپدیت درون‌برنامه‌ای، Android System WebView را به‌روز کنید."); return;
        }
        try {
            if (!preferences().getBoolean("completed", false) && !preferences().contains("entries")) {
                JSObject entries = call.getObject("entries", new JSObject());
                if (entries.toString().getBytes(StandardCharsets.UTF_8).length > 8 * 1024 * 1024) throw new Exception("Too large");
                Set<String> allowed = new HashSet<>();
                try (java.io.InputStream input = getContext().getAssets().open("public/storage-keys.json")) {
                    java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
                    byte[] buffer = new byte[4096]; int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                    JSONArray keys = new JSONArray(output.toString("UTF-8"));
                    for (int i = 0; i < keys.length(); i++) allowed.add(keys.getString(i));
                }
                for (Iterator<String> it = entries.keys(); it.hasNext();) {
                    String key = it.next();
                    if ((!allowed.contains(key) && !key.startsWith("budgetyar-account-local-v1:")) || !(entries.get(key) instanceof String)) throw new Exception("Invalid entry");
                }
                if (!preferences().edit().putString("entries", entries.toString()).commit()) throw new Exception("Storage failure");
            }
            JSObject result = new JSObject();
            result.put("url", MainActivity.remoteOrigin + "/");
            call.resolve(result);
        } catch (Exception error) { call.reject("‏انتقال اطلاعات آماده نشد؛ اطلاعات اصلی روی دستگاه باقی مانده است."); }
    }

    @PluginMethod
    public void migration(PluginCall call) {
        if (!atOrigin(MainActivity.remoteOrigin)) { call.reject("Remote app only"); return; }
        try {
            JSObject result = new JSObject();
            result.put("entries", new JSONObject(preferences().getString("entries", "{}")));
            result.put("completed", preferences().getBoolean("completed", false));
            result.put("nativeVersion", 3);
            call.resolve(result);
        } catch (Exception error) { call.reject("Migration could not be read"); }
    }

    @PluginMethod
    public void completeMigration(PluginCall call) {
        if (!atOrigin(MainActivity.remoteOrigin)) { call.reject("Remote app only"); return; }
        if (preferences().edit().putBoolean("completed", true).remove("entries").commit()) call.resolve();
        else call.reject("Migration could not be saved");
    }

    @PluginMethod
    public void openApkDownload(PluginCall call) {
        if (!atOrigin(MainActivity.remoteOrigin) || !MainActivity.remoteOrigin.startsWith("https://")) {
            call.reject("Remote app only");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(MainActivity.remoteOrigin + LATEST_APK_PATH));
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                getActivity().startActivity(intent);
                call.resolve();
            } catch (ActivityNotFoundException error) {
                call.reject("‏مرورگری برای دانلود APK پیدا نشد.");
            }
        });
    }
}
