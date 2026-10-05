package com.ems.leave.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "holiday")
public class Holiday extends BaseEntity {

    @Column(nullable = false, unique = true)
    private LocalDate date;

    @Column(nullable = false, length = 100)
    private String name;
}
