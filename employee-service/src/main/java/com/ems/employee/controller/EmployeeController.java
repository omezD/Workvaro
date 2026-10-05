package com.ems.employee.controller;

import com.ems.common.dto.PageResponse;
import com.ems.common.security.Roles;
import com.ems.employee.dto.EmployeeCreateRequest;
import com.ems.employee.dto.EmployeeDetailDto;
import com.ems.employee.dto.EmployeeStatsDto;
import com.ems.employee.dto.EmployeeStatusRequest;
import com.ems.employee.dto.EmployeeSummaryDto;
import com.ems.employee.dto.EmployeeUpdateRequest;
import com.ems.employee.dto.MyProfileUpdateRequest;
import com.ems.employee.entity.EmployeeStatus;
import com.ems.employee.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService service;

    /** Directory, visible to everyone. {@code status} is honoured for HR/Admin only. */
    @GetMapping
    public PageResponse<EmployeeSummaryDto> directory(
            @RequestParam(required = false) String search,
            @RequestParam(name = "dept", required = false) Long departmentId,
            @RequestParam(required = false) EmployeeStatus status,
            @PageableDefault(size = 20, sort = {"firstName", "lastName"}) Pageable pageable) {
        return service.directory(search, departmentId, status, DirectorySort.sanitize(pageable));
    }

    @GetMapping("/{id}")
    public EmployeeDetailDto get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public EmployeeDetailDto create(@Valid @RequestBody EmployeeCreateRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public EmployeeDetailDto update(@PathVariable Long id, @Valid @RequestBody EmployeeUpdateRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public EmployeeDetailDto changeStatus(@PathVariable Long id, @Valid @RequestBody EmployeeStatusRequest request) {
        return service.changeStatus(id, request);
    }

    @GetMapping("/me")
    public EmployeeDetailDto me() {
        return service.me();
    }

    @PutMapping("/me")
    public EmployeeDetailDto updateMe(@Valid @RequestBody MyProfileUpdateRequest request) {
        return service.updateMe(request);
    }

    @GetMapping("/me/team")
    @PreAuthorize(Roles.HR_OR_MANAGER)
    public List<EmployeeSummaryDto> myTeam() {
        return service.myTeam();
    }

    @GetMapping("/stats")
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public EmployeeStatsDto stats() {
        return service.stats();
    }

    /** Only allow sorting by directory columns, so clients cannot probe hidden fields via sort order. */
    static final class DirectorySort {
        private static final List<String> ALLOWED = List.of("firstName", "lastName", "empCode", "email", "joinDate");

        static Pageable sanitize(Pageable pageable) {
            Sort sort = Sort.by(pageable.getSort().stream()
                    .filter(o -> ALLOWED.contains(o.getProperty()))
                    .toList());
            if (sort.isUnsorted()) {
                sort = Sort.by("firstName", "lastName");
            }
            return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        }

        private DirectorySort() {
        }
    }
}
