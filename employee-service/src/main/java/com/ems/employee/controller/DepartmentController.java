package com.ems.employee.controller;

import com.ems.common.security.Roles;
import com.ems.employee.dto.DepartmentDto;
import com.ems.employee.dto.DepartmentRequest;
import com.ems.employee.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService service;

    @GetMapping
    public List<DepartmentDto> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public DepartmentDto get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public DepartmentDto create(@Valid @RequestBody DepartmentRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public DepartmentDto update(@PathVariable Long id, @Valid @RequestBody DepartmentRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
