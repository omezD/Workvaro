package com.ems.leave.service;

import com.ems.common.security.CurrentUser;
import com.ems.leave.client.EmployeeDirectory;
import com.ems.leave.client.EmployeeRef;
import com.ems.leave.dto.DashboardDtos.HrDashboard;
import com.ems.leave.dto.DashboardDtos.ManagerDashboard;
import com.ems.leave.dto.DashboardDtos.MyDashboard;
import com.ems.leave.dto.HolidayDto;
import com.ems.leave.dto.LeaveRequestDto;
import com.ems.leave.dto.TodayAttendanceDto;
import com.ems.leave.dto.TodayAttendanceDto.State;
import com.ems.leave.entity.LeaveRequest;
import com.ems.leave.entity.RequestStatus;
import com.ems.leave.mapper.LeaveMapper;
import com.ems.leave.repository.AttendanceCorrectionRepository;
import com.ems.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import static com.ems.leave.repository.LeaveRequestSpecifications.ofUser;
import static com.ems.leave.repository.LeaveRequestSpecifications.overlapping;
import static com.ems.leave.repository.LeaveRequestSpecifications.withStatusIn;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final int UPCOMING_LIMIT = 5;
    private static final int HOLIDAY_LOOKAHEAD_DAYS = 90;

    private final LeaveService leaveService;
    private final AttendanceService attendanceService;
    private final HolidayService holidayService;
    private final LeaveRequestRepository leaveRepository;
    private final AttendanceCorrectionRepository correctionRepository;
    private final EmployeeDirectory directory;
    private final LeaveMapper mapper;
    private final CurrentUser currentUser;
    private final Clock clock;

    @Transactional
    public MyDashboard me() {
        LocalDate today = LocalDate.now(clock);
        Specification<LeaveRequest> upcoming = Specification.allOf(ofUser(currentUser.id()),
                withStatusIn(EnumSet.of(RequestStatus.PENDING, RequestStatus.APPROVED)), overlapping(today, null));
        List<LeaveRequestDto> upcomingLeaves = leaveRepository.findAll(upcoming,
                        PageRequest.of(0, UPCOMING_LIMIT, Sort.by("startDate")))
                .map(mapper::toDto).getContent();
        return new MyDashboard(
                leaveService.myBalances(today.getYear()),
                attendanceService.myToday(),
                leaveRepository.countByEmployeeUserIdAndStatus(currentUser.id(), RequestStatus.PENDING),
                upcomingLeaves,
                upcomingHolidays(today));
    }

    public ManagerDashboard manager() {
        List<EmployeeRef> team = directory.team(currentUser.id());
        Set<String> ids = ApprovalPolicy.userIds(team);
        TodayAttendanceDto board = attendanceService.board(team);
        return new ManagerDashboard(
                team.size(),
                ids.isEmpty() ? 0 : leaveRepository.countByEmployeeUserIdInAndStatus(ids, RequestStatus.PENDING),
                ids.isEmpty() ? 0 : correctionRepository.countByEmployeeUserIdInAndStatus(ids, RequestStatus.PENDING),
                board.present(),
                board.onLeave(),
                board.employees().stream().filter(e -> e.state() == State.ON_LEAVE).toList());
    }

    public HrDashboard hr() {
        List<EmployeeRef> everyone = directory.active();
        TodayAttendanceDto board = attendanceService.board(everyone);
        return new HrDashboard(
                everyone.size(),
                leaveRepository.countByStatus(RequestStatus.PENDING),
                correctionRepository.countByStatus(RequestStatus.PENDING),
                board.present(),
                board.onLeave(),
                board.notCheckedIn(),
                upcomingHolidays(LocalDate.now(clock)));
    }

    private List<HolidayDto> upcomingHolidays(LocalDate today) {
        return holidayService.between(today, today.plusDays(HOLIDAY_LOOKAHEAD_DAYS)).stream()
                .limit(UPCOMING_LIMIT).toList();
    }
}
