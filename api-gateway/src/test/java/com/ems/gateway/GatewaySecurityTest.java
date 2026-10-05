package com.ems.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.springframework.security.test.web.reactive.server.SecurityMockServerConfigurers.mockJwt;

/** Edge security: no token, blocked internal paths, CORS and security headers. No downstream service needed. */
@SpringBootTest
@AutoConfigureWebTestClient
class GatewaySecurityTest {

    /** CORS needs an absolute request URL (a browser always sends Host); mock requests otherwise have none. */
    private static final String GATEWAY = "http://localhost:8080";

    @Autowired
    WebTestClient client;

    @Test
    void apiWithoutTokenIs401() {
        client.get().uri("/api/employees").exchange().expectStatus().isUnauthorized();
        client.post().uri("/api/leaves").exchange().expectStatus().isUnauthorized();
        client.get().uri("/api/dashboard/hr").exchange().expectStatus().isUnauthorized();
    }

    @Test
    void internalServiceEndpointsAreNeverExposed() {
        client.mutateWith(mockJwt()).get().uri("/internal/employees/active")
                .exchange().expectStatus().isForbidden();
    }

    @Test
    void healthIsPublic() {
        client.get().uri("/actuator/health").exchange().expectStatus().isOk();
    }

    @Test
    void securityHeadersAreSet() {
        client.get().uri("/api/employees").exchange()
                .expectHeader().valueEquals("X-Content-Type-Options", "nosniff")
                .expectHeader().valueEquals("X-Frame-Options", "DENY")
                .expectHeader().valueEquals("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
                .expectHeader().valueEquals("Referrer-Policy", "no-referrer");
    }

    @Test
    void corsPreflightAllowsTheFrontendOrigin() {
        client.options().uri(GATEWAY + "/api/employees")
                .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization")
                .exchange()
                .expectStatus().isOk()
                .expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200");
    }

    @Test
    void corsPreflightRejectsOtherOrigins() {
        client.options().uri(GATEWAY + "/api/employees")
                .header(HttpHeaders.ORIGIN, "https://evil.example")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                .exchange()
                .expectStatus().isForbidden();
    }
}
