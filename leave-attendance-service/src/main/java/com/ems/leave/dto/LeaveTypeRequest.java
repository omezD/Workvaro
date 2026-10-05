package com.ems.leave.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record LeaveTypeRequest(
        @NotBlank @Size(max = 10) @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "letters, digits and '_' only")
        String code,
        @NotBlank @Size(max = 60) String name,
        @Min(0) @Max(365) int annualQuota,
        boolean paid,
        boolean unlimited,
        boolean active) {
}
