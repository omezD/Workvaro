package com.ems.leave.controller;

import com.ems.common.exception.ApiException;
import com.ems.leave.TestJwt;
import com.ems.leave.config.ClockConfig;
import com.ems.leave.service.AttendanceService;
import com.ems.leave.service.DashboardService;
import com.ems.leave.service.HolidayService;
import com.ems.leave.service.LeaveService;
import com.ems.leave.service.LeaveTypeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** HTTP-level security of leave-attendance-service with the real common-lib security and mocked services. */
@WebMvcTest(controllers = {LeaveController.class, AttendanceController.class, HolidayController.class,
        LeaveTypeController.class, DashboardController.class})
@Import(ClockConfig.class)
class LeaveApiSecurityTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    LeaveService leaveService;
    @MockitoBean
    AttendanceService attendanceService;
    @MockitoBean
    HolidayService holidayService;
    @MockitoBean
    LeaveTypeService leaveTypeService;
    @MockitoBean
    DashboardService dashboardService;

    // ---------- 401 ----------

    @Test
    void everyEndpointNeedsAToken() throws Exception {
        mvc.perform(get("/api/leaves/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/attendance/check-in")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/holidays")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/dashboard/me")).andExpect(status().isUnauthorized());
    }

    // ---------- self-service ----------

    @Test
    void employeeCanApplyListAndCancel() throws Exception {
        mvc.perform(post("/api/leaves").with(TestJwt.employee()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"leaveTypeId\":1,\"startDate\":\"2026-10-12\",\"endDate\":\"2026-10-13\"}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/leaves/me").with(TestJwt.employee())).andExpect(status().isOk());
        mvc.perform(get("/api/leaves/balance/me").with(TestJwt.employee())).andExpect(status().isOk());
        mvc.perform(patch("/api/leaves/5/cancel").with(TestJwt.employee())).andExpect(status().isOk());
    }

    @Test
    void applyValidatesDates() throws Exception {
        mvc.perform(post("/api/leaves").with(TestJwt.employee()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"leaveTypeId\":1,\"startDate\":\"2026-10-13\",\"endDate\":\"2026-10-12\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.validRange").value("endDate must be on or after startDate"));
        mvc.perform(post("/api/leaves").with(TestJwt.employee()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startDate\":\"2026-10-12\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.leaveTypeId").exists())
                .andExpect(jsonPath("$.fieldErrors.endDate").exists());
        mvc.perform(post("/api/leaves").with(TestJwt.employee()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"leaveTypeId\":1,\"startDate\":\"12/10/2026\",\"endDate\":\"2026-10-12\"}"))
                .andExpect(status().isBadRequest());
        verify(leaveService, never()).apply(any());
    }

    @Test
    void attendanceSelfServiceWorksForEveryone() throws Exception {
        mvc.perform(post("/api/attendance/check-in").with(TestJwt.employee())).andExpect(status().isCreated());
        mvc.perform(post("/api/attendance/check-out").with(TestJwt.employee())).andExpect(status().isOk());
        mvc.perform(get("/api/attendance/me?month=2026-10").with(TestJwt.employee())).andExpect(status().isOk());
    }

    @Test
    void badMonthFormatIs400() throws Exception {
        mvc.perform(get("/api/attendance/me?month=October").with(TestJwt.employee()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void correctionRequestIsValidated() throws Exception {
        mvc.perform(post("/api/attendance/corrections").with(TestJwt.employee())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"workDate\":\"2026-10-02\",\"checkIn\":\"18:00\",\"checkOut\":\"09:00\",\"reason\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.validRange").exists())
                .andExpect(jsonPath("$.fieldErrors.reason").exists());
    }

    // ---------- approvals ----------

    @Test
    void employeeCannotApproveOrRejectLeaveEvenTheirOwn() throws Exception {
        mvc.perform(patch("/api/leaves/5/approve").with(TestJwt.employee())).andExpect(status().isForbidden());
        mvc.perform(patch("/api/leaves/5/reject").with(TestJwt.employee())).andExpect(status().isForbidden());
        mvc.perform(get("/api/leaves/pending").with(TestJwt.employee())).andExpect(status().isForbidden());
        verify(leaveService, never()).approve(anyLong(), any());
    }

    @Test
    void adminWithoutHrOrManagerRoleCannotApprove() throws Exception {
        mvc.perform(patch("/api/leaves/5/approve").with(TestJwt.as(TestJwt.ADMIN_ID, "ADMIN", "EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerApprovesWithOptionalComment() throws Exception {
        mvc.perform(patch("/api/leaves/5/approve").with(TestJwt.manager())).andExpect(status().isOk());
        mvc.perform(patch("/api/leaves/5/approve").with(TestJwt.manager()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"ok\"}"))
                .andExpect(status().isOk());
        verify(leaveService).approve(5L, "ok");
    }

    @Test
    void managerApprovingAnotherTeamsLeaveIs403() throws Exception {
        when(leaveService.approve(9L, null)).thenThrow(ApiException.forbidden("not your team"));

        mvc.perform(patch("/api/leaves/9/approve").with(TestJwt.manager()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("not your team"));
    }

    @Test
    void decisionCommentIsLengthLimited() throws Exception {
        mvc.perform(patch("/api/leaves/5/reject").with(TestJwt.hr()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"" + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void correctionApprovalsNeedManagerOrHr() throws Exception {
        mvc.perform(get("/api/attendance/corrections/pending").with(TestJwt.employee()))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/attendance/corrections/3/approve").with(TestJwt.employee()))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/attendance/corrections/3/approve").with(TestJwt.hr())).andExpect(status().isOk());
    }

    // ---------- team / org views ----------

    @Test
    void teamViewsAreForManagersAndHr() throws Exception {
        mvc.perform(get("/api/leaves").with(TestJwt.employee())).andExpect(status().isForbidden());
        mvc.perform(get("/api/leaves/team-calendar").with(TestJwt.employee())).andExpect(status().isForbidden());
        mvc.perform(get("/api/attendance/today").with(TestJwt.employee())).andExpect(status().isForbidden());
        mvc.perform(get("/api/leaves?status=PENDING&from=2026-10-01&to=2026-10-31").with(TestJwt.hr()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/leaves/team-calendar?month=2026-10").with(TestJwt.manager()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/attendance/today").with(TestJwt.manager())).andExpect(status().isOk());
    }

    @Test
    void invalidStatusFilterIs400() throws Exception {
        mvc.perform(get("/api/leaves?status=MAYBE").with(TestJwt.hr())).andExpect(status().isBadRequest());
    }

    @Test
    void dashboardsAreRoleScoped() throws Exception {
        mvc.perform(get("/api/dashboard/me").with(TestJwt.employee())).andExpect(status().isOk());
        mvc.perform(get("/api/dashboard/manager").with(TestJwt.employee())).andExpect(status().isForbidden());
        mvc.perform(get("/api/dashboard/hr").with(TestJwt.employee())).andExpect(status().isForbidden());
        mvc.perform(get("/api/dashboard/hr").with(TestJwt.manager())).andExpect(status().isForbidden());
        mvc.perform(get("/api/dashboard/manager").with(TestJwt.manager())).andExpect(status().isOk());
        mvc.perform(get("/api/dashboard/hr").with(TestJwt.hr())).andExpect(status().isOk());
    }

    // ---------- admin data ----------

    @Test
    void holidaysAreReadableByAllButWrittenByHrOnly() throws Exception {
        String body = "{\"date\":\"2026-12-24\",\"name\":\"Christmas Eve\"}";
        mvc.perform(get("/api/holidays?year=2026").with(TestJwt.employee())).andExpect(status().isOk());
        mvc.perform(post("/api/holidays").with(TestJwt.employee()).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/holidays/1").with(TestJwt.manager())).andExpect(status().isForbidden());
        mvc.perform(post("/api/holidays").with(TestJwt.hr()).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isCreated());
    }

    @Test
    void leaveTypesAreWrittenByHrOrAdminOnly() throws Exception {
        String body = "{\"code\":\"ML\",\"name\":\"Maternity\",\"annualQuota\":182,\"paid\":true,\"active\":true}";
        mvc.perform(get("/api/leave-types").with(TestJwt.employee())).andExpect(status().isOk());
        mvc.perform(post("/api/leave-types").with(TestJwt.manager()).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/leave-types").with(TestJwt.admin()).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isCreated());
        mvc.perform(post("/api/leave-types").with(TestJwt.hr()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"X\",\"name\":\"Too much\",\"annualQuota\":400}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.annualQuota").exists());
    }
}
