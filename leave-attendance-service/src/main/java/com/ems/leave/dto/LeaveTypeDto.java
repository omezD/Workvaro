package com.ems.leave.dto;

public record LeaveTypeDto(Long id, String code, String name, int annualQuota, boolean paid, boolean unlimited,
                           boolean active) {
}
