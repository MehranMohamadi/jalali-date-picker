package ir.budgetyar.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BudgetyarPrivacy")
public class BudgetyarPrivacyPlugin extends Plugin {
    private SharedPreferences preferences;
    private LinearLayout cover;
    private TextView message;
    private Button unlock;
    private BiometricPrompt prompt;
    private boolean enabled;
    private boolean locked;
    private boolean authenticating;
    private boolean foreground;
    private Runnable authenticatedOnResume;

    @Override
    public void load() {
        preferences = getContext().getSharedPreferences("budgetyar-privacy", Context.MODE_PRIVATE);
        enabled = preferences.getBoolean("lock-enabled", false);
        getActivity().runOnUiThread(() -> {
            createCover();
            updateSecureWindow();
            if (enabled) lock();
        });
    }

    private int authenticators() {
        // Strong + credential is unsupported on Android 10 and earlier.
        return (Build.VERSION.SDK_INT >= 30 ? BiometricManager.Authenticators.BIOMETRIC_STRONG
            : BiometricManager.Authenticators.BIOMETRIC_WEAK) | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    }

    private boolean available() {
        return BiometricManager.from(getContext()).canAuthenticate(authenticators()) == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private JSObject status() {
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        result.put("available", available());
        return result;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        getActivity().runOnUiThread(() -> call.resolve(status()));
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (locked || authenticating) {
                call.reject("Unlock the app first");
                return;
            }
            boolean requested = call.getBoolean("enabled", false);
            if (requested == enabled) {
                call.resolve(status());
                return;
            }
            authenticate(call, requested);
        });
    }

    private void createCover() {
        cover = new LinearLayout(getActivity());
        cover.setOrientation(LinearLayout.VERTICAL);
        cover.setGravity(Gravity.CENTER);
        cover.setPadding(48, 48, 48, 48);
        cover.setBackgroundColor(Color.rgb(17, 24, 39));
        cover.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        cover.setClickable(true);
        cover.setFocusableInTouchMode(true);
        TextView title = new TextView(getActivity());
        title.setText("‏برنامه قفل است");
        title.setTextColor(Color.WHITE);
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER);
        cover.addView(title);
        message = new TextView(getActivity());
        message.setTextColor(Color.LTGRAY);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, 24, 0, 32);
        cover.addView(message);
        unlock = new Button(getActivity());
        unlock.setText("‏بازکردن قفل");
        unlock.setOnClickListener(view -> authenticate(null, null));
        cover.addView(unlock);
        cover.setVisibility(View.GONE);
        getActivity().addContentView(cover, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void updateSecureWindow() {
        if (enabled) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }

    private void lock() {
        if (!enabled) return;
        locked = true;
        getBridge().getWebView().setVisibility(View.INVISIBLE);
        getBridge().getWebView().setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        cover.setVisibility(View.VISIBLE);
        cover.bringToFront();
        cover.requestFocus();
        message.setText("‏برای دیدن اطلاعات، با اثر انگشت یا رمز گوشی تأیید کن.");
    }

    private void reveal() {
        locked = false;
        cover.setVisibility(View.GONE);
        getBridge().getWebView().setVisibility(View.VISIBLE);
        getBridge().getWebView().setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);
        getBridge().getWebView().requestFocus();
    }

    private void authenticate(PluginCall call, Boolean requested) {
        if (authenticating || !foreground) {
            if (call != null) call.reject("Authentication unavailable while inactive");
            return;
        }
        if (!available()) {
            message.setText("‏اثر انگشت یا رمز صفحهٔ قفل گوشی را در تنظیمات اندروید فعال کن و دوباره تلاش کن.");
            if (call != null) call.reject("Set up device authentication first");
            return;
        }
        authenticating = true;
        unlock.setEnabled(false);
        prompt = new BiometricPrompt(getActivity(), ContextCompat.getMainExecutor(getContext()),
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    // Device-credential activity results can arrive before onResume.
                    if (!foreground) {
                        authenticatedOnResume = () -> finishAuthentication(call, requested);
                        return;
                    }
                    finishAuthentication(call, requested);
                }

                @Override
                public void onAuthenticationError(int code, CharSequence error) {
                    authenticatedOnResume = null;
                    authenticating = false;
                    unlock.setEnabled(true);
                    message.setText("‏تأیید انجام نشد؛ برای تلاش دوباره دکمهٔ بازکردن قفل را بزن.");
                    if (call != null) call.reject("Authentication cancelled or unavailable");
                }
            });
        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
            .setTitle("‏بازکردن بودجه‌یار")
            .setSubtitle("‏اثر انگشت یا رمز گوشی را تأیید کن")
            .setAllowedAuthenticators(authenticators())
            .build();
        try {
            prompt.authenticate(info);
        } catch (RuntimeException error) {
            authenticating = false;
            unlock.setEnabled(true);
            if (call != null) call.reject("Authentication unavailable");
        }
    }

    private void finishAuthentication(PluginCall call, Boolean requested) {
        authenticating = false;
        unlock.setEnabled(true);
        if (requested != null) {
            // Commit before reporting success; the preference survives process death.
            if (!preferences.edit().putBoolean("lock-enabled", requested).commit()) {
                if (call != null) call.reject("Could not save lock preference");
                return;
            }
            enabled = requested;
            updateSecureWindow();
        }
        reveal();
        if (call != null) call.resolve(status());
    }

    @Override
    protected void handleOnResume() {
        foreground = true;
        if (locked) cover.bringToFront();
        if (authenticatedOnResume != null) {
            Runnable success = authenticatedOnResume;
            authenticatedOnResume = null;
            success.run();
        }
    }

    @Override
    protected void handleOnPause() {
        foreground = false;
        lock();
    }

    @Override
    protected void handleOnDestroy() {
        authenticatedOnResume = null;
        if (prompt != null) prompt.cancelAuthentication();
    }
}
