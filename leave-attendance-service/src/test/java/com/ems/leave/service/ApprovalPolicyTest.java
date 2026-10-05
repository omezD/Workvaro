package com.ems.leave.service;

import com.ems.common.security.CurrentUser;
import com.ems.leave.TestJwt;
import com.ems.leave.client.EmployeeDirectory;
import com.ems.leave.client.EmployeeRef;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;

import static com.ems.leave.TestJwt.ADMIN_ID;
import static com.ems.leave.TestJwt.EMPLOYEE_ID;
import static com.ems.leave.TestJwt.HR_ID;
import static com.ems.leave.TestJwt.MANAGER_ID;
import static com.ems.leave.TestJwt.login;
import static com.ems.leave.service.LeaveServiceTest.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApprovalPolicyTest {

    @Mock
    EmployeeDirectory directory;

    ApprovalPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new ApprovalPolicy(new CurrentUser(), directory);
    }

    @AfterEach
    void tearDown() {
        TestJwt.logout();
    }

    @Test
    void nobodyApprovesTheirOwnRequestNotEvenHr() {
        login(HR_ID, "HR", "MANAGER", "EMPLOYEE");
        assertApiError(() -> policy.assertCanDecide(HR_ID), HttpStatus.FORBIDDEN);
    }

    @Test
    void hrMayDecideForAnyoneWithoutALookup() {
        login(HR_ID, "HR", "EMPLOYEE");
        assertThatCode(() -> policy.assertCanDecide(EMPLOYEE_ID)).doesNotThrowAnyException();
        verify(directory, never()).byUser(anyString());
    }

    @Test
    void managerMayDecideForDirectReport() {
        login(MANAGER_ID, "MANAGER", "EMPLOYEE");
        when(directory.byUser(EMPLOYEE_ID)).thenReturn(ref(EMPLOYEE_ID, MANAGER_ID));

        assertThatCode(() -> policy.assertCanDecide(EMPLOYEE_ID)).doesNotThrowAnyException();
    }

    @Test
    void managerCannotDecideForAnotherTeam() {
        login(MANAGER_ID, "MANAGER", "EMPLOYEE");
        when(directory.byUser(HR_ID)).thenReturn(ref(HR_ID, ADMIN_ID));

        assertApiError(() -> policy.assertCanDecide(HR_ID), HttpStatus.FORBIDDEN);
    }

    @Test
    void plainEmployeeCannotDecide() {
        login(EMPLOYEE_ID, "EMPLOYEE");
        assertApiError(() -> policy.assertCanDecide(MANAGER_ID), HttpStatus.FORBIDDEN);
        verify(directory, never()).byUser(anyString());
    }

    @Test
    void adminWithoutHrOrManagerRoleCannotDecide() {
        login(ADMIN_ID, "ADMIN", "EMPLOYEE");
        assertApiError(() -> policy.assertCanDecide(EMPLOYEE_ID), HttpStatus.FORBIDDEN);
    }

    @Test
    void visibilityIsEveryoneForHrTeamForManagerAndNothingForEmployees() {
        login(HR_ID, "HR");
        assertThat(policy.visibleUserIdsOrAll()).isNull();

        login(MANAGER_ID, "MANAGER");
        when(directory.team(MANAGER_ID)).thenReturn(List.of(ref(EMPLOYEE_ID, MANAGER_ID)));
        assertThat(policy.visibleUserIdsOrAll()).containsExactly(EMPLOYEE_ID);

        login(EMPLOYEE_ID, "EMPLOYEE");
        assertApiError(() -> policy.visibleUserIdsOrAll(), HttpStatus.FORBIDDEN);
    }

    private static EmployeeRef ref(String userId, String managerUserId) {
        return new EmployeeRef(1L, userId, "EMP", "Someone", "x@ems.local", 1L, "Dept", 2L, managerUserId, "ACTIVE");
    }
}
