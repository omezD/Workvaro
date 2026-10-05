package com.ems.leave.service;

import com.ems.common.exception.ApiException;
import com.ems.common.security.CurrentUser;
import com.ems.leave.client.EmployeeDirectory;
import com.ems.leave.client.EmployeeRef;
import com.ems.leave.dto.AttendanceDto;
import com.ems.leave.dto.CorrectionDto;
import com.ems.leave.dto.CorrectionRequest;
import com.ems.leave.dto.TodayAttendanceDto;
import com.ems.leave.dto.TodayAttendanceDto.Entry;
import com.ems.leave.dto.TodayAttendanceDto.State;
import com.ems.leave.entity.Attendance;
import com.ems.leave.entity.AttendanceCorrection;
import com.ems.leave.entity.LeaveRequest;
import com.ems.leave.entity.RequestStatus;
import com.ems.leave.mapper.LeaveMapper;
import com.ems.leave.repository.AttendanceCorrectionRepository;
import com.ems.leave.repository.AttendanceRepository;
import com.ems.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.ems.leave.repository.LeaveRequestSpecifications.ofUsers;
import static com.ems.leave.repository.LeaveRequestSpecifications.overlapping;
import static com.ems.leave.repository.LeaveRequestSpecifications.withStatus;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttendanceService {

    private static final String CORRECTION = "AttendanceCorrection";
    private static final int MAX_CORRECTION_AGE_DAYS = 31;

    private final AttendanceRepository attendanceRepository;
    private final AttendanceCorrectionRepository correctionRepository;
    private final LeaveRequestRepository leaveRepository;
    private final HolidayService holidayService;
    private final ApprovalPolicy policy;
    private final EmployeeDirectory directory;
    private final LeaveMapper mapper;
    private final AuditService audit;
    private final CurrentUser currentUser;
    private final Clock clock;

    // ---------- check-in / out ----------

    @Transactional
    public AttendanceDto checkIn() {
        EmployeeRef me = directory.me();
        LocalDate today = LocalDate.now(clock);
        if (attendanceRepository.findByEmployeeUserIdAndWorkDate(me.keycloakUserId(), today).isPresent()) {
            throw ApiException.conflict("You have already checked in today");
        }
        Attendance a = new Attendance();
        a.setEmployeeUserId(me.keycloakUserId());
        a.setEmployeeName(me.fullName());
        a.setWorkDate(today);
        a.setCheckIn(Instant.now(clock));
        return mapper.toDto(attendanceRepository.save(a));
    }

    @Transactional
    public AttendanceDto checkOut() {
        Attendance a = attendanceRepository.findByEmployeeUserIdAndWorkDate(currentUser.id(), LocalDate.now(clock))
                .orElseThrow(() -> ApiException.conflict("You have not checked in today"));
        if (a.getCheckOut() != null) {
            throw ApiException.conflict("You have already checked out today");
        }
        a.setCheckOut(Instant.now(clock));
        return mapper.toDto(a);
    }

    public AttendanceDto myToday() {
        return attendanceRepository.findByEmployeeUserIdAndWorkDate(currentUser.id(), LocalDate.now(clock))
                .map(mapper::toDto).orElse(null);
    }

    public List<AttendanceDto> myMonth(YearMonth month) {
        YearMonth m = month != null ? month : YearMonth.now(clock);
        return attendanceRepository.findByEmployeeUserIdAndWorkDateBetweenOrderByWorkDateAsc(
                currentUser.id(), m.atDay(1), m.atEndOfMonth()).stream().map(mapper::toDto).toList();
    }

    /** Who's in today: HR/Admin see everyone, a manager sees their team. */
    public TodayAttendanceDto today() {
        List<EmployeeRef> people;
        if (policy.hasOrgWideRead()) {
            people = directory.active();
        } else if (currentUser.isManager()) {
            people = directory.team(currentUser.id());
        } else {
            throw ApiException.forbidden("Only managers and HR can view today's attendance");
        }
        return board(people);
    }

    /** Builds the attendance board for a set of employees for today. */
    public TodayAttendanceDto board(List<EmployeeRef> people) {
        LocalDate today = LocalDate.now(clock);
        Set<String> ids = ApprovalPolicy.userIds(people);
        Map<String, Attendance> attendance = attendanceRepository.findByWorkDate(today).stream()
                .filter(a -> ids.contains(a.getEmployeeUserId()))
                .collect(Collectors.toMap(Attendance::getEmployeeUserId, Function.identity()));
        Map<String, LeaveRequest> leaves = ids.isEmpty() ? Map.of()
                : leaveRepository.findAll(Specification.allOf(withStatus(RequestStatus.APPROVED), ofUsers(ids),
                        overlapping(today, today))).stream()
                .collect(Collectors.toMap(LeaveRequest::getEmployeeUserId, Function.identity(), (x, y) -> x));

        List<Entry> entries = people.stream().map(p -> {
            Attendance a = attendance.get(p.keycloakUserId());
            LeaveRequest leave = leaves.get(p.keycloakUserId());
            State state = a != null ? (a.getCheckOut() == null ? State.CHECKED_IN : State.CHECKED_OUT)
                    : leave != null ? State.ON_LEAVE : State.NOT_CHECKED_IN;
            return new Entry(p.keycloakUserId(), p.id(), p.fullName(), p.departmentName(), state,
                    a == null ? null : a.getCheckIn(), a == null ? null : a.getCheckOut(),
                    leave == null ? null : leave.getLeaveType().getCode());
        }).toList();

        boolean workingDay = LeaveDayCalculator.isWorkingDay(today, holidayService.datesBetween(today, today));
        long present = entries.stream().filter(e -> e.state() == State.CHECKED_IN || e.state() == State.CHECKED_OUT).count();
        long onLeave = entries.stream().filter(e -> e.state() == State.ON_LEAVE).count();
        return new TodayAttendanceDto(today, workingDay, present, onLeave, entries.size() - present - onLeave, entries);
    }

    // ---------- corrections ----------

    @Transactional
    public CorrectionDto requestCorrection(CorrectionRequest req) {
        EmployeeRef me = directory.me();
        LocalDate today = LocalDate.now(clock);
        if (req.workDate().isAfter(today)) {
            throw ApiException.badRequest("Corrections can only be requested for past days or today");
        }
        if (req.workDate().isBefore(today.minusDays(MAX_CORRECTION_AGE_DAYS))) {
            throw ApiException.badRequest("Corrections older than " + MAX_CORRECTION_AGE_DAYS + " days are not allowed");
        }
        Instant checkIn = ZonedDateTime.of(req.workDate(), req.checkIn(), clock.getZone()).toInstant();
        Instant checkOut = ZonedDateTime.of(req.workDate(), req.checkOut(), clock.getZone()).toInstant();
        if (checkOut.isAfter(Instant.now(clock))) {
            throw ApiException.badRequest("Check-out time cannot be in the future");
        }
        if (correctionRepository.existsByEmployeeUserIdAndWorkDateAndStatus(me.keycloakUserId(), req.workDate(),
                RequestStatus.PENDING)) {
            throw ApiException.conflict("You already have a pending correction for " + req.workDate());
        }
        AttendanceCorrection c = new AttendanceCorrection();
        c.setEmployeeUserId(me.keycloakUserId());
        c.setEmployeeName(me.fullName());
        c.setWorkDate(req.workDate());
        c.setRequestedCheckIn(checkIn);
        c.setRequestedCheckOut(checkOut);
        c.setReason(req.reason().trim());
        c.setStatus(RequestStatus.PENDING);
        correctionRepository.save(c);
        audit.record("REQUEST", CORRECTION, c.getId(), req.workDate() + " " + req.checkIn() + "-" + req.checkOut());
        return mapper.toDto(c);
    }

    public List<CorrectionDto> myCorrections() {
        return correctionRepository.findByEmployeeUserIdOrderByWorkDateDesc(currentUser.id()).stream()
                .map(mapper::toDto).toList();
    }

    public List<CorrectionDto> pendingCorrections() {
        Set<String> visible = policy.visibleUserIdsOrAll();
        List<AttendanceCorrection> list;
        if (visible == null) {
            list = correctionRepository.findByStatusAndEmployeeUserIdNotOrderByCreatedAtAsc(RequestStatus.PENDING,
                    currentUser.id());
        } else if (visible.isEmpty()) {
            list = List.of();
        } else {
            list = correctionRepository.findByStatusAndEmployeeUserIdInOrderByCreatedAtAsc(RequestStatus.PENDING,
                    visible);
        }
        return list.stream().map(mapper::toDto).toList();
    }

    @Transactional
    public CorrectionDto approveCorrection(Long id, String comment) {
        AttendanceCorrection c = getPendingCorrection(id);
        policy.assertCanDecide(c.getEmployeeUserId());
        Attendance a = attendanceRepository.findByEmployeeUserIdAndWorkDate(c.getEmployeeUserId(), c.getWorkDate())
                .orElseGet(() -> {
                    Attendance created = new Attendance();
                    created.setEmployeeUserId(c.getEmployeeUserId());
                    created.setEmployeeName(c.getEmployeeName());
                    created.setWorkDate(c.getWorkDate());
                    return created;
                });
        a.setCheckIn(c.getRequestedCheckIn());
        a.setCheckOut(c.getRequestedCheckOut());
        a.setCorrected(true);
        attendanceRepository.save(a);
        decide(c, RequestStatus.APPROVED, comment);
        audit.record("APPROVE", CORRECTION, id, c.getEmployeeName() + " " + c.getWorkDate());
        return mapper.toDto(c);
    }

    @Transactional
    public CorrectionDto rejectCorrection(Long id, String comment) {
        AttendanceCorrection c = getPendingCorrection(id);
        policy.assertCanDecide(c.getEmployeeUserId());
        decide(c, RequestStatus.REJECTED, comment);
        audit.record("REJECT", CORRECTION, id, c.getEmployeeName() + " " + c.getWorkDate());
        return mapper.toDto(c);
    }

    private void decide(AttendanceCorrection c, RequestStatus status, String comment) {
        c.setStatus(status);
        c.setDecidedByUserId(currentUser.id());
        c.setDecidedByName(currentUser.fullName());
        c.setDecisionComment(comment);
        c.setDecidedAt(Instant.now(clock));
    }

    private AttendanceCorrection getPendingCorrection(Long id) {
        AttendanceCorrection c = correctionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Attendance correction", id));
        if (c.getStatus() != RequestStatus.PENDING) {
            throw ApiException.conflict("Correction is already " + c.getStatus());
        }
        return c;
    }
}
