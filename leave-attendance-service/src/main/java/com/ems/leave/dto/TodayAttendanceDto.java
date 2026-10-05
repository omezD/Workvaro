package com.ems.leave.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** "Who's in today" board for HR (everyone) or a manager (their team). */
public record TodayAttendanceDto(
        LocalDate date,
        boolean workingDay,
        long present,
        long onLeave,
        long notCheckedIn,
        List<Entry> employees) {

    public enum State { CHECKED_IN, CHECKED_OUT, ON_LEAVE, NOT_CHECKED_IN }

    public record Entry(
            String employeeUserId,
            Long employeeId,
            String employeeName,
            String departmentName,
            State state,
            Instant checkIn,
            Instant checkOut,
            String leaveTypeCode) {
    }
}
