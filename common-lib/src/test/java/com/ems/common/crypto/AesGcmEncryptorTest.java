package com.ems.common.crypto;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AesGcmEncryptorTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    @Test
    void roundTripsAndUsesRandomIv() {
        AesGcmEncryptor encryptor = new AesGcmEncryptor(KEY);
        String a = encryptor.encrypt("123456789012");
        String b = encryptor.encrypt("123456789012");

        assertThat(a).startsWith("v1:").isNotEqualTo(b);
        assertThat(encryptor.decrypt(a)).isEqualTo("123456789012");
    }

    @Test
    void rejectsWrongKey() {
        String cipherText = new AesGcmEncryptor(KEY).encrypt("secret");
        byte[] other = new byte[32];
        other[0] = 1;
        AesGcmEncryptor wrong = new AesGcmEncryptor(Base64.getEncoder().encodeToString(other));

        assertThatThrownBy(() -> wrong.decrypt(cipherText)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void masksAllButLastFour() {
        assertThat(Masking.maskAllButLast4("123456789012")).isEqualTo("********9012");
        assertThat(Masking.maskAllButLast4("12")).isEqualTo("12");
    }
}
