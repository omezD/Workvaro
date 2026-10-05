package com.ems.leave.repository;

import com.ems.leave.entity.LeaveBalance;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, Long> {

    @EntityGraph(attributePaths = "leaveType")
    List<LeaveBalance> findByEmployeeUserIdAndYear(String employeeUserId, int year);

    Optional<LeaveBalance> findByEmployeeUserIdAndLeaveTypeIdAndYear(String employeeUserId, Long leaveTypeId, int year);
}
