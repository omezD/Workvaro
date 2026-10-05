package com.ems.employee.dto;

import com.ems.employee.entity.EmployeeStatus;

import java.time.Instant;
import java.time.LocalDate;

public record EmployeeDetailDto(
        Long id,
        String keycloakUserId,
        String empCode,
        String firstName,
        String lastName,
        String fullName,
        String email,
        String phone,
        LocalDate dateOfBirth,
        LocalDate joinDate,
        Long departmentId,
        String departmentName,
        Long designationId,
        String designationTitle,
        Long managerId,
        String managerName,
        EmployeeStatus status,
        String bankAccount,
        boolean bankAccountMasked,
        String address,
        String emergencyContactName,
        String emergencyContactPhone,
        Instant createdAt,
        Instant updatedAt) {

    public EmployeeDetailDto withMaskedBankAccount(String masked) {
        return new EmployeeDetailDto(id, keycloakUserId, empCode, firstName, lastName, fullName, email, phone,
                dateOfBirth, joinDate, departmentId, departmentName, designationId, designationTitle, managerId,
                managerName, status, masked, true, address, emergencyContactName, emergencyContactPhone,
                createdAt, updatedAt);
    }
}
