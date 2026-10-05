package com.ems.leave.client;

/** Mirror of employee-service's InternalEmployeeDto. */
public record EmployeeRef(
        Long id,
        String keycloakUserId,
        String empCode,
        String fullName,
        String email,
        Long departmentId,
        String departmentName,
        Long managerId,
        String managerKeycloakUserId,
        String status) {

    public boolean isCurrent() {
        return "ACTIVE".equals(status) || "ON_NOTICE".equals(status);
    }
}
