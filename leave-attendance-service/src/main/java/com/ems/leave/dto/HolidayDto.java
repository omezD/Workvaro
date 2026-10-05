package com.ems.leave.dto;

import java.time.LocalDate;

public record HolidayDto(Long id, LocalDate date, String name) {
}
