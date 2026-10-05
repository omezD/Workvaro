package com.ems.employee.controller;

import com.ems.employee.dto.InternalEmployeeDto;
import com.ems.employee.service.EmployeeService;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Service-to-service lookups used by leave-attendance-service. Not routed by the gateway (it denies
 * {@code /internal/**}), and still requires the caller's forwarded JWT. Returns minimal fields only.
 */
@Hidden
@RestController
@RequestMapping("/internal/employees")
@RequiredArgsConstructor
public class InternalEmployeeController {

    private final EmployeeService service;

    @GetMapping("/by-user/{keycloakUserId}")
    public InternalEmployeeDto byUser(@PathVariable String keycloakUserId) {
        return service.internalByUser(keycloakUserId);
    }

    @GetMapping("/team/{managerKeycloakUserId}")
    public List<InternalEmployeeDto> team(@PathVariable String managerKeycloakUserId) {
        return service.internalTeam(managerKeycloakUserId);
    }

    @GetMapping("/active")
    public List<InternalEmployeeDto> active() {
        return service.internalActive();
    }
}
