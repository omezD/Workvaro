package com.ems.leave.dto;

import com.ems.leave.entity.RequestStatus;

import java.time.LocalDate;

public record TeamCalendarEntryDto(
        Long requestId,
        String employeeUserId,
        String employeeName,
        String leaveTypeCode,
        LocalDate startDate,
        LocalDate endDate,
        int days,
        RequestStatus status) {
}
