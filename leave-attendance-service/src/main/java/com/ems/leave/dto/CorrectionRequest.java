package com.ems.leave.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/** Times are wall-clock times in the business time zone (ems.zone-id). */
public record CorrectionRequest(
        @NotNull @PastOrPresent LocalDate workDate,
        @NotNull LocalTime checkIn,
        @NotNull LocalTime checkOut,
        @NotBlank @Size(max = 500) String reason) {

    @JsonIgnore
    @AssertTrue(message = "checkOut must be after checkIn")
    public boolean isValidRange() {
        return checkIn == null || checkOut == null || checkOut.isAfter(checkIn);
    }
}
