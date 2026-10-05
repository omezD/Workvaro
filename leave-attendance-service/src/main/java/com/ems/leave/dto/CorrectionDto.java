package com.ems.leave.dto;

import com.ems.leave.entity.RequestStatus;

import java.time.Instant;
import java.time.LocalDate;

public record CorrectionDto(
        Long id,
        String employeeUserId,
        String employeeName,
        LocalDate workDate,
        Instant requestedCheckIn,
        Instant requestedCheckOut,
        String reason,
        RequestStatus status,
        String decidedByName,
        String decisionComment,
        Instant decidedAt,
        Instant createdAt) {
}
