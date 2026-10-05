package com.ems.common.security;

import com.ems.common.exception.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;

/**
 * Every service is an OAuth2 resource server and validates the Keycloak JWT itself (zero trust):
 * a request is never trusted just because it came through the gateway.
 */
@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_PATHS = {
            "/actuator/health", "/actuator/health/**", "/actuator/info",
            "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**"
    };

    @Bean
    SecurityFilterChain apiSecurityFilterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable) // CORS is handled once, at the gateway
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(new KeycloakRoleConverter()))
                        .authenticationEntryPoint(entryPoint(objectMapper))
                        .accessDeniedHandler(accessDeniedHandler(objectMapper)))
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(entryPoint(objectMapper))
                        .accessDeniedHandler(accessDeniedHandler(objectMapper)));
        return http.build();
    }

    private AuthenticationEntryPoint entryPoint(ObjectMapper objectMapper) {
        return (request, response, ex) -> {
            response.setHeader("WWW-Authenticate", "Bearer");
            write(response, objectMapper, ApiError.of(HttpStatus.UNAUTHORIZED,
                    "Authentication required", request.getRequestURI()));
        };
    }

    private AccessDeniedHandler accessDeniedHandler(ObjectMapper objectMapper) {
        return (request, response, ex) -> write(response, objectMapper, ApiError.of(HttpStatus.FORBIDDEN,
                "You do not have permission to perform this action", request.getRequestURI()));
    }

    private static void write(HttpServletResponse response, ObjectMapper objectMapper, ApiError error)
            throws IOException {
        response.setStatus(error.status());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), error);
    }
}
