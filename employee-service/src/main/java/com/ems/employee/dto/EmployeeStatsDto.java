package com.ems.employee.dto;

import java.util.List;
import java.util.Map;

public record EmployeeStatsDto(
        long totalCurrent,
        Map<String, Long> byStatus,
        List<DepartmentHeadcountDto> byDepartment) {

    public record DepartmentHeadcountDto(Long departmentId, String departmentName, long headcount) {
    }
}
