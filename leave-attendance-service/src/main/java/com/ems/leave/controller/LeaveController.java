package com.ems.leave.controller;

import com.ems.common.dto.PageResponse;
import com.ems.common.security.Roles;
import com.ems.leave.dto.ApplyLeaveRequest;
import com.ems.leave.dto.DecisionRequest;
import com.ems.leave.dto.LeaveBalanceDto;
import com.ems.leave.dto.LeaveRequestDto;
import com.ems.leave.dto.TeamCalendarEntryDto;
import com.ems.leave.entity.RequestStatus;
import com.ems.leave.service.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService service;

    // ----- self -----

    @GetMapping("/balance/me")
    public List<LeaveBalanceDto> myBalance(@RequestParam(required = false) Integer year) {
        return service.myBalances(year);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LeaveRequestDto apply(@Valid @RequestBody ApplyLeaveRequest request) {
        return service.apply(request);
    }

    @GetMapping("/me")
    public List<LeaveRequestDto> myLeaves(@RequestParam(required = false) RequestStatus status) {
        return service.myLeaves(status);
    }

    @PatchMapping("/{id}/cancel")
    public LeaveRequestDto cancel(@PathVariable Long id) {
        return service.cancel(id);
    }

    // ----- manager / HR -----

    @GetMapping("/pending")
    @PreAuthorize(Roles.HR_OR_MANAGER)
    public List<LeaveRequestDto> pending() {
        return service.pending();
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('HR','MANAGER')")
    public LeaveRequestDto approve(@PathVariable Long id, @Valid @RequestBody(required = false) DecisionRequest body) {
        return service.approve(id, body == null ? null : body.comment());
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('HR','MANAGER')")
    public LeaveRequestDto reject(@PathVariable Long id, @Valid @RequestBody(required = false) DecisionRequest body) {
        return service.reject(id, body == null ? null : body.comment());
    }

    @GetMapping
    @PreAuthorize(Roles.HR_OR_MANAGER)
    public PageResponse<LeaveRequestDto> search(
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "startDate", direction = Sort.Direction.DESC) Pageable pageable) {
        return service.search(status, from, to, pageable);
    }

    /** {@code month} as {@code yyyy-MM}; defaults to the current month. */
    @GetMapping("/team-calendar")
    @PreAuthorize(Roles.HR_OR_MANAGER)
    public List<TeamCalendarEntryDto> teamCalendar(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return service.teamCalendar(month);
    }
}
