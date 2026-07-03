package ir.budgetyar.app;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;
import java.util.Locale;

@CapacitorPlugin(name = "BankNotifications")
public class BankNotificationsPlugin extends Plugin {
    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("isAndroid", true);
        result.put("isEnabled", isNotificationAccessEnabled());
        result.put("selectedPackage", BankNotificationStore.getSelectedPackage(getContext()));
        result.put("selectedAppLabel", BankNotificationStore.getSelectedLabel(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getSelectableApps(PluginCall call) {
        PackageManager packageManager = getContext().getPackageManager();
        Intent launcherIntent = new Intent(Intent.ACTION_MAIN, null);
        launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> launchableApps = packageManager.queryIntentActivities(launcherIntent, 0);
        JSArray apps = new JSArray();

        for (ResolveInfo info : launchableApps) {
            String packageName = info.activityInfo.packageName;
            String label = info.loadLabel(packageManager).toString();
            if (!isLikelyBlueBank(label, packageName)) continue;

            JSObject app = new JSObject();
            app.put("packageName", packageName);
            app.put("label", label);
            apps.put(app);
        }

        String selectedPackage = BankNotificationStore.getSelectedPackage(getContext());
        if (selectedPackage.length() > 0 && !containsPackage(apps, selectedPackage)) {
            JSObject app = new JSObject();
            app.put("packageName", selectedPackage);
            app.put("label", BankNotificationStore.getSelectedLabel(getContext()));
            apps.put(app);
        }

        JSObject result = new JSObject();
        result.put("apps", apps);
        call.resolve(result);
    }

    @PluginMethod
    public void setSelectedPackage(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) packageName = "";
        String label = packageName.length() == 0 ? "" : resolveLabel(packageName);
        BankNotificationStore.setSelectedApp(getContext(), packageName, label);
        call.resolve();
    }

    @PluginMethod
    public void getSuggestions(PluginCall call) {
        JSArray suggestions = new JSArray();
        for (JSONObject item : BankNotificationStore.toList(BankNotificationStore.getSuggestions(getContext()))) {
            suggestions.put(item);
        }

        JSObject result = new JSObject();
        result.put("suggestions", suggestions);
        call.resolve(result);
    }

    @PluginMethod
    public void markSuggestion(PluginCall call) {
        String id = call.getString("id");
        if (id == null) id = "";
        if (id.length() > 0) BankNotificationStore.removeSuggestion(getContext(), id);
        call.resolve();
    }

    private boolean isNotificationAccessEnabled() {
        String enabledListeners = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
        if (enabledListeners == null) return false;

        ComponentName componentName = new ComponentName(getContext(), BlueBankNotificationListener.class);
        return enabledListeners.toLowerCase(Locale.ROOT).contains(componentName.flattenToString().toLowerCase(Locale.ROOT));
    }

    private boolean isLikelyBlueBank(String label, String packageName) {
        String value = (label + " " + packageName).toLowerCase(Locale.ROOT);
        return value.contains("بلو") || value.contains("blue") || value.contains("blu") || value.contains("bank") || value.contains("بانک");
    }

    private boolean containsPackage(JSArray apps, String packageName) {
        for (int index = 0; index < apps.length(); index += 1) {
            try {
                if (packageName.equals(apps.getJSONObject(index).optString("packageName"))) return true;
            } catch (JSONException ignored) {
                // Ignore malformed plugin-local entries.
            }
        }
        return false;
    }

    private String resolveLabel(String packageName) {
        PackageManager packageManager = getContext().getPackageManager();
        try {
            return packageManager.getApplicationLabel(packageManager.getApplicationInfo(packageName, 0)).toString();
        } catch (PackageManager.NameNotFoundException exception) {
            return packageName;
        }
    }
}
