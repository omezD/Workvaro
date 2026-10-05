package com.ems.common.config;

import com.ems.common.crypto.AesGcmAttributeConverter;
import com.ems.common.crypto.AesGcmEncryptor;
import com.ems.common.exception.GlobalExceptionHandler;
import com.ems.common.security.CurrentUser;
import com.ems.common.security.SecurityConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

/**
 * Wires the shared pieces into every servlet service that depends on common-lib.
 * Runs before Boot's security auto-configuration so our {@code SecurityFilterChain} replaces the default one.
 */
@AutoConfiguration(before = {SecurityAutoConfiguration.class, OAuth2ResourceServerAutoConfiguration.class})
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import({SecurityConfig.class, GlobalExceptionHandler.class, OpenApiConfig.class})
public class EmsCommonAutoConfiguration {

    @Bean
    CurrentUser currentUser() {
        return new CurrentUser();
    }

    @Bean
    @ConditionalOnProperty("ems.security.encryption-key")
    AesGcmEncryptor aesGcmEncryptor(@Value("${ems.security.encryption-key}") String key) {
        return new AesGcmEncryptor(key);
    }

    @Bean
    @ConditionalOnProperty("ems.security.encryption-key")
    AesGcmAttributeConverter aesGcmAttributeConverter(AesGcmEncryptor encryptor) {
        return new AesGcmAttributeConverter(encryptor);
    }
}
