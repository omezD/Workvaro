package com.ems.leave.dto;

import java.time.Instant;
import java.time.LocalDate;

public record AttendanceDto(
        Long id,
        LocalDate workDate,
        Instant checkIn,
        Instant checkOut,
        Long workedMinutes,
        boolean corrected) {
}
