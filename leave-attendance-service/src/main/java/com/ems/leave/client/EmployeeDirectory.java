package com.ems.leave.client;

import com.ems.common.exception.ApiException;
import com.ems.common.security.CurrentUser;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.client.circuitbreaker.NoFallbackAvailableException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Supplier;

/**
 * Facade over {@link EmployeeClient} that forwards the caller's token and turns remote failures into
 * clean API errors: 404 stays 404, an outage or open circuit becomes 503.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmployeeDirectory {

    private final EmployeeClient client;
    private final CurrentUser currentUser;

    /** The caller's own employee record; must be a current employee. */
    public EmployeeRef me() {
        EmployeeRef me = byUser(currentUser.id());
        if (!me.isCurrent()) {
            throw ApiException.forbidden("Your employee profile is not active");
        }
        return me;
    }

    public EmployeeRef byUser(String keycloakUserId) {
        return call(() -> client.byUser(bearer(), keycloakUserId));
    }

    /** Direct reports of the given manager. */
    public List<EmployeeRef> team(String managerKeycloakUserId) {
        return call(() -> client.team(bearer(), managerKeycloakUserId));
    }

    public List<EmployeeRef> active() {
        return call(() -> client.active(bearer()));
    }

    private String bearer() {
        return "Bearer " + currentUser.token();
    }

    private <T> T call(Supplier<T> remote) {
        try {
            return remote.get();
        } catch (RuntimeException e) {
            Throwable cause = e instanceof NoFallbackAvailableException && e.getCause() != null ? e.getCause() : e;
            if (cause instanceof FeignException.NotFound) {
                throw ApiException.notFound("No employee profile is linked to this account. Please contact HR.");
            }
            if (cause instanceof FeignException.Forbidden || cause instanceof FeignException.Unauthorized) {
                throw ApiException.forbidden("Employee lookup was not permitted");
            }
            log.warn("employee-service call failed: {}", cause.toString());
            throw ApiException.serviceUnavailable("Employee directory is temporarily unavailable, please retry");
        }
    }
}
