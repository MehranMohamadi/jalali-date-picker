package ir.budgetyar.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

final class BankNotificationStore {
    static final String PREFS_NAME = "budgetyar_bank_notifications";
    static final String KEY_SELECTED_PACKAGE = "selected_package";
    static final String KEY_SELECTED_LABEL = "selected_label";
    private static final String KEY_SUGGESTIONS = "suggestions";
    private static final int MAX_SUGGESTIONS = 30;

    private BankNotificationStore() {}

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static String getSelectedPackage(Context context) {
        return prefs(context).getString(KEY_SELECTED_PACKAGE, "");
    }

    static String getSelectedLabel(Context context) {
        return prefs(context).getString(KEY_SELECTED_LABEL, "");
    }

    static void setSelectedApp(Context context, String packageName, String label) {
        prefs(context)
            .edit()
            .putString(KEY_SELECTED_PACKAGE, packageName)
            .putString(KEY_SELECTED_LABEL, label)
            .apply();
    }

    static JSONArray getSuggestions(Context context) {
        String raw = prefs(context).getString(KEY_SUGGESTIONS, "[]");
        try {
            return new JSONArray(raw);
        } catch (JSONException exception) {
            prefs(context).edit().remove(KEY_SUGGESTIONS).apply();
            return new JSONArray();
        }
    }

    static void addSuggestion(Context context, JSONObject suggestion) {
        JSONArray current = getSuggestions(context);
        JSONArray next = new JSONArray();
        String id = suggestion.optString("id");

        next.put(suggestion);
        for (int index = 0; index < current.length() && next.length() < MAX_SUGGESTIONS; index += 1) {
            JSONObject item = current.optJSONObject(index);
            if (item == null || id.equals(item.optString("id"))) continue;
            next.put(item);
        }

        prefs(context).edit().putString(KEY_SUGGESTIONS, next.toString()).apply();
    }

    static void removeSuggestion(Context context, String id) {
        JSONArray current = getSuggestions(context);
        JSONArray next = new JSONArray();

        for (int index = 0; index < current.length(); index += 1) {
            JSONObject item = current.optJSONObject(index);
            if (item == null || id.equals(item.optString("id"))) continue;
            next.put(item);
        }

        prefs(context).edit().putString(KEY_SUGGESTIONS, next.toString()).apply();
    }

    static List<JSONObject> toList(JSONArray array) {
        List<JSONObject> items = new ArrayList<>();
        for (int index = 0; index < array.length(); index += 1) {
            JSONObject item = array.optJSONObject(index);
            if (item != null) items.add(item);
        }
        return items;
    }
}
