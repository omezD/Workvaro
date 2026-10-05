package com.ems.employee.entity;

import java.util.EnumSet;
import java.util.Set;

public enum EmployeeStatus {
    ACTIVE,
    ON_NOTICE,
    RESIGNED,
    TERMINATED;

    /** Statuses of people who still work here (shown in the directory, can apply for leave). */
    public static final Set<EmployeeStatus> CURRENT = EnumSet.of(ACTIVE, ON_NOTICE);
}
