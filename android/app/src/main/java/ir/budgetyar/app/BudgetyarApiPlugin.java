package ir.budgetyar.app;

import android.webkit.CookieManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "BudgetyarApi")
public class BudgetyarApiPlugin extends Plugin {
    private static final int MAX_RESPONSE_BYTES = 3 * 1024 * 1024;

    @PluginMethod
    public void request(PluginCall call) {
        String path = call.getString("path", "");
        String method = call.getString("method", "GET").toUpperCase(java.util.Locale.ROOT);
        String baseUrl = getBridge().getConfig().getPluginConfiguration("BudgetyarApi").getString("baseUrl", "").replaceAll("/+$", "");

        if (!(path.equals("/api/account") || path.equals("/api/cloud-sync")) ||
            !(method.equals("GET") || method.equals("POST") || method.equals("PUT"))) {
            call.reject("Unsupported API request");
            return;
        }
        try {
            URL base = new URL(baseUrl);
            if (!base.getProtocol().equals("https") || base.getUserInfo() != null ||
                !base.getPath().isEmpty() && !base.getPath().equals("/") ||
                base.getQuery() != null || base.getRef() != null) {
                call.reject("Mobile API URL must be an HTTPS origin");
                return;
            }
        } catch (Exception error) {
            call.reject("Mobile API URL is not configured");
            return;
        }

        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(baseUrl + path).openConnection();
            connection.setRequestMethod(method);
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Cache-Control", "no-store");
            connection.setRequestProperty("Origin", baseUrl);

            CookieManager cookies = CookieManager.getInstance();
            String cookie = cookies.getCookie(baseUrl);
            if (cookie != null && !cookie.isEmpty()) connection.setRequestProperty("Cookie", cookie);

            if (!method.equals("GET")) {
                String body = call.getString("body", "");
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(bytes);
                }
            }

            int status = connection.getResponseCode();
            for (Map.Entry<String, List<String>> header : connection.getHeaderFields().entrySet()) {
                if (header.getKey() != null && header.getKey().equalsIgnoreCase("Set-Cookie")) {
                    for (String value : header.getValue()) cookies.setCookie(baseUrl, value);
                }
            }
            cookies.flush();

            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            if (stream != null) {
                try (InputStream input = stream) {
                    byte[] buffer = new byte[8192];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        if (output.size() + count > MAX_RESPONSE_BYTES) throw new IllegalStateException("API response is too large");
                        output.write(buffer, 0, count);
                    }
                }
            }

            JSONObject data = new JSONObject(output.toString(StandardCharsets.UTF_8.name()));
            JSObject result = new JSObject();
            result.put("status", status);
            result.put("data", data);
            call.resolve(result);
        } catch (JSONException error) {
            call.reject("API returned invalid JSON");
        } catch (Exception error) {
            call.reject("Could not connect to the account server");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}
