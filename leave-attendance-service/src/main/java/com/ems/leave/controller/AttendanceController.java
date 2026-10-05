package com.ems.leave.controller;

import com.ems.common.security.Roles;
import com.ems.leave.dto.AttendanceDto;
import com.ems.leave.dto.CorrectionDto;
import com.ems.leave.dto.CorrectionRequest;
import com.ems.leave.dto.DecisionRequest;
import com.ems.leave.dto.TodayAttendanceDto;
import com.ems.leave.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService service;

    @PostMapping("/check-in")
    @ResponseStatus(HttpStatus.CREATED)
    public AttendanceDto checkIn() {
        return service.checkIn();
    }

    @PostMapping("/check-out")
    public AttendanceDto checkOut() {
        return service.checkOut();
    }

    /** {@code month} as {@code yyyy-MM}; defaults to the current month. */
    @GetMapping("/me")
    public List<AttendanceDto> myMonth(@RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return service.myMonth(month);
    }

    @GetMapping("/today")
    @PreAuthorize(Roles.HR_OR_MANAGER)
    public TodayAttendanceDto today() {
        return service.today();
    }

    @PostMapping("/corrections")
    @ResponseStatus(HttpStatus.CREATED)
    public CorrectionDto requestCorrection(@Valid @RequestBody CorrectionRequest request) {
        return service.requestCorrection(request);
    }

    @GetMapping("/corrections/me")
    public List<CorrectionDto> myCorrections() {
        return service.myCorrections();
    }

    @GetMapping("/corrections/pending")
    @PreAuthorize(Roles.HR_OR_MANAGER)
    public List<CorrectionDto> pendingCorrections() {
        return service.pendingCorrections();
    }

    @PatchMapping("/corrections/{id}/approve")
    @PreAuthorize("hasAnyRole('HR','MANAGER')")
    public CorrectionDto approve(@PathVariable Long id, @Valid @RequestBody(required = false) DecisionRequest body) {
        return service.approveCorrection(id, body == null ? null : body.comment());
    }

    @PatchMapping("/corrections/{id}/reject")
    @PreAuthorize("hasAnyRole('HR','MANAGER')")
    public CorrectionDto reject(@PathVariable Long id, @Valid @RequestBody(required = false) DecisionRequest body) {
        return service.rejectCorrection(id, body == null ? null : body.comment());
    }
}
