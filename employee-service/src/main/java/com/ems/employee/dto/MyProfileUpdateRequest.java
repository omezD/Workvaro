package com.ems.employee.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** The only fields an employee may change on their own profile. */
public record MyProfileUpdateRequest(
        @Pattern(regexp = ValidationPatterns.PHONE, message = "invalid phone number") String phone,
        @Size(max = 500) String address,
        @Size(max = 100) String emergencyContactName,
        @Pattern(regexp = ValidationPatterns.PHONE, message = "invalid phone number") String emergencyContactPhone) {
}
