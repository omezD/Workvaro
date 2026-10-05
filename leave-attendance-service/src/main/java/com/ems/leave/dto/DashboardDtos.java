package com.ems.leave.dto;

import java.util.List;

/** Response shapes for the role dashboards. */
public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record MyDashboard(
            List<LeaveBalanceDto> balances,
            AttendanceDto today,
            long myPendingLeaves,
            List<LeaveRequestDto> upcomingLeaves,
            List<HolidayDto> upcomingHolidays) {
    }

    public record ManagerDashboard(
            int teamSize,
            long pendingLeaveApprovals,
            long pendingCorrectionApprovals,
            long presentToday,
            long onLeaveToday,
            List<TodayAttendanceDto.Entry> onLeave) {
    }

    public record HrDashboard(
            int activeEmployees,
            long pendingLeaveApprovals,
            long pendingCorrectionApprovals,
            long presentToday,
            long onLeaveToday,
            long notCheckedInToday,
            List<HolidayDto> upcomingHolidays) {
    }
}
