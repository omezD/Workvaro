package com.ems.employee.repository;

import com.ems.employee.entity.Employee;
import com.ems.employee.entity.EmployeeStatus;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collection;
import java.util.Locale;

public final class EmployeeSpecifications {

    private EmployeeSpecifications() {
    }

    /** Matches first/last name, email or employee code (case-insensitive, contains). */
    public static Specification<Employee> search(String term) {
        if (term == null || term.isBlank()) {
            return null;
        }
        String like = "%" + term.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("firstName")), like, '\\'),
                cb.like(cb.lower(root.get("lastName")), like, '\\'),
                cb.like(cb.lower(root.get("email")), like, '\\'),
                cb.like(cb.lower(root.get("empCode")), like, '\\'));
    }

    public static Specification<Employee> inDepartment(Long departmentId) {
        return departmentId == null ? null
                : (root, query, cb) -> cb.equal(root.get("department").get("id"), departmentId);
    }

    public static Specification<Employee> statusIn(Collection<EmployeeStatus> statuses) {
        return (root, query, cb) -> root.get("status").in(statuses);
    }
}
