package com.ems.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "ems.gateway")
public record GatewayProperties(List<String> allowedOrigins, int requestsPerMinute) {

    public GatewayProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
        if (requestsPerMinute <= 0) {
            requestsPerMinute = 120;
        }
    }
}
