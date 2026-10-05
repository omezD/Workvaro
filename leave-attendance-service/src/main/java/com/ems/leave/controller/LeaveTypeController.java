package com.ems.leave.controller;

import com.ems.common.security.Roles;
import com.ems.leave.dto.LeaveTypeDto;
import com.ems.leave.dto.LeaveTypeRequest;
import com.ems.leave.service.LeaveTypeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
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
@RequestMapping("/api/leave-types")
@RequiredArgsConstructor
public class LeaveTypeController {

    private final LeaveTypeService service;

    @GetMapping
    public List<LeaveTypeDto> list(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return service.findAll(activeOnly);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public LeaveTypeDto create(@Valid @RequestBody LeaveTypeRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public LeaveTypeDto update(@PathVariable Long id, @Valid @RequestBody LeaveTypeRequest request) {
        return service.update(id, request);
    }
}
