package com.ems.leave.repository;

import com.ems.leave.entity.LeaveRequest;
import com.ems.leave.entity.RequestStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.Collection;

public final class LeaveRequestSpecifications {

    private LeaveRequestSpecifications() {
    }

    public static Specification<LeaveRequest> ofUser(String userId) {
        return userId == null ? null : (root, q, cb) -> cb.equal(root.get("employeeUserId"), userId);
    }

    /** {@code null} means "no restriction"; an empty collection matches nothing. */
    public static Specification<LeaveRequest> ofUsers(Collection<String> userIds) {
        if (userIds == null) {
            return null;
        }
        return userIds.isEmpty()
                ? (root, q, cb) -> cb.disjunction()
                : (root, q, cb) -> root.get("employeeUserId").in(userIds);
    }

    public static Specification<LeaveRequest> notOfUser(String userId) {
        return (root, q, cb) -> cb.notEqual(root.get("employeeUserId"), userId);
    }

    public static Specification<LeaveRequest> withStatus(RequestStatus status) {
        return status == null ? null : (root, q, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<LeaveRequest> withStatusIn(Collection<RequestStatus> statuses) {
        return (root, q, cb) -> root.get("status").in(statuses);
    }

    /** Requests overlapping [from, to]; either bound may be null. */
    public static Specification<LeaveRequest> overlapping(LocalDate from, LocalDate to) {
        Specification<LeaveRequest> spec = null;
        if (from != null) {
            spec = (root, q, cb) -> cb.greaterThanOrEqualTo(root.get("endDate"), from);
        }
        if (to != null) {
            Specification<LeaveRequest> upper = (root, q, cb) -> cb.lessThanOrEqualTo(root.get("startDate"), to);
            spec = spec == null ? upper : spec.and(upper);
        }
        return spec;
    }
}
