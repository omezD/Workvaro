package com.ems.leave.dto;

/** {@code available = allocated - used - pending}; for unlimited types only {@code used} is meaningful. */
public record LeaveBalanceDto(
        Long leaveTypeId,
        String leaveTypeCode,
        String leaveTypeName,
        int year,
        int allocated,
        int used,
        int pending,
        int available,
        boolean unlimited) {
}
