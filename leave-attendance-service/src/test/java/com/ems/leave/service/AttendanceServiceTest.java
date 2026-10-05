package com.ems.leave.service;

import com.ems.common.security.CurrentUser;
import com.ems.leave.TestJwt;
import com.ems.leave.client.EmployeeDirectory;
import com.ems.leave.client.EmployeeRef;
import com.ems.leave.dto.AttendanceDto;
import com.ems.leave.dto.CorrectionRequest;
import com.ems.leave.dto.TodayAttendanceDto;
import com.ems.leave.dto.TodayAttendanceDto.State;
import com.ems.leave.entity.Attendance;
import com.ems.leave.entity.AttendanceCorrection;
import com.ems.leave.entity.LeaveRequest;
import com.ems.leave.entity.RequestStatus;
import com.ems.leave.mapper.LeaveMapperImpl;
import com.ems.leave.repository.AttendanceCorrectionRepository;
import com.ems.leave.repository.AttendanceRepository;
import com.ems.leave.repository.LeaveRequestRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static com.ems.leave.TestJwt.EMPLOYEE_ID;
import static com.ems.leave.TestJwt.HR_ID;
import static com.ems.leave.TestJwt.MANAGER_ID;
import static com.ems.leave.TestJwt.login;
import static com.ems.leave.service.LeaveServiceTest.ME;
import static com.ems.leave.service.LeaveServiceTest.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    static final LocalDate TODAY = LocalDate.of(2026, 10, 5);

    @Mock
    AttendanceRepository attendanceRepository;
    @Mock
    AttendanceCorrectionRepository correctionRepository;
    @Mock
    LeaveRequestRepository leaveRepository;
    @Mock
    HolidayService holidayService;
    @Mock
    ApprovalPolicy policy;
    @Mock
    EmployeeDirectory directory;
    @Mock
    AuditService audit;

    @AfterEach
    void tearDown() {
        TestJwt.logout();
    }

    private AttendanceService service(Instant now) {
        return new AttendanceService(attendanceRepository, correctionRepository, leaveRepository, holidayService,
                policy, directory, new LeaveMapperImpl(), audit, new CurrentUser(), Clock.fixed(now, IST));
    }

    @Test
    void checkInUsesTheBusinessTimeZoneDate() {
        login(EMPLOYEE_ID, "EMPLOYEE");
        // 20:00 UTC on Oct 4 is already 01:30 on Oct 5 in India
        AttendanceService service = service(Instant.parse("2026-10-04T20:00:00Z"));
        when(directory.me()).thenReturn(ME);
        when(attendanceRepository.findByEmployeeUserIdAndWorkDate(EMPLOYEE_ID, TODAY)).thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> inv.getArgument(0));

        AttendanceDto dto = service.checkIn();

        assertThat(dto.workDate()).isEqualTo(TODAY);
        assertThat(dto.checkOut()).isNull();
    }

    @Test
    void secondCheckInTheSameDayIs409() {
        login(EMPLOYEE_ID, "EMPLOYEE");
        AttendanceService service = service(Instant.parse("2026-10-05T04:30:00Z"));
        when(directory.me()).thenReturn(ME);
        when(attendanceRepository.findByEmployeeUserIdAndWorkDate(EMPLOYEE_ID, TODAY))
                .thenReturn(Optional.of(attendance(EMPLOYEE_ID, Instant.parse("2026-10-05T03:30:00Z"), null)));

        assertApiError(service::checkIn, HttpStatus.CONFLICT);
        verify(attendanceRepository, never()).save(any());
    }

    @Test
    void checkOutWithoutCheckInIs409() {
        login(EMPLOYEE_ID, "EMPLOYEE");
        AttendanceService service = service(Instant.parse("2026-10-05T12:30:00Z"));
        when(attendanceRepository.findByEmployeeUserIdAndWorkDate(EMPLOYEE_ID, TODAY)).thenReturn(Optional.empty());

        assertApiError(service::checkOut, HttpStatus.CONFLICT);
    }

    @Test
    void checkOutTwiceIs409() {
        login(EMPLOYEE_ID, "EMPLOYEE");
        AttendanceService service = service(Instant.parse("2026-10-05T13:30:00Z"));
        when(attendanceRepository.findByEmployeeUserIdAndWorkDate(EMPLOYEE_ID, TODAY)).thenReturn(Optional.of(
                attendance(EMPLOYEE_ID, Instant.parse("2026-10-05T03:30:00Z"), Instant.parse("2026-10-05T12:30:00Z"))));

        assertApiError(service::checkOut, HttpStatus.CONFLICT);
    }

    @Test
    void checkOutRecordsWorkedMinutes() {
        login(EMPLOYEE_ID, "EMPLOYEE");
        AttendanceService service = service(Instant.parse("2026-10-05T12:30:00Z"));
        when(attendanceRepository.findByEmployeeUserIdAndWorkDate(EMPLOYEE_ID, TODAY))
                .thenReturn(Optional.of(attendance(EMPLOYEE_ID, Instant.parse("2026-10-05T03:30:00Z"), null)));

        assertThat(service.checkOut().workedMinutes()).isEqualTo(540);
    }

    @Test
    void correctionCannotEndInTheFuture() {
        login(EMPLOYEE_ID, "EMPLOYEE");
        AttendanceService service = service(Instant.parse("2026-10-05T04:30:00Z")); // 10:00 IST
        when(directory.me()).thenReturn(ME);

        assertApiError(() -> service.requestCorrection(new CorrectionRequest(TODAY, LocalTime.of(9, 0),
                LocalTime.of(18, 0), "Forgot to check in")), HttpStatus.BAD_REQUEST);
    }

    @Test
    void duplicatePendingCorrectionForSameDayIs409() {
        login(EMPLOYEE_ID, "EMPLOYEE");
        AttendanceService service = service(Instant.parse("2026-10-05T04:30:00Z"));
        LocalDate friday = LocalDate.of(2026, 10, 2);
        when(directory.me()).thenReturn(ME);
        when(correctionRepository.existsByEmployeeUserIdAndWorkDateAndStatus(EMPLOYEE_ID, friday,
                RequestStatus.PENDING)).thenReturn(true);

        assertApiError(() -> service.requestCorrection(new CorrectionRequest(friday, LocalTime.of(9, 0),
                LocalTime.of(18, 0), "Forgot")), HttpStatus.CONFLICT);
    }

    @Test
    void approvedCorrectionCreatesTheMissingAttendanceDay() {
        login(MANAGER_ID, "MANAGER", "EMPLOYEE");
        AttendanceService service = service(Instant.parse("2026-10-05T04:30:00Z"));
        AttendanceCorrection c = new AttendanceCorrection();
        ReflectionTestUtils.setField(c, "id", 7L);
        c.setEmployeeUserId(EMPLOYEE_ID);
        c.setEmployeeName("Esha Patel");
        c.setWorkDate(LocalDate.of(2026, 10, 2));
        c.setRequestedCheckIn(Instant.parse("2026-10-02T03:30:00Z"));
        c.setRequestedCheckOut(Instant.parse("2026-10-02T12:30:00Z"));
        c.setReason("Forgot");
        c.setStatus(RequestStatus.PENDING);
        when(correctionRepository.findById(7L)).thenReturn(Optional.of(c));
        when(attendanceRepository.findByEmployeeUserIdAndWorkDate(EMPLOYEE_ID, c.getWorkDate()))
                .thenReturn(Optional.empty());

        service.approveCorrection(7L, null);

        verify(policy).assertCanDecide(EMPLOYEE_ID);
        ArgumentCaptor<Attendance> saved = ArgumentCaptor.forClass(Attendance.class);
        verify(attendanceRepository).save(saved.capture());
        assertThat(saved.getValue().getCheckIn()).isEqualTo(c.getRequestedCheckIn());
        assertThat(saved.getValue().getCheckOut()).isEqualTo(c.getRequestedCheckOut());
        assertThat(saved.getValue().isCorrected()).isTrue();
        assertThat(c.getStatus()).isEqualTo(RequestStatus.APPROVED);
    }

    @Test
    @SuppressWarnings("unchecked")
    void boardShowsPresentOnLeaveAndMissing() {
        login(HR_ID, "HR");
        AttendanceService service = service(Instant.parse("2026-10-05T06:30:00Z"));
        EmployeeRef esha = ME;
        EmployeeRef manoj = new EmployeeRef(3L, MANAGER_ID, "EMP0003", "Manoj Kumar", "m@ems.local", 3L, "Eng",
                null, null, "ACTIVE");
        EmployeeRef harini = new EmployeeRef(2L, HR_ID, "EMP0002", "Harini Rao", "h@ems.local", 2L, "HR",
                null, null, "ACTIVE");
        when(attendanceRepository.findByWorkDate(TODAY))
                .thenReturn(List.of(attendance(EMPLOYEE_ID, Instant.parse("2026-10-05T03:30:00Z"), null)));
        LeaveRequest managerLeave = LeaveServiceTest.pendingRequest(11L, LeaveServiceTest.type(1L, "CL", 12, false), 1);
        managerLeave.setEmployeeUserId(MANAGER_ID);
        managerLeave.setStatus(RequestStatus.APPROVED);
        when(leaveRepository.findAll(any(Specification.class))).thenReturn(List.of(managerLeave));
        when(holidayService.datesBetween(TODAY, TODAY)).thenReturn(Set.of());

        TodayAttendanceDto board = service.board(List.of(esha, manoj, harini));

        assertThat(board.workingDay()).isTrue();
        assertThat(board.present()).isEqualTo(1);
        assertThat(board.onLeave()).isEqualTo(1);
        assertThat(board.notCheckedIn()).isEqualTo(1);
        assertThat(board.employees()).extracting(TodayAttendanceDto.Entry::state)
                .containsExactly(State.CHECKED_IN, State.ON_LEAVE, State.NOT_CHECKED_IN);
    }

    private static Attendance attendance(String userId, Instant in, Instant out) {
        Attendance a = new Attendance();
        a.setEmployeeUserId(userId);
        a.setEmployeeName("Someone");
        a.setWorkDate(TODAY);
        a.setCheckIn(in);
        a.setCheckOut(out);
        return a;
    }
}
