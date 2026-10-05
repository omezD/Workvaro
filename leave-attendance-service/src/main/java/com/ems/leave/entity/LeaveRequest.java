package com.ems.leave.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(name = "leave_request")
public class LeaveRequest extends BaseEntity {

    @Column(name = "employee_user_id", nullable = false, length = 64)
    private String employeeUserId;

    /** employee-service id, kept for linking from the UI. */
    @Column(nullable = false)
    private Long employeeId;

    /** Snapshot for lists, so reads do not need a call to employee-service. */
    @Column(nullable = false, length = 130)
    private String employeeName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "leave_type_id")
    private LeaveType leaveType;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    /** Working days, excluding weekends and holidays. */
    @Column(nullable = false)
    private int days;

    @Column(length = 500)
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
