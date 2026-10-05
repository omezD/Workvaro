package com.ems.employee.repository;

import com.ems.employee.entity.Designation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DesignationRepository extends JpaRepository<Designation, Long> {

    boolean existsByTitleIgnoreCase(String title);

    boolean existsByTitleIgnoreCaseAndIdNot(String title, Long id);
}
