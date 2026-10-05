package com.ems.common.crypto;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM with a random 12-byte IV per value. Stored format: {@code v1:base64(iv || ciphertext+tag)}.
 * The key comes from {@code ems.security.encryption-key} (base64 of 32 random bytes), never from code.
 */
public class AesGcmEncryptor {

    private static final String PREFIX = "v1:";
    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public AesGcmEncryptor(String base64Key) {
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(base64Key.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("ems.security.encryption-key must be base64", e);
        }
        if (raw.length != 32) {
            throw new IllegalStateException("ems.security.encryption-key must decode to 32 bytes (AES-256)");
        }
        this.key = new SecretKeySpec(raw, "AES");
    }

    public String encrypt(String plain) {
        if (plain == null) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            byte[] out = ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
            return PREFIX + Base64.getEncoder().encodeToString(out);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    public String decrypt(String stored) {
        if (stored == null) {
            return null;
        }
        if (!stored.startsWith(PREFIX)) {
            throw new IllegalStateException("Value is not in the encrypted format");
        }
        try {
            byte[] in = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, in, 0, IV_LENGTH));
            byte[] plain = cipher.doFinal(in, IV_LENGTH, in.length - IV_LENGTH);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("Decryption failed (wrong key or corrupted value)", e);
        }
    }
}
