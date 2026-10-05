package com.ems.employee.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DesignationRequest(
        @NotBlank @Size(max = 100) String title,
        @Min(1) @Max(20) int level,
        @Size(max = 500) String description) {
}
