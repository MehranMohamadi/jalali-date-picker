package ir.budgetyar.app;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class BankNotificationParser {
    private static final List<String> EXPENSE_WORDS = Arrays.asList("خرید", "پرداخت", "برداشت", "کسر", "انتقال", "هزینه");
    private static final List<String> IGNORED_WORDS = Arrays.asList("واریز", "دریافت", "رمز", "پویا", "کد", "تایید", "تأیید", "otp", "رمز یکبار مصرف");
    private static final Pattern MONEY_PATTERN = Pattern.compile("(\\d[\\d,\\s٬،.]*)\\s*(ریال|تومان)?");

    private BankNotificationParser() {}

    static JSONObject parse(String packageName, String appName, String title, String text, long postTime) {
        String rawText = join(title, text).trim();
        String normalized = normalizeDigits(rawText).toLowerCase(Locale.ROOT);

        if (normalized.length() == 0 || containsAny(normalized, IGNORED_WORDS) || !containsAny(normalized, EXPENSE_WORDS)) {
            return null;
        }

        long amount = extractAmount(normalized);
        if (amount <= 0) return null;

        try {
            JSONObject suggestion = new JSONObject();
            suggestion.put("id", createId(packageName, postTime, amount, normalized));
            suggestion.put("sourcePackage", packageName);
            suggestion.put("sourceApp", appName.length() > 0 ? appName : "بلو بانک");
            suggestion.put("title", buildTitle(rawText));
            suggestion.put("amount", amount);
            suggestion.put("category", suggestCategory(normalized));
            suggestion.put("postTime", postTime);
            suggestion.put("rawText", rawText);
            return suggestion;
        } catch (JSONException exception) {
            return null;
        }
    }

    private static String join(String title, String text) {
        String safeTitle = title == null ? "" : title;
        String safeText = text == null ? "" : text;
        return (safeTitle + " " + safeText).replaceAll("\\s+", " ");
    }

    private static String normalizeDigits(String value) {
        StringBuilder output = new StringBuilder();
        String persian = "۰۱۲۳۴۵۶۷۸۹";
        String arabic = "٠١٢٣٤٥٦٧٨٩";

        for (int index = 0; index < value.length(); index += 1) {
            char current = value.charAt(index);
            int persianIndex = persian.indexOf(current);
            int arabicIndex = arabic.indexOf(current);

            if (persianIndex >= 0) {
                output.append(persianIndex);
            } else if (arabicIndex >= 0) {
                output.append(arabicIndex);
            } else {
                output.append(current);
            }
        }

        return output.toString();
    }

    private static boolean containsAny(String text, List<String> words) {
        for (String word : words) {
            if (text.contains(word.toLowerCase(Locale.ROOT))) return true;
        }
        return false;
    }

    private static long extractAmount(String text) {
        Matcher matcher = MONEY_PATTERN.matcher(text);
        long best = 0;

        while (matcher.find()) {
            String digits = matcher.group(1).replaceAll("[^0-9]", "");
            if (digits.length() == 0) continue;
            long amount;
            try {
                amount = Long.parseLong(digits);
            } catch (NumberFormatException exception) {
                continue;
            }
            if ("ریال".equals(matcher.group(2))) amount = Math.round(amount / 10.0);
            if (amount >= 1000 && amount > best) best = amount;
        }

        return best;
    }

    private static String suggestCategory(String text) {
        if (containsAny(text, Arrays.asList("رستوران", "کافه", "غذا", "سوپرمارکت", "مارکت"))) return "food";
        if (containsAny(text, Arrays.asList("اسنپ", "تپسی", "تاکسی", "سوخت", "بنزین", "مترو"))) return "transport";
        if (containsAny(text, Arrays.asList("قبض", "برق", "آب", "گاز", "شارژ", "اینترنت", "همراه"))) return "bills";
        if (containsAny(text, Arrays.asList("دارو", "درمان", "بیمارستان", "کلینیک", "پزشک"))) return "health";
        if (containsAny(text, Arrays.asList("پوشاک", "لباس", "کفش"))) return "clothes";
        if (containsAny(text, Arrays.asList("آموزش", "دوره", "کتاب", "دانشگاه"))) return "education";
        if (containsAny(text, Arrays.asList("هتل", "بلیط", "سفر", "پرواز"))) return "travel";
        if (containsAny(text, Arrays.asList("سینما", "بازی", "تفریح", "سرگرمی"))) return "fun";
        return "shopping";
    }

    private static String buildTitle(String rawText) {
        String compact = rawText.replaceAll("\\s+", " ").trim();
        if (compact.length() == 0) return "هزینه بلو بانک";
        return compact.length() > 48 ? compact.substring(0, 45) + "..." : compact;
    }

    private static String createId(String packageName, long postTime, long amount, String text) {
        String source = packageName + "|" + postTime + "|" + amount + "|" + text.substring(0, Math.min(160, text.length()));
        return "bank-" + Integer.toString(source.hashCode() & 0x7fffffff, 36);
    }
}
