package com.ems.leave.repository;

import com.ems.leave.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    Optional<Attendance> findByEmployeeUserIdAndWorkDate(String employeeUserId, LocalDate workDate);

    List<Attendance> findByEmployeeUserIdAndWorkDateBetweenOrderByWorkDateAsc(String employeeUserId,
                                                                              LocalDate from, LocalDate to);

    List<Attendance> findByWorkDate(LocalDate workDate);
}
