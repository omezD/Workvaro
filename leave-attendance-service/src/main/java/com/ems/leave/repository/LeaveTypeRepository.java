package com.ems.leave.repository;

import com.ems.leave.entity.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveTypeRepository extends JpaRepository<LeaveType, Long> {

    List<LeaveType> findAllByOrderByNameAsc();

    List<LeaveType> findByActiveTrueOrderByNameAsc();

    boolean existsByCodeIgnoreCaseOrNameIgnoreCase(String code, String name);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
