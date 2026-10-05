package com.ems.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.header.ReferrerPolicyServerHttpHeadersWriter.ReferrerPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.List;

/**
 * First line of defence: rejects requests without a valid Keycloak JWT before they reach a service.
 * Fine-grained role and ownership checks stay inside each service.
 */
@Configuration(proxyBeanMethods = false)
@EnableWebFluxSecurity
public class GatewaySecurityConfig {

    @Bean
    SecurityWebFilterChain gatewaySecurityFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .cors(cors -> {
                })
                .authorizeExchange(ex -> ex
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .pathMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .pathMatchers("/internal/**").denyAll()
                        .anyExchange().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> {
                }))
                .headers(h -> h
                        .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                        .referrerPolicy(r -> r.policy(ReferrerPolicy.NO_REFERRER))
                        .hsts(hsts -> hsts.maxAge(Duration.ofDays(365)).includeSubdomains(true)))
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(GatewayProperties props) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(props.allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        config.setExposedHeaders(List.of("Location", "Content-Disposition"));
        config.setAllowCredentials(false);
        config.setMaxAge(Duration.ofHours(1));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
