package com.ems.leave.repository;

import com.ems.leave.entity.LeaveRequest;
import com.ems.leave.entity.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long>, JpaSpecificationExecutor<LeaveRequest> {

    @Override
    @EntityGraph(attributePaths = "leaveType")
    Page<LeaveRequest> findAll(Specification<LeaveRequest> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "leaveType")
    List<LeaveRequest> findAll(Specification<LeaveRequest> spec);

    @Override
    @EntityGraph(attributePaths = "leaveType")
    List<LeaveRequest> findAll(Specification<LeaveRequest> spec, Sort sort);

    @Query("""
            select count(r) > 0 from LeaveRequest r
            where r.employeeUserId = :userId
              and r.status in :statuses
              and r.startDate <= :endDate and r.endDate >= :startDate
            """)
    boolean existsOverlapping(String userId, LocalDate startDate, LocalDate endDate,
                              Collection<RequestStatus> statuses);

    @Query("""
            select coalesce(sum(r.days), 0) from LeaveRequest r
            where r.employeeUserId = :userId and r.leaveType.id = :leaveTypeId
              and r.status = com.ems.leave.entity.RequestStatus.PENDING
              and r.startDate between :yearStart and :yearEnd
            """)
    long sumPendingDays(String userId, Long leaveTypeId, LocalDate yearStart, LocalDate yearEnd);

    long countByStatus(RequestStatus status);

    long countByEmployeeUserIdAndStatus(String employeeUserId, RequestStatus status);

    long countByEmployeeUserIdInAndStatus(Collection<String> employeeUserIds, RequestStatus status);
}
