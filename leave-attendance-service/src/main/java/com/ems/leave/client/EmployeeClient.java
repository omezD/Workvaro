package com.ems.leave.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

/**
 * Calls employee-service with the caller's own JWT (zero trust: employee-service authorises it again).
 * The token is an explicit parameter rather than a thread-local, so it survives circuit-breaker threads.
 */
@FeignClient(name = "employee-service", url = "${ems.services.employee-url}", path = "/internal/employees")
public interface EmployeeClient {

    @GetMapping("/by-user/{keycloakUserId}")
    EmployeeRef byUser(@RequestHeader(HttpHeaders.AUTHORIZATION) String bearer,
                       @PathVariable("keycloakUserId") String keycloakUserId);

    @GetMapping("/team/{managerKeycloakUserId}")
    List<EmployeeRef> team(@RequestHeader(HttpHeaders.AUTHORIZATION) String bearer,
                           @PathVariable("managerKeycloakUserId") String managerKeycloakUserId);

    @GetMapping("/active")
    List<EmployeeRef> active(@RequestHeader(HttpHeaders.AUTHORIZATION) String bearer);
}
