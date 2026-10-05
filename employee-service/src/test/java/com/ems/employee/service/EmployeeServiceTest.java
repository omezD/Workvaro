package com.ems.employee.service;

import com.ems.common.exception.ApiException;
import com.ems.common.security.CurrentUser;
import com.ems.employee.dto.EmployeeCreateRequest;
import com.ems.employee.dto.EmployeeDetailDto;
import com.ems.employee.dto.EmployeeStatusRequest;
import com.ems.employee.dto.EmployeeUpdateRequest;
import com.ems.employee.entity.Employee;
import com.ems.employee.entity.EmployeeStatus;
import com.ems.employee.mapper.EmployeeMapperImpl;
import com.ems.employee.repository.EmployeeRepository;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Optional;

import static com.ems.employee.TestJwt.EMPLOYEE_ID;
import static com.ems.employee.TestJwt.HR_ID;
import static com.ems.employee.TestJwt.MANAGER_ID;
import static com.ems.employee.TestJwt.login;
import static com.ems.employee.TestJwt.loginWithEmail;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock
    EmployeeRepository repository;
    @Mock
    DepartmentService departmentService;
    @Mock
    DesignationService designationService;
    @Mock
    AuditService audit;

    EmployeeService service;
    Employee manager;
    Employee employee;
    Employee peer;

    @BeforeEach
    void setUp() {
        service = new EmployeeService(repository, departmentService, designationService, new EmployeeMapperImpl(),
                audit, new CurrentUser());
        manager = employee(3L, MANAGER_ID, "Manoj", null);
        employee = employee(4L, EMPLOYEE_ID, "Esha", manager);
        employee.setBankAccount("123456789012");
        peer = employee(5L, "55555555-5555-4555-8555-555555555555", "Peer", null);
    }

    @AfterEach
    void tearDown() {
        com.ems.employee.TestJwt.logout();
    }

    // ---------- profile ownership (IDOR) ----------

    @Test
    void hrSeesFullProfileWithBankAccount() {
        login(HR_ID, "HR", "EMPLOYEE");
        when(repository.findWithDetailsById(4L)).thenReturn(Optional.of(employee));

        EmployeeDetailDto dto = service.findById(4L);

        assertThat(dto.bankAccount()).isEqualTo("123456789012");
        assertThat(dto.bankAccountMasked()).isFalse();
    }

    @Test
    void employeeSeesOwnFullProfile() {
        login(EMPLOYEE_ID, "EMPLOYEE");
        when(repository.findWithDetailsById(4L)).thenReturn(Optional.of(employee));

        assertThat(service.findById(4L).bankAccount()).isEqualTo("123456789012");
    }

    @Test
    void managerSeesDirectReportWithMaskedBankAccount() {
        login(MANAGER_ID, "MANAGER", "EMPLOYEE");
        when(repository.findWithDetailsById(4L)).thenReturn(Optional.of(employee));

        EmployeeDetailDto dto = service.findById(4L);

        assertThat(dto.bankAccount()).isEqualTo("********9012");
        assertThat(dto.bankAccountMasked()).isTrue();
    }

    @Test
    void employeeCannotReadAnotherEmployeesProfile() {
        login(EMPLOYEE_ID, "EMPLOYEE");
        when(repository.findWithDetailsById(3L)).thenReturn(Optional.of(manager));

        assertApiError(() -> service.findById(3L), HttpStatus.FORBIDDEN);
    }

    @Test
    void managerCannotReadSomeoneOutsideTheirTeam() {
        login(MANAGER_ID, "MANAGER", "EMPLOYEE");
        when(repository.findWithDetailsById(5L)).thenReturn(Optional.of(peer));

        assertApiError(() -> service.findById(5L), HttpStatus.FORBIDDEN);
    }

    @Test
    void missingEmployeeIs404() {
        login(HR_ID, "HR");
        when(repository.findWithDetailsById(99L)).thenReturn(Optional.empty());

        assertApiError(() -> service.findById(99L), HttpStatus.NOT_FOUND);
    }

    // ---------- account linking ----------

    @Test
    void firstLoginLinksHrCreatedProfileByEmail() {
        String newUserId = "66666666-6666-4666-8666-666666666666";
        loginWithEmail(newUserId, "new.hire@ems.local", "EMPLOYEE");
        Employee unlinked = employee(6L, null, "New", manager);
        when(repository.findByKeycloakUserId(newUserId)).thenReturn(Optional.empty());
        when(repository.findByEmailIgnoreCaseAndKeycloakUserIdIsNull("new.hire@ems.local"))
                .thenReturn(Optional.of(unlinked));

        EmployeeDetailDto me = service.me();

        assertThat(me.keycloakUserId()).isEqualTo(newUserId);
        verify(audit).record(eq("LINK_ACCOUNT"), eq("Employee"), eq(6L), anyString());
    }

    @Test
    void meWithoutAnyProfileIs404() {
        loginWithEmail("77777777-7777-4777-8777-777777777777", "nobody@ems.local", "EMPLOYEE");
        when(repository.findByKeycloakUserId(anyString())).thenReturn(Optional.empty());
        when(repository.findByEmailIgnoreCaseAndKeycloakUserIdIsNull(anyString())).thenReturn(Optional.empty());

        assertApiError(() -> service.me(), HttpStatus.NOT_FOUND);
    }

    // ---------- HR writes ----------

    @Test
    void createRejectsDuplicateEmail() {
        login(HR_ID, "HR");
        when(repository.existsByEmpCodeIgnoreCase("EMP0100")).thenReturn(false);
        when(repository.existsByEmailIgnoreCase("esha@ems.local")).thenReturn(true);

        assertApiError(() -> service.create(createRequest("EMP0100", "esha@ems.local")), HttpStatus.CONFLICT);
        verify(repository, never()).save(any());
    }

    @Test
    void createRejectsDuplicateEmployeeCode() {
        login(HR_ID, "HR");
        when(repository.existsByEmpCodeIgnoreCase("EMP0004")).thenReturn(true);

        assertApiError(() -> service.create(createRequest("EMP0004", "x@ems.local")), HttpStatus.CONFLICT);
    }

    @Test
    void updateRejectsReportingCycle() {
        login(HR_ID, "HR");
        // Esha reports to Manoj; making Manoj report to Esha would create a cycle
        when(repository.findWithDetailsById(3L)).thenReturn(Optional.of(manager));
        when(repository.findById(4L)).thenReturn(Optional.of(employee));
        EmployeeUpdateRequest req = new EmployeeUpdateRequest(MANAGER_ID, "Manoj", "Kumar", "manager@ems.local",
                null, null, LocalDate.of(2021, 6, 15), null, null, 4L, null, null, null, null);

        assertApiError(() -> service.update(3L, req), HttpStatus.BAD_REQUEST);
    }

    @Test
    void updateRejectsSelfAsManager() {
        login(HR_ID, "HR");
        when(repository.findWithDetailsById(4L)).thenReturn(Optional.of(employee));
        EmployeeUpdateRequest req = new EmployeeUpdateRequest(EMPLOYEE_ID, "Esha", "Patel", "employee@ems.local",
                null, null, LocalDate.of(2024, 8, 1), null, null, 4L, null, null, null, null);

        assertApiError(() -> service.update(4L, req), HttpStatus.BAD_REQUEST);
    }

    @Test
    void hrCannotChangeOwnStatus() {
        login(HR_ID, "HR");
        Employee hrSelf = employee(2L, HR_ID, "Harini", null);
        when(repository.findWithDetailsById(2L)).thenReturn(Optional.of(hrSelf));

        assertApiError(() -> service.changeStatus(2L, new EmployeeStatusRequest(EmployeeStatus.TERMINATED, null)),
                HttpStatus.FORBIDDEN);
        assertThat(hrSelf.getStatus()).isEqualTo(EmployeeStatus.ACTIVE);
    }

    @Test
    void statusChangeIsAudited() {
        login(HR_ID, "HR");
        when(repository.findWithDetailsById(4L)).thenReturn(Optional.of(employee));

        EmployeeDetailDto dto = service.changeStatus(4L, new EmployeeStatusRequest(EmployeeStatus.ON_NOTICE, "resigned"));

        assertThat(dto.status()).isEqualTo(EmployeeStatus.ON_NOTICE);
        verify(audit).record(eq("STATUS_CHANGE"), eq("Employee"), eq(4L), anyString());
    }

    // ---------- helpers ----------

    private static Employee employee(Long id, String keycloakId, String firstName, Employee manager) {
        Employee e = new Employee();
        ReflectionTestUtils.setField(e, "id", id);
        e.setKeycloakUserId(keycloakId);
        e.setEmpCode("EMP000" + id);
        e.setFirstName(firstName);
        e.setLastName("Test");
        e.setEmail(firstName.toLowerCase() + "@ems.local");
        e.setJoinDate(LocalDate.of(2024, 1, 1));
        e.setManager(manager);
        e.setStatus(EmployeeStatus.ACTIVE);
        return e;
    }

    private static EmployeeCreateRequest createRequest(String code, String email) {
        return new EmployeeCreateRequest(null, code, "New", "Hire", email, null, null, LocalDate.of(2026, 10, 1),
                null, null, null, null, null, null, null);
    }

    private static void assertApiError(ThrowingCallable call, HttpStatus status) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getStatus()).isEqualTo(status));
    }
}
