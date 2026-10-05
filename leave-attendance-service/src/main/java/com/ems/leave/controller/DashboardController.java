package com.ems.leave.controller;

import com.ems.common.security.Roles;
import com.ems.leave.dto.DashboardDtos.HrDashboard;
import com.ems.leave.dto.DashboardDtos.ManagerDashboard;
import com.ems.leave.dto.DashboardDtos.MyDashboard;
import com.ems.leave.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Leave/attendance widgets. HR headcount by department comes from GET /api/employees/stats. */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService service;

    @GetMapping("/me")
    public MyDashboard me() {
        return service.me();
    }

    @GetMapping("/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public ManagerDashboard manager() {
        return service.manager();
    }

    @GetMapping("/hr")
    @PreAuthorize(Roles.ADMIN_OR_HR)
    public HrDashboard hr() {
        return service.hr();
    }
}
