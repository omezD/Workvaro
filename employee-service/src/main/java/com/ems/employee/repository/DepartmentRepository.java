package com.ems.employee.repository;

import com.ems.employee.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
