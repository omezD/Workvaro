package com.ems.leave.service;

import com.ems.common.exception.ApiException;
import com.ems.common.security.CurrentUser;
import com.ems.common.security.Roles;
import com.ems.leave.client.EmployeeDirectory;
import com.ems.leave.client.EmployeeRef;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Who may see and decide on whose requests:
 * <ul>
 *   <li>HR: everyone except themself (nobody approves their own request)</li>
 *   <li>Manager: only their direct reports, checked live against employee-service</li>
 *   <li>Admin: org-wide read access (reports, calendars) but no approvals unless also HR</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class ApprovalPolicy {

    private final CurrentUser currentUser;
    private final EmployeeDirectory directory;

    public boolean isHr() {
        return currentUser.hasRole(Roles.HR);
    }

    /** HR and Admin read everything. */
    public boolean hasOrgWideRead() {
        return currentUser.isHrOrAdmin();
    }

    /** Throws 403 unless the caller may approve/reject a request of {@code employeeUserId}. */
    public void assertCanDecide(String employeeUserId) {
        if (employeeUserId.equals(currentUser.id())) {
            throw ApiException.forbidden("You cannot approve or reject your own request");
        }
        if (isHr()) {
            return;
        }
        if (currentUser.isManager()) {
            EmployeeRef employee = directory.byUser(employeeUserId);
            if (currentUser.id().equals(employee.managerKeycloakUserId())) {
                return;
            }
        }
        throw ApiException.forbidden("Only the employee's manager or HR can decide on this request");
    }

    /**
     * Users whose requests the caller may see in team views, or {@code null} for "everyone"
     * (HR/Admin). For managers: their direct reports.
     */
    public Set<String> visibleUserIdsOrAll() {
        if (hasOrgWideRead()) {
            return null;
        }
        if (currentUser.isManager()) {
            return teamUserIds();
        }
        throw ApiException.forbidden("Only managers and HR can view team requests");
    }

    public Set<String> teamUserIds() {
        return userIds(directory.team(currentUser.id()));
    }

    static Set<String> userIds(List<EmployeeRef> refs) {
        return refs.stream().map(EmployeeRef::keycloakUserId).filter(id -> id != null).collect(Collectors.toSet());
    }
}
