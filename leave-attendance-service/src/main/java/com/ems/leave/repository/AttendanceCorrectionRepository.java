package com.ems.leave.repository;

import com.ems.leave.entity.AttendanceCorrection;
import com.ems.leave.entity.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface AttendanceCorrectionRepository extends JpaRepository<AttendanceCorrection, Long> {

    List<AttendanceCorrection> findByEmployeeUserIdOrderByWorkDateDesc(String employeeUserId);

    List<AttendanceCorrection> findByStatusAndEmployeeUserIdNotOrderByCreatedAtAsc(RequestStatus status,
                                                                                    String excludedUserId);

    List<AttendanceCorrection> findByStatusAndEmployeeUserIdInOrderByCreatedAtAsc(RequestStatus status,
                                                                                   Collection<String> userIds);

    boolean existsByEmployeeUserIdAndWorkDateAndStatus(String employeeUserId, LocalDate workDate,
                                                       RequestStatus status);

    long countByStatus(RequestStatus status);

    long countByEmployeeUserIdInAndStatus(Collection<String> employeeUserIds, RequestStatus status);
}
