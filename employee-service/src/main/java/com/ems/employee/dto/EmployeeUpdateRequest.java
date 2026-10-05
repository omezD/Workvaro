package com.ems.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** HR update. The employee code is immutable; a null {@code bankAccount} keeps the stored value. */
public record EmployeeUpdateRequest(
        @Size(max = 64) String keycloakUserId,
        @NotBlank @Size(max = 60) String firstName,
        @NotBlank @Size(max = 60) String lastName,
        @NotBlank @Email @Size(max = 150) String email,
        @Pattern(regexp = ValidationPatterns.PHONE, message = "invalid phone number") String phone,
        @Past LocalDate dateOfBirth,
        @NotNull LocalDate joinDate,
        Long departmentId,
        Long designationId,
        Long managerId,
        @Pattern(regexp = ValidationPatterns.BANK_ACCOUNT, message = "6 to 20 digits") String bankAccount,
        @Size(max = 500) String address,
        @Size(max = 100) String emergencyContactName,
        @Pattern(regexp = ValidationPatterns.PHONE, message = "invalid phone number") String emergencyContactPhone) {
}
