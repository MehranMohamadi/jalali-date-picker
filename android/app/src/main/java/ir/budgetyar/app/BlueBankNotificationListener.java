package ir.budgetyar.app;

import android.app.Notification;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

public class BlueBankNotificationListener extends NotificationListenerService {
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String selectedPackage = BankNotificationStore.getSelectedPackage(this);
        if (selectedPackage.length() == 0 || !selectedPackage.equals(sbn.getPackageName())) return;

        Notification notification = sbn.getNotification();
        if (notification == null || notification.extras == null) return;

        Bundle extras = notification.extras;
        String title = charSequenceToString(extras.getCharSequence(Notification.EXTRA_TITLE));
        String text = charSequenceToString(extras.getCharSequence(Notification.EXTRA_TEXT));
        String bigText = charSequenceToString(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        String body = bigText.length() > text.length() ? bigText : text;
        JSONObject suggestion = BankNotificationParser.parse(
            sbn.getPackageName(),
            getAppLabel(sbn.getPackageName()),
            title,
            body,
            sbn.getPostTime()
        );

        if (suggestion != null) BankNotificationStore.addSuggestion(this, suggestion);
    }

    private String charSequenceToString(CharSequence value) {
        return value == null ? "" : value.toString();
    }

    private String getAppLabel(String packageName) {
        PackageManager packageManager = getPackageManager();
        try {
            ApplicationInfo info = packageManager.getApplicationInfo(packageName, 0);
            return packageManager.getApplicationLabel(info).toString();
        } catch (PackageManager.NameNotFoundException exception) {
            return "بلو بانک";
        }
    }
}
