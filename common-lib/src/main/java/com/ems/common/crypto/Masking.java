package com.ems.common.crypto;

public final class Masking {

    private Masking() {
    }

    /** {@code 123456789012} becomes {@code ********9012}. */
    public static String maskAllButLast4(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        int visible = Math.min(4, value.length());
        return "*".repeat(value.length() - visible) + value.substring(value.length() - visible);
    }
}
