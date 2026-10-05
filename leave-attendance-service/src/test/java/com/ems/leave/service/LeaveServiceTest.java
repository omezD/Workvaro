package com.ems.leave.service;

import com.ems.common.exception.ApiException;
import com.ems.common.security.CurrentUser;
import com.ems.leave.TestJwt;
import com.ems.leave.client.EmployeeDirectory;
import com.ems.leave.client.EmployeeRef;
import com.ems.leave.dto.ApplyLeaveRequest;
import com.ems.leave.dto.LeaveRequestDto;
import com.ems.leave.entity.LeaveBalance;
import com.ems.leave.entity.LeaveRequest;
import com.ems.leave.entity.LeaveType;
import com.ems.leave.entity.RequestStatus;
import com.ems.leave.mapper.LeaveMapperImpl;
import com.ems.leave.repository.LeaveRequestRepository;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import java.util.Set;

import static com.ems.leave.TestJwt.EMPLOYEE_ID;
import static com.ems.leave.TestJwt.HR_ID;
import static com.ems.leave.TestJwt.MANAGER_ID;
import static com.ems.leave.TestJwt.login;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeaveServiceTest {

    /** Monday 2026-10-05, 10:00 in Asia/Kolkata. */
    static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-05T04:30:00Z"), ZoneId.of("Asia/Kolkata"));
    static final EmployeeRef ME = new EmployeeRef(4L, EMPLOYEE_ID, "EMP0004", "Esha Patel", "employee@ems.local",
            3L, "Engineering", 3L, MANAGER_ID, "ACTIVE");

    @Mock
    LeaveRequestRepository repository;
    @Mock
    LeaveTypeService leaveTypeService;
    @Mock
    LeaveBalanceService balanceService;
    @Mock
    HolidayService holidayService;
    @Mock
    ApprovalPolicy policy;
    @Mock
    EmployeeDirectory directory;
    @Mock
    AuditService audit;

    LeaveService service;
    LeaveType casual;
    LeaveType unpaid;

    @BeforeEach
    void setUp() {
        service = new LeaveService(repository, leaveTypeService, balanceService, holidayService, policy, directory,
                new LeaveMapperImpl(), audit, new CurrentUser(), CLOCK);
        casual = type(1L, "CL", 12, false);
        unpaid = type(4L, "UL", 0, true);
        login(EMPLOYEE_ID, "EMPLOYEE");
    }

    @AfterEach
    void tearDown() {
        TestJwt.logout();
    }

    // ---------- apply ----------

    @Test
    void applyExcludesWeekendsAndHolidaysAndCreatesPendingRequest() {
        LocalDate mon = LocalDate.of(2026, 10, 19);
        LocalDate fri = LocalDate.of(2026, 10, 23);
        givenApplicant();
        when(holidayService.datesBetween(mon, fri)).thenReturn(Set.of(LocalDate.of(2026, 10, 20)));
        when(balanceService.balanceFor(EMPLOYEE_ID, casual, 2026)).thenReturn(balance(casual, 12, 0));
        when(repository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequestDto dto = service.apply(new ApplyLeaveRequest(1L, mon, fri, "Family function"));

        assertThat(dto.days()).isEqualTo(4);
        assertThat(dto.status()).isEqualTo(RequestStatus.PENDING);
        assertThat(dto.employeeUserId()).isEqualTo(EMPLOYEE_ID);
        assertThat(dto.employeeName()).isEqualTo("Esha Patel");
        verify(audit).record(eq("APPLY"), eq("LeaveRequest"), any(), anyString());
    }

    @Test
    void applyRejectsRangeWithNoWorkingDays() {
        LocalDate sat = LocalDate.of(2026, 10, 10);
        givenApplicant();

        assertApiError(() -> service.apply(new ApplyLeaveRequest(1L, sat, sat.plusDays(1), null)),
                HttpStatus.BAD_REQUEST);
        verify(repository, never()).save(any());
    }

    @Test
    void applyRejectsOverlapWithPendingOrApprovedLeave() {
        LocalDate day = LocalDate.of(2026, 10, 14);
        givenApplicant();
        when(repository.existsOverlapping(eq(EMPLOYEE_ID), eq(day), eq(day), any())).thenReturn(true);

        assertApiError(() -> service.apply(new ApplyLeaveRequest(1L, day, day, null)), HttpStatus.CONFLICT);
        verify(repository, never()).save(any());
    }

    @Test
    void applyRejectsWhenBalanceIsInsufficientCountingPendingDays() {
        LocalDate mon = LocalDate.of(2026, 10, 12);
        givenApplicant();
        when(balanceService.balanceFor(EMPLOYEE_ID, casual, 2026)).thenReturn(balance(casual, 12, 10));
        when(balanceService.pendingDays(EMPLOYEE_ID, 1L, 2026)).thenReturn(1);

        // 12 allocated - 10 used - 1 pending = 1 available, 2 requested
        assertApiError(() -> service.apply(new ApplyLeaveRequest(1L, mon, mon.plusDays(1), null)),
                HttpStatus.BAD_REQUEST);
        verify(repository, never()).save(any());
    }

    @Test
    void unpaidLeaveSkipsTheBalanceCheck() {
        LocalDate mon = LocalDate.of(2026, 10, 12);
        when(directory.me()).thenReturn(ME);
        when(leaveTypeService.get(4L)).thenReturn(unpaid);
        when(repository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequestDto dto = service.apply(new ApplyLeaveRequest(4L, mon, mon.plusDays(4), null));

        assertThat(dto.days()).isEqualTo(5);
        verify(balanceService, never()).balanceFor(anyString(), any(), anyInt());
    }

    @Test
    void applyRejectsRangeSpanningTwoYears() {
        givenApplicant();
        assertApiError(() -> service.apply(new ApplyLeaveRequest(1L, LocalDate.of(2026, 12, 31),
                LocalDate.of(2027, 1, 1), null)), HttpStatus.BAD_REQUEST);
    }

    @Test
    void applyRejectsBackdatingBeyond30Days() {
        givenApplicant();
        LocalDate longAgo = LocalDate.of(2026, 9, 1);
        assertApiError(() -> service.apply(new ApplyLeaveRequest(1L, longAgo, longAgo, null)),
                HttpStatus.BAD_REQUEST);
    }

    @Test
    void applyRejectsInactiveLeaveType() {
        casual.setActive(false);
        givenApplicant();
        LocalDate day = LocalDate.of(2026, 10, 14);
        assertApiError(() -> service.apply(new ApplyLeaveRequest(1L, day, day, null)), HttpStatus.BAD_REQUEST);
    }

    // ---------- approve / reject ----------

    @Test
    void approveDeductsBalanceAndRecordsDecision() {
        login(MANAGER_ID, "MANAGER", "EMPLOYEE");
        LeaveRequest r = pendingRequest(10L, casual, 2);
        LeaveBalance balance = balance(casual, 12, 3);
        when(repository.findById(10L)).thenReturn(Optional.of(r));
        when(balanceService.balanceFor(EMPLOYEE_ID, casual, 2026)).thenReturn(balance);

        LeaveRequestDto dto = service.approve(10L, "Enjoy");

        assertThat(dto.status()).isEqualTo(RequestStatus.APPROVED);
        assertThat(balance.getUsed()).isEqualTo(5);
        assertThat(r.getDecidedByUserId()).isEqualTo(MANAGER_ID);
        assertThat(r.getDecisionComment()).isEqualTo("Enjoy");
        verify(policy).assertCanDecide(EMPLOYEE_ID);
    }

    @Test
    void approveIsForbiddenWhenPolicySaysNoAndNothingChanges() {
        login(MANAGER_ID, "MANAGER", "EMPLOYEE");
        LeaveRequest r = pendingRequest(10L, casual, 2);
        when(repository.findById(10L)).thenReturn(Optional.of(r));
        doThrow(ApiException.forbidden("not your team")).when(policy).assertCanDecide(EMPLOYEE_ID);

        assertApiError(() -> service.approve(10L, null), HttpStatus.FORBIDDEN);
        assertThat(r.getStatus()).isEqualTo(RequestStatus.PENDING);
        verify(balanceService, never()).balanceFor(anyString(), any(), anyInt());
    }

    @Test
    void approveOfAlreadyDecidedRequestIs409() {
        login(HR_ID, "HR", "EMPLOYEE");
        LeaveRequest r = pendingRequest(10L, casual, 2);
        r.setStatus(RequestStatus.APPROVED);
        when(repository.findById(10L)).thenReturn(Optional.of(r));

        assertApiError(() -> service.approve(10L, null), HttpStatus.CONFLICT);
        verify(policy, never()).assertCanDecide(anyString());
    }

    @Test
    void approveFailsWhenBalanceWasUsedUpMeanwhile() {
        login(HR_ID, "HR", "EMPLOYEE");
        LeaveRequest r = pendingRequest(10L, casual, 3);
        LeaveBalance balance = balance(casual, 12, 11);
        when(repository.findById(10L)).thenReturn(Optional.of(r));
        when(balanceService.balanceFor(EMPLOYEE_ID, casual, 2026)).thenReturn(balance);

        assertApiError(() -> service.approve(10L, null), HttpStatus.CONFLICT);
        assertThat(balance.getUsed()).isEqualTo(11);
        assertThat(r.getStatus()).isEqualTo(RequestStatus.PENDING);
    }

    @Test
    void rejectDoesNotTouchTheBalance() {
        login(MANAGER_ID, "MANAGER", "EMPLOYEE");
        LeaveRequest r = pendingRequest(10L, casual, 2);
        when(repository.findById(10L)).thenReturn(Optional.of(r));

        LeaveRequestDto dto = service.reject(10L, "Release week");

        assertThat(dto.status()).isEqualTo(RequestStatus.REJECTED);
        verify(balanceService, never()).balanceFor(anyString(), any(), anyInt());
    }

    // ---------- cancel ----------

    @Test
    void applicantCanCancelPendingRequest() {
        LeaveRequest r = pendingRequest(10L, casual, 2);
        when(repository.findById(10L)).thenReturn(Optional.of(r));

        assertThat(service.cancel(10L).status()).isEqualTo(RequestStatus.CANCELLED);
    }

    @Test
    void nobodyElseCanCancelARequest() {
        login(MANAGER_ID, "MANAGER", "EMPLOYEE");
        when(repository.findById(10L)).thenReturn(Optional.of(pendingRequest(10L, casual, 2)));

        assertApiError(() -> service.cancel(10L), HttpStatus.FORBIDDEN);
    }

    @Test
    void approvedRequestCannotBeCancelled() {
        LeaveRequest r = pendingRequest(10L, casual, 2);
        r.setStatus(RequestStatus.APPROVED);
        when(repository.findById(10L)).thenReturn(Optional.of(r));

        assertApiError(() -> service.cancel(10L), HttpStatus.CONFLICT);
    }

    // ---------- helpers ----------

    private void givenApplicant() {
        when(directory.me()).thenReturn(ME);
        when(leaveTypeService.get(1L)).thenReturn(casual);
    }

    static LeaveType type(Long id, String code, int quota, boolean unlimited) {
        LeaveType t = new LeaveType();
        ReflectionTestUtils.setField(t, "id", id);
        t.setCode(code);
        t.setName(code + " leave");
        t.setAnnualQuota(quota);
        t.setUnlimited(unlimited);
        t.setActive(true);
        return t;
    }

    static LeaveBalance balance(LeaveType type, int allocated, int used) {
        LeaveBalance b = new LeaveBalance();
        b.setEmployeeUserId(EMPLOYEE_ID);
        b.setLeaveType(type);
        b.setYear(2026);
        b.setAllocated(allocated);
        b.setUsed(used);
        return b;
    }

    static LeaveRequest pendingRequest(Long id, LeaveType type, int days) {
        LeaveRequest r = new LeaveRequest();
        ReflectionTestUtils.setField(r, "id", id);
        r.setEmployeeUserId(EMPLOYEE_ID);
        r.setEmployeeId(4L);
        r.setEmployeeName("Esha Patel");
        r.setLeaveType(type);
        r.setStartDate(LocalDate.of(2026, 10, 12));
        r.setEndDate(LocalDate.of(2026, 10, 12).plusDays(days - 1));
        r.setDays(days);
        r.setStatus(RequestStatus.PENDING);
        return r;
    }

    static void assertApiError(ThrowingCallable call, HttpStatus status) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getStatus()).isEqualTo(status));
    }
}
