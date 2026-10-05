package com.ems.employee.controller;

import com.ems.common.security.Roles;
import com.ems.employee.dto.DesignationDto;
import com.ems.employee.dto.DesignationRequest;
import com.ems.employee.service.DesignationService;
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
@RequestMapping("/api/designations")
@RequiredArgsConstructor
public class DesignationController {

    private final DesignationService service;

    @GetMapping
    public List<DesignationDto> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public DesignationDto get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public DesignationDto create(@Valid @RequestBody DesignationRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public DesignationDto update(@PathVariable Long id, @Valid @RequestBody DesignationRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
