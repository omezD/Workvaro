package com.ems.leave.controller;

import com.ems.common.security.Roles;
import com.ems.leave.dto.HolidayDto;
import com.ems.leave.dto.HolidayRequest;
import com.ems.leave.service.HolidayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService service;
    private final Clock clock;

    @GetMapping
    public List<HolidayDto> list(@RequestParam(required = false) Integer year) {
        return service.forYear(year != null ? year : LocalDate.now(clock).getYear());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public HolidayDto create(@Valid @RequestBody HolidayRequest request) {
        return service.create(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
