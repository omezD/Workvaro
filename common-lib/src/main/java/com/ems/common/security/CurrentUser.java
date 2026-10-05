package com.ems.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** Reads the caller's identity from the validated Keycloak JWT of the current request. */
public class CurrentUser {

    /** Keycloak user id ({@code sub}). */
    public String id() {
        return jwt().getSubject();
    }

    public String email() {
        return jwt().getClaimAsString("email");
    }

    public String username() {
        return jwt().getClaimAsString("preferred_username");
    }

    public String fullName() {
        String name = jwt().getClaimAsString("name");
        return name != null ? name : username();
    }

    /** Raw access token, used to forward the caller's identity on service-to-service calls. */
    public String token() {
        return jwt().getTokenValue();
    }

    public boolean hasRole(String role) {
        return authentication().getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    public boolean isHrOrAdmin() {
        return hasRole(Roles.HR) || hasRole(Roles.ADMIN);
    }

    public boolean isManager() {
        return hasRole(Roles.MANAGER);
    }

    public Jwt jwt() {
        if (authentication() instanceof JwtAuthenticationToken token) {
            return token.getToken();
        }
        throw new IllegalStateException("No JWT authentication in the security context");
    }

    private Authentication authentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new IllegalStateException("No authentication in the security context");
        }
        return authentication;
    }
}
