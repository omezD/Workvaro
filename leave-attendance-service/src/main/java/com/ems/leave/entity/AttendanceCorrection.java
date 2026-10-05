package com.ems.leave.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "attendance_correction")
public class AttendanceCorrection extends BaseEntity {

    @Column(name = "employee_user_id", nullable = false, length = 64)
    private String employeeUserId;

    @Column(nullable = false, length = 130)
    private String employeeName;

    @Column(nullable = false)
    private LocalDate workDate;

    @Column(nullable = false)
    private Instant requestedCheckIn;

    @Column(nullable = false)
    private Instant requestedCheckOut;

    @Column(nullable = false, length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(length = 64)
    private String decidedByUserId;

    @Column(length = 150)
    private String decidedByName;

    @Column(length = 500)
    private String decisionComment;

    private Instant decidedAt;
}
