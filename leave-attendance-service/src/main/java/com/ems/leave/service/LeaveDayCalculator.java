package com.ems.leave.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

/** Counts leave days: every date in the range except Saturdays, Sundays and holidays. */
public final class LeaveDayCalculator {

    private LeaveDayCalculator() {
    }

    public static int workingDays(LocalDate start, LocalDate end, Set<LocalDate> holidays) {
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("end before start");
        }
        int days = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            if (isWorkingDay(d, holidays)) {
                days++;
            }
        }
        return days;
    }

    public static boolean isWorkingDay(LocalDate date, Set<LocalDate> holidays) {
        DayOfWeek dow = date.getDayOfWeek();
        return dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY && !holidays.contains(date);
    }
}
