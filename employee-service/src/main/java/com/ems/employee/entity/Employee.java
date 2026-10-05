package com.ems.employee.entity;

import com.ems.common.crypto.AesGcmAttributeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "employee")
public class Employee extends BaseEntity {

    @Column(name = "keycloak_user_id", unique = true, length = 64)
    private String keycloakUserId;

    @Column(name = "emp_code", nullable = false, unique = true, length = 20)
    private String empCode;

    @Column(nullable = false, length = 60)
    private String firstName;

    @Column(nullable = false, length = 60)
    private String lastName;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 20)
    private String phone;

    private LocalDate dateOfBirth;

    @Column(nullable = false)
    private LocalDate joinDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "designation_id")
    private Designation designation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private Employee manager;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    /** Encrypted at rest; only HR/Admin/the employee see it unmasked. */
    @Convert(converter = AesGcmAttributeConverter.class)
    @Column(name = "bank_account")
    private String bankAccount;

    @Column(length = 500)
    private String address;

    @Column(length = 100)
    private String emergencyContactName;

    @Column(length = 20)
    private String emergencyContactPhone;

    public String getFullName() {
        return firstName + " " + lastName;
    }
}
