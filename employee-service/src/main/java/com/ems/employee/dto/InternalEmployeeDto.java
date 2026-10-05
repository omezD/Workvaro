package com.ems.employee.dto;

import com.ems.employee.entity.EmployeeStatus;

/** Minimal view for service-to-service calls (no contact, personal or bank data). */
public record InternalEmployeeDto(
        Long id,
        String keycloakUserId,
        String empCode,
        String fullName,
        String email,
        Long departmentId,
        String departmentName,
        Long managerId,
        String managerKeycloakUserId,
        EmployeeStatus status) {
}
