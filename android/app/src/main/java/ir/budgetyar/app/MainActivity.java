package ir.budgetyar.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.JSExport;
import com.getcapacitor.PluginHandle;
import android.graphics.Bitmap;
import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class MainActivity extends BridgeActivity {
    static volatile String currentUrl = "https://localhost/";
    static String remoteOrigin = "";
    static boolean remoteBridgeReady = false;
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BankNotificationsPlugin.class);
        registerPlugin(BudgetyarApiPlugin.class);
        registerPlugin(BudgetyarUpdatesPlugin.class);
        super.onCreate(savedInstanceState);
        remoteOrigin = bridge.getConfig().getPluginConfiguration("BudgetyarApi").getString("baseUrl", "");
        remoteBridgeReady = false;
        // Document-start injection also runs on HTML supplied by a Service Worker.
        // Keep this list aligned with the plugins registered above.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            try {
                // A worker registered by the old bundled APK must not serve its old
                // HTML instead of the new bootstrap. Financial storage is untouched.
                WebViewCompat.addDocumentStartJavaScript(bridge.getWebView(),
                    "if(navigator.serviceWorker?.controller){window.stop();navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>location.reload());}",
                    Collections.singleton("https://localhost"));
                List<PluginHandle> plugins = Arrays.asList(bridge.getPlugin("BankNotifications"), bridge.getPlugin("BudgetyarApi"), bridge.getPlugin("BudgetyarUpdates"));
                String script = JSExport.getGlobalJS(this, false, false) + "\n" +
                    "window.WEBVIEW_SERVER_URL = 'https://localhost';\n" + JSExport.getBridgeJS(this) + "\n" + JSExport.getPluginJS(plugins);
                WebViewCompat.addDocumentStartJavaScript(bridge.getWebView(), script, Collections.singleton(remoteOrigin));
                remoteBridgeReady = true;
            } catch (Exception error) {
                android.util.Log.e("BudgetyarUpdates", "Could not initialize remote bridge");
            }
        }
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                currentUrl = url;
                super.onPageStarted(view, url, favicon);
            }
        });
        bridge.getWebView().loadUrl("https://localhost/index.html");
    }
}
