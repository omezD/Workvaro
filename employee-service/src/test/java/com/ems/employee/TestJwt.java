package com.ems.employee;

import com.ems.common.security.KeycloakRoleConverter;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

/** Keycloak-shaped test tokens; roles go through the real {@link KeycloakRoleConverter}. */
public final class TestJwt {

    public static final String ADMIN_ID = "11111111-1111-4111-8111-111111111111";
    public static final String HR_ID = "22222222-2222-4222-8222-222222222222";
    public static final String MANAGER_ID = "33333333-3333-4333-8333-333333333333";
    public static final String EMPLOYEE_ID = "44444444-4444-4444-8444-444444444444";

    private TestJwt() {
    }

    /** For MockMvc requests. */
    public static JwtRequestPostProcessor as(String userId, String... roles) {
        return jwt().jwt(token(userId, roles)).authorities(KeycloakRoleConverter::extractAuthorities);
    }

    public static JwtRequestPostProcessor employee() {
        return as(EMPLOYEE_ID, "EMPLOYEE");
    }

    public static JwtRequestPostProcessor manager() {
        return as(MANAGER_ID, "MANAGER", "EMPLOYEE");
    }

    public static JwtRequestPostProcessor hr() {
        return as(HR_ID, "HR", "EMPLOYEE");
    }

    public static JwtRequestPostProcessor admin() {
        return as(ADMIN_ID, "ADMIN", "MANAGER", "EMPLOYEE");
    }

    /** For plain unit tests: puts a JWT authentication into the SecurityContext. */
    public static void login(String userId, String... roles) {
        loginWithEmail(userId, null, roles);
    }

    public static void loginWithEmail(String userId, String email, String... roles) {
        Jwt.Builder builder = Jwt.withTokenValue("test-token").header("alg", "none")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300));
        token(userId, roles).accept(builder);
        if (email != null) {
            builder.claim("email", email);
        }
        Jwt jwt = builder.build();
        SecurityContextHolder.getContext()
                .setAuthentication(new JwtAuthenticationToken(jwt, KeycloakRoleConverter.extractAuthorities(jwt), userId));
    }

    public static void logout() {
        SecurityContextHolder.clearContext();
    }

    private static java.util.function.Consumer<Jwt.Builder> token(String userId, String... roles) {
        return b -> b.subject(userId)
                .claim("preferred_username", "user-" + userId.substring(0, 4))
                .claim("realm_access", Map.of("roles", List.of(roles)));
    }
}
