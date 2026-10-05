package com.ems.employee.controller;

import com.ems.common.exception.ApiException;
import com.ems.employee.TestJwt;
import com.ems.employee.service.DepartmentService;
import com.ems.employee.service.DesignationService;
import com.ems.employee.service.EmployeeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HTTP-level security of employee-service: authentication, role checks, validation and error format.
 * Uses the real SecurityConfig/GlobalExceptionHandler from common-lib with mocked services.
 */
@WebMvcTest(controllers = {EmployeeController.class, DepartmentController.class, DesignationController.class,
        InternalEmployeeController.class})
class EmployeeApiSecurityTest {

    private static final String VALID_EMPLOYEE = """
            {"empCode":"EMP0100","firstName":"New","lastName":"Hire","email":"new.hire@ems.local",
             "joinDate":"2026-10-01","bankAccount":"123456789012"}
            """;

    @Autowired
    MockMvc mvc;

    @MockitoBean
    EmployeeService employeeService;
    @MockitoBean
    DepartmentService departmentService;
    @MockitoBean
    DesignationService designationService;

    // ---------- 401 ----------

    @Test
    void noTokenIs401WithJsonError() throws Exception {
        mvc.perform(get("/api/employees"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void internalEndpointsAlsoNeedAToken() throws Exception {
        mvc.perform(get("/internal/employees/active")).andExpect(status().isUnauthorized());
    }

    @Test
    void swaggerPathsDoNotRequireAToken() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().is(org.hamcrest.Matchers.not(401)));
    }

    // ---------- directory & self ----------

    @Test
    void everyEmployeeCanReadTheDirectory() throws Exception {
        mvc.perform(get("/api/employees").with(TestJwt.employee())).andExpect(status().isOk());
    }

    @Test
    void employeeCanReadAndUpdateOwnProfile() throws Exception {
        mvc.perform(get("/api/employees/me").with(TestJwt.employee())).andExpect(status().isOk());
        mvc.perform(put("/api/employees/me").with(TestJwt.employee()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"+91 98765 43210\",\"address\":\"Pune\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void ownProfileUpdateValidatesPhone() throws Exception {
        mvc.perform(put("/api/employees/me").with(TestJwt.employee()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"call me maybe\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.phone").exists());
    }

    @Test
    void ownershipViolationFromServiceBecomes403() throws Exception {
        when(employeeService.findById(3L)).thenThrow(ApiException.forbidden("You can only view your own profile"));

        mvc.perform(get("/api/employees/3").with(TestJwt.employee()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    // ---------- HR-only endpoints ----------

    @Test
    void employeeCannotCreateEmployees() throws Exception {
        mvc.perform(post("/api/employees").with(TestJwt.employee()).contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_EMPLOYEE))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You do not have permission to perform this action"));
        verify(employeeService, never()).create(any());
    }

    @Test
    void managerCannotCreateEmployees() throws Exception {
        mvc.perform(post("/api/employees").with(TestJwt.manager()).contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_EMPLOYEE))
                .andExpect(status().isForbidden());
    }

    @Test
    void hrCanCreateEmployees() throws Exception {
        mvc.perform(post("/api/employees").with(TestJwt.hr()).contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_EMPLOYEE))
                .andExpect(status().isCreated());
        verify(employeeService).create(any());
    }

    @Test
    void createValidatesInput() throws Exception {
        mvc.perform(post("/api/employees").with(TestJwt.hr()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"empCode\":\"bad code!\",\"firstName\":\"\",\"email\":\"not-an-email\","
                                + "\"bankAccount\":\"12ab\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.fieldErrors.empCode").exists())
                .andExpect(jsonPath("$.fieldErrors.firstName").exists())
                .andExpect(jsonPath("$.fieldErrors.lastName").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.joinDate").exists())
                .andExpect(jsonPath("$.fieldErrors.bankAccount").exists());
        verify(employeeService, never()).create(any());
    }

    @Test
    void malformedJsonIs400() throws Exception {
        mvc.perform(post("/api/employees").with(TestJwt.hr()).contentType(MediaType.APPLICATION_JSON)
                        .content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request"));
    }

    @Test
    void onlyHrOrAdminCanChangeStatus() throws Exception {
        String body = "{\"status\":\"TERMINATED\"}";
        mvc.perform(patch("/api/employees/4/status").with(TestJwt.manager())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/employees/4/status").with(TestJwt.admin())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
    }

    @Test
    void invalidStatusValueIs400() throws Exception {
        mvc.perform(patch("/api/employees/4/status").with(TestJwt.hr())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PROMOTED\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void statsAreHrAndAdminOnly() throws Exception {
        mvc.perform(get("/api/employees/stats").with(TestJwt.employee())).andExpect(status().isForbidden());
        mvc.perform(get("/api/employees/stats").with(TestJwt.manager())).andExpect(status().isForbidden());
        mvc.perform(get("/api/employees/stats").with(TestJwt.hr())).andExpect(status().isOk());
    }

    @Test
    void myTeamNeedsManagerRole() throws Exception {
        mvc.perform(get("/api/employees/me/team").with(TestJwt.employee())).andExpect(status().isForbidden());
        mvc.perform(get("/api/employees/me/team").with(TestJwt.manager())).andExpect(status().isOk());
    }

    @Test
    void invalidPathIdIs400() throws Exception {
        mvc.perform(get("/api/employees/abc").with(TestJwt.hr())).andExpect(status().isBadRequest());
    }

    // ---------- org setup ----------

    @Test
    void everyoneReadsDepartmentsButOnlyHrWrites() throws Exception {
        String body = "{\"code\":\"QA\",\"name\":\"Quality\"}";
        mvc.perform(get("/api/departments").with(TestJwt.employee())).andExpect(status().isOk());
        mvc.perform(post("/api/departments").with(TestJwt.employee())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/departments/1").with(TestJwt.manager())).andExpect(status().isForbidden());
        mvc.perform(post("/api/departments").with(TestJwt.hr())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
    }

    @Test
    void departmentValidation() throws Exception {
        mvc.perform(post("/api/departments").with(TestJwt.admin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"has space\",\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.code").exists())
                .andExpect(jsonPath("$.fieldErrors.name").exists());
    }

    @Test
    void designationWritesNeedHr() throws Exception {
        mvc.perform(put("/api/designations/1").with(TestJwt.employee()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"CTO\",\"level\":9}"))
                .andExpect(status().isForbidden());
    }
}
