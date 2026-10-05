package com.ems.employee.dto;

import com.ems.employee.entity.EmployeeStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EmployeeStatusRequest(@NotNull EmployeeStatus status, @Size(max = 500) String reason) {
}
