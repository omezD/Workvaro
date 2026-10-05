package com.ems.leave.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class LeaveDayCalculatorTest {

    // 2026-10-05 is a Monday
    private static final LocalDate MON = LocalDate.of(2026, 10, 5);

    @Test
    void countsWeekdaysOnly() {
        assertThat(LeaveDayCalculator.workingDays(MON, MON.plusDays(6), Set.of())).isEqualTo(5);
    }

    @Test
    void skipsHolidays() {
        LocalDate wed = MON.plusDays(2);
        assertThat(LeaveDayCalculator.workingDays(MON, MON.plusDays(4), Set.of(wed))).isEqualTo(4);
    }

    @Test
    void weekendOnlyRangeIsZero() {
        LocalDate sat = MON.plusDays(5);
        assertThat(LeaveDayCalculator.workingDays(sat, sat.plusDays(1), Set.of())).isZero();
    }

    @Test
    void singleDay() {
        assertThat(LeaveDayCalculator.workingDays(MON, MON, Set.of())).isEqualTo(1);
    }
}
