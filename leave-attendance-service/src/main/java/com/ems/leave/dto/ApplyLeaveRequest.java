package com.ems.leave.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ApplyLeaveRequest(
        @NotNull Long leaveTypeId,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @Size(max = 500) String reason) {

    @JsonIgnore
    @AssertTrue(message = "endDate must be on or after startDate")
    public boolean isValidRange() {
        return startDate == null || endDate == null || !endDate.isBefore(startDate);
    }
}
