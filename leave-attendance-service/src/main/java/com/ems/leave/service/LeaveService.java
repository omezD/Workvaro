package com.ems.leave.service;

import com.ems.common.dto.PageResponse;
import com.ems.common.exception.ApiException;
import com.ems.common.security.CurrentUser;
import com.ems.leave.client.EmployeeDirectory;
import com.ems.leave.client.EmployeeRef;
import com.ems.leave.dto.ApplyLeaveRequest;
import com.ems.leave.dto.LeaveBalanceDto;
import com.ems.leave.dto.LeaveRequestDto;
import com.ems.leave.dto.TeamCalendarEntryDto;
import com.ems.leave.entity.LeaveBalance;
import com.ems.leave.entity.LeaveRequest;
import com.ems.leave.entity.LeaveType;
import com.ems.leave.entity.RequestStatus;
import com.ems.leave.mapper.LeaveMapper;
import com.ems.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static com.ems.leave.repository.LeaveRequestSpecifications.notOfUser;
import static com.ems.leave.repository.LeaveRequestSpecifications.ofUser;
import static com.ems.leave.repository.LeaveRequestSpecifications.ofUsers;
import static com.ems.leave.repository.LeaveRequestSpecifications.overlapping;
import static com.ems.leave.repository.LeaveRequestSpecifications.withStatus;
import static com.ems.leave.repository.LeaveRequestSpecifications.withStatusIn;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaveService {

    private static final String ENTITY = "LeaveRequest";
    /** How far back an employee may apply (e.g. sick leave reported after the fact). */
    private static final int MAX_BACKDATE_DAYS = 30;
    private static final Set<RequestStatus> ACTIVE_STATUSES = EnumSet.of(RequestStatus.PENDING, RequestStatus.APPROVED);

    private final LeaveRequestRepository repository;
    private final LeaveTypeService leaveTypeService;
    private final LeaveBalanceService balanceService;
    private final HolidayService holidayService;
    private final ApprovalPolicy policy;
    private final EmployeeDirectory directory;
    private final LeaveMapper mapper;
    private final AuditService audit;
    private final CurrentUser currentUser;
    private final Clock clock;

    // ---------- employee ----------

    @Transactional
    public List<LeaveBalanceDto> myBalances(Integer year) {
        return balanceService.balancesFor(currentUser.id(), year != null ? year : LocalDate.now(clock).getYear());
    }

    @Transactional
    public LeaveRequestDto apply(ApplyLeaveRequest req) {
        EmployeeRef me = directory.me();
        LeaveType type = leaveTypeService.get(req.leaveTypeId());
        if (!type.isActive()) {
            throw ApiException.badRequest("This leave type is no longer available");
        }
        LocalDate start = req.startDate();
        LocalDate end = req.endDate();
        if (start.getYear() != end.getYear()) {
            throw ApiException.badRequest("A leave request cannot span two calendar years; split it into two requests");
        }
        if (start.isBefore(LocalDate.now(clock).minusDays(MAX_BACKDATE_DAYS))) {
            throw ApiException.badRequest("Leave can be back-dated by at most " + MAX_BACKDATE_DAYS + " days");
        }
        int days = LeaveDayCalculator.workingDays(start, end, holidayService.datesBetween(start, end));
        if (days == 0) {
            throw ApiException.badRequest("The selected dates contain no working days");
        }
        if (repository.existsOverlapping(me.keycloakUserId(), start, end, ACTIVE_STATUSES)) {
            throw ApiException.conflict("You already have a pending or approved leave overlapping these dates");
        }
        if (!type.isUnlimited()) {
            LeaveBalance balance = balanceService.balanceFor(me.keycloakUserId(), type, start.getYear());
            int pending = balanceService.pendingDays(me.keycloakUserId(), type.getId(), start.getYear());
            int available = balance.getAllocated() - balance.getUsed() - pending;
            if (days > available) {
                throw ApiException.badRequest("Insufficient " + type.getName() + " balance: requested " + days
                        + " day(s), available " + Math.max(available, 0));
            }
        }
        LeaveRequest r = new LeaveRequest();
        r.setEmployeeUserId(me.keycloakUserId());
        r.setEmployeeId(me.id());
        r.setEmployeeName(me.fullName());
        r.setLeaveType(type);
        r.setStartDate(start);
        r.setEndDate(end);
        r.setDays(days);
        r.setReason(req.reason());
        r.setStatus(RequestStatus.PENDING);
        repository.save(r);
        audit.record("APPLY", ENTITY, r.getId(), type.getCode() + " " + start + ".." + end + " (" + days + "d)");
        return mapper.toDto(r);
    }

    public List<LeaveRequestDto> myLeaves(RequestStatus status) {
        Specification<LeaveRequest> spec = Specification.allOf(ofUser(currentUser.id()), withStatus(status));
        return repository.findAll(spec, Sort.by(Sort.Direction.DESC, "startDate")).stream()
                .map(mapper::toDto).toList();
    }

    @Transactional
    public LeaveRequestDto cancel(Long id) {
        LeaveRequest r = get(id);
        if (!r.getEmployeeUserId().equals(currentUser.id())) {
            throw ApiException.forbidden("You can only cancel your own leave requests");
        }
        if (r.getStatus() != RequestStatus.PENDING) {
            throw ApiException.conflict("Only pending requests can be cancelled (current status: " + r.getStatus() + ")");
        }
        r.setStatus(RequestStatus.CANCELLED);
        audit.record("CANCEL", ENTITY, id, null);
        return mapper.toDto(r);
    }

    // ---------- manager / HR ----------

    /** Pending requests the caller can act on: HR sees everyone's, a manager their direct reports'. */
    public List<LeaveRequestDto> pending() {
        Specification<LeaveRequest> spec = Specification.allOf(
                withStatus(RequestStatus.PENDING),
                ofUsers(policy.visibleUserIdsOrAll()),
                notOfUser(currentUser.id()));
        return repository.findAll(spec, Sort.by("startDate")).stream().map(mapper::toDto).toList();
    }

    @Transactional
    public LeaveRequestDto approve(Long id, String comment) {
        LeaveRequest r = getPending(id);
        policy.assertCanDecide(r.getEmployeeUserId());
        LeaveType type = r.getLeaveType();
        if (!type.isUnlimited()) {
            LeaveBalance balance = balanceService.balanceFor(r.getEmployeeUserId(), type, r.getStartDate().getYear());
            if (balance.getUsed() + r.getDays() > balance.getAllocated()) {
                throw ApiException.conflict("Insufficient balance to approve: " + (balance.getAllocated()
                        - balance.getUsed()) + " day(s) left");
            }
            balance.setUsed(balance.getUsed() + r.getDays());
        }
        decide(r, RequestStatus.APPROVED, comment);
        audit.record("APPROVE", ENTITY, id, r.getEmployeeName() + " " + r.getDays() + "d " + type.getCode());
        return mapper.toDto(r);
    }

    @Transactional
    public LeaveRequestDto reject(Long id, String comment) {
        LeaveRequest r = getPending(id);
        policy.assertCanDecide(r.getEmployeeUserId());
        decide(r, RequestStatus.REJECTED, comment);
        audit.record("REJECT", ENTITY, id, r.getEmployeeName() + (comment == null ? "" : ": " + comment));
        return mapper.toDto(r);
    }

    /** All requests (HR/Admin) or the team's (manager), filtered and paged. */
    public PageResponse<LeaveRequestDto> search(RequestStatus status, LocalDate from, LocalDate to, Pageable pageable) {
        if (from != null && to != null && to.isBefore(from)) {
            throw ApiException.badRequest("'to' must be on or after 'from'");
        }
        Specification<LeaveRequest> spec = Specification.allOf(
                ofUsers(policy.visibleUserIdsOrAll()), withStatus(status), overlapping(from, to));
        return PageResponse.from(repository.findAll(spec, pageable), mapper::toDto);
    }

    /** Pending and approved leave overlapping the month, for HR (everyone) or a manager (team + self). */
    public List<TeamCalendarEntryDto> teamCalendar(YearMonth month) {
        YearMonth m = month != null ? month : YearMonth.now(clock);
        Set<String> users = policy.visibleUserIdsOrAll();
        if (users != null) {
            users = new HashSet<>(users);
            users.add(currentUser.id());
        }
        Specification<LeaveRequest> spec = Specification.allOf(
                withStatusIn(ACTIVE_STATUSES), ofUsers(users), overlapping(m.atDay(1), m.atEndOfMonth()));
        return repository.findAll(spec, Sort.by("startDate", "employeeName")).stream()
                .map(mapper::toCalendarEntry).toList();
    }

    // ---------- helpers ----------

    private void decide(LeaveRequest r, RequestStatus status, String comment) {
        r.setStatus(status);
        r.setDecidedByUserId(currentUser.id());
        r.setDecidedByName(currentUser.fullName());
        r.setDecisionComment(comment);
        r.setDecidedAt(Instant.now(clock));
    }

    private LeaveRequest getPending(Long id) {
        LeaveRequest r = get(id);
        if (r.getStatus() != RequestStatus.PENDING) {
            throw ApiException.conflict("Request is already " + r.getStatus());
        }
        return r;
    }

    private LeaveRequest get(Long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Leave request", id));
    }
}
