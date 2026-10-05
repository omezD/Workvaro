package com.ems.employee.entity;

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
@Table(name = "designation")
public class Designation extends BaseEntity {

    @Column(nullable = false, unique = true, length = 100)
    private String title;

    @Column(nullable = false)
    private int level = 1;

    @Column(length = 500)
    private String description;
}
