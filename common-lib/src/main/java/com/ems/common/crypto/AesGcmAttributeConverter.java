package com.ems.common.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Encrypts a String column at rest. Use with {@code @Convert(converter = AesGcmAttributeConverter.class)}.
 * Hibernate obtains it through Spring's bean container, so the encryptor is injected.
 */
@Converter
public class AesGcmAttributeConverter implements AttributeConverter<String, String> {

    private final AesGcmEncryptor encryptor;

    public AesGcmAttributeConverter(AesGcmEncryptor encryptor) {
        this.encryptor = encryptor;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        return attribute == null || attribute.isBlank() ? null : encryptor.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return dbData == null ? null : encryptor.decrypt(dbData);
    }
}
