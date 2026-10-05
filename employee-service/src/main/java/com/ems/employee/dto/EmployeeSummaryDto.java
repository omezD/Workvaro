package com.ems.employee.dto;

import com.ems.employee.entity.EmployeeStatus;

/** Directory row: contact details only, no personal or sensitive fields. */
public record EmployeeSummaryDto(
        Long id,
        String empCode,
        String firstName,
        String lastName,
        String fullName,
        String email,
        String phone,
        Long departmentId,
        String departmentName,
        Long designationId,
        String designationTitle,
        EmployeeStatus status) {
}
