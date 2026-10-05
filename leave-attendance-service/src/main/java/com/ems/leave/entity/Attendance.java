package com.ems.leave.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "attendance")
public class Attendance extends BaseEntity {

    @Column(name = "employee_user_id", nullable = false, length = 64)
    private String employeeUserId;

    @Column(nullable = false, length = 130)
    private String employeeName;

    /** The business-time-zone date this record belongs to. */
    @Column(nullable = false)
    private LocalDate workDate;

    @Column(nullable = false)
    private Instant checkIn;

    private Instant checkOut;

    /** True when the times come from an approved correction. */
    @Column(nullable = false)
    private boolean corrected;
}
