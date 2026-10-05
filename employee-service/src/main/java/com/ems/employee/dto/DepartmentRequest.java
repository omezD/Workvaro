package com.ems.employee.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DepartmentRequest(
        @NotBlank @Size(max = 20) @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "letters, digits, '-' and '_' only")
        String code,
        @NotBlank @Size(max = 100) String name,
        @Size(max = 500) String description) {
}
