package com.ems.leave.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "leave_balance")
public class LeaveBalance extends BaseEntity {

    @Column(name = "employee_user_id", nullable = false, length = 64)
    private String employeeUserId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "leave_type_id")
    private LeaveType leaveType;

    @Column(nullable = false)
    private int year;

    @Column(nullable = false)
    private int allocated;

    @Column(nullable = false)
    private int used;
}
