package com.ems.leave.dto;

import com.ems.leave.entity.RequestStatus;

import java.time.Instant;
import java.time.LocalDate;

public record LeaveRequestDto(
        Long id,
        String employeeUserId,
        Long employeeId,
        String employeeName,
        Long leaveTypeId,
        String leaveTypeCode,
        String leaveTypeName,
        LocalDate startDate,
        LocalDate endDate,
        int days,
        String reason,
        RequestStatus status,
        String decidedByName,
        String decisionComment,
        Instant decidedAt,
        Instant createdAt) {
}
