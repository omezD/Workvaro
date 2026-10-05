package com.ems.leave.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "leave_type")
public class LeaveType extends BaseEntity {

    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @Column(nullable = false, unique = true, length = 60)
    private String name;

    /** Days granted per calendar year. Ignored when {@link #unlimited}. */
    @Column(nullable = false)
    private int annualQuota;

    @Column(nullable = false)
    private boolean paid = true;

    /** No balance check (e.g. Unpaid leave). */
    @Column(nullable = false)
    private boolean unlimited;

    @Column(nullable = false)
    private boolean active = true;
}
