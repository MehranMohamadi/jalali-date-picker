package ir.budgetyar.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
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
        cover.setPadding(dp(24), dp(24), dp(24), dp(24));
        cover.setBackgroundColor(0xFF111113);
        cover.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        cover.setClickable(true);
        cover.setFocusableInTouchMode(true);

        LinearLayout panel = new LinearLayout(getActivity());
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(24), dp(24), dp(24), dp(24));
        GradientDrawable surface = roundedBackground(0xFF1B1B20, 24);
        surface.setStroke(dp(1), 0xFF34343C);
        panel.setBackground(surface);
        int availableWidth = getActivity().getResources().getDisplayMetrics().widthPixels - dp(48);
        cover.addView(panel, new LinearLayout.LayoutParams(
            Math.min(dp(340), availableWidth), ViewGroup.LayoutParams.WRAP_CONTENT));

        ImageView icon = new ImageView(getActivity());
        icon.setImageResource(android.R.drawable.ic_lock_lock);
        icon.setImageTintList(ColorStateList.valueOf(0xFFE0DCFF));
        icon.setBackground(roundedBackground(0xFF333044, 18));
        icon.setPadding(dp(15), dp(15), dp(15), dp(15));
        icon.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        panel.addView(icon, new LinearLayout.LayoutParams(dp(56), dp(56)));

        TextView title = new TextView(getActivity());
        title.setText("‏ورود به بودجه‌یار");
        title.setTextColor(0xFFF6F5FA);
        title.setTextSize(20);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        if (Build.VERSION.SDK_INT >= 28) title.setAccessibilityHeading(true);
        LinearLayout.LayoutParams titleLayout = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleLayout.topMargin = dp(14);
        panel.addView(title, titleLayout);

        unlock = new Button(getActivity());
        unlock.setText("‏بازکردن قفل");
        unlock.setTextColor(0xFF211A37);
        unlock.setTextSize(15);
        unlock.setAllCaps(false);
        unlock.setBackgroundTintList(null);
        GradientDrawable action = roundedBackground(0xFFD4C8FF, 14);
        unlock.setBackground(new RippleDrawable(ColorStateList.valueOf(0x33211A37), action, null));
        unlock.setMinHeight(dp(48));
        unlock.setMinimumHeight(dp(48));
        unlock.setOnClickListener(view -> authenticate(null, null));
        LinearLayout.LayoutParams buttonLayout = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        buttonLayout.topMargin = dp(20);
        panel.addView(unlock, buttonLayout);

        message = new TextView(getActivity());
        message.setTextColor(0xFFC9C5D2);
        message.setTextSize(13);
        message.setGravity(Gravity.CENTER);
        message.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        message.setVisibility(View.GONE);
        LinearLayout.LayoutParams messageLayout = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        messageLayout.topMargin = dp(12);
        panel.addView(message, messageLayout);

        cover.setVisibility(View.GONE);
        getActivity().addContentView(cover, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private int dp(int value) {
        return Math.round(value * getActivity().getResources().getDisplayMetrics().density);
    }

    private GradientDrawable roundedBackground(int color, int radius) {
        GradientDrawable background = new GradientDrawable();
        background.setColor(color);
        background.setCornerRadius(dp(radius));
        return background;
    }

    private void showMessage(String text) {
        message.setText(text);
        message.setVisibility(View.VISIBLE);
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
        message.setVisibility(View.GONE);
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
            showMessage("‏اثر انگشت یا رمز گوشی را فعال کن.");
            if (call != null) call.reject("Set up device authentication first");
            return;
        }
        message.setVisibility(View.GONE);
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
                    if (call == null) showMessage("‏دوباره تلاش کن.");
                    if (call != null) call.reject("Authentication cancelled or unavailable");
                }
            });
        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(requested == null ? "‏ورود به بودجه‌یار"
                : requested ? "‏فعال‌کردن قفل" : "‏غیرفعال‌کردن قفل")
            .setAllowedAuthenticators(authenticators())
            .build();
        try {
            prompt.authenticate(info);
        } catch (RuntimeException error) {
            authenticating = false;
            unlock.setEnabled(true);
            if (call != null) call.reject("Authentication unavailable");
            else showMessage("‏دوباره تلاش کن.");
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
