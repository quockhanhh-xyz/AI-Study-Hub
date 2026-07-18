package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.config.CorsConfig;
import com.demo.ai_study_hub.config.CustomAccessDeniedHandler;
import com.demo.ai_study_hub.config.JwtAuthenticationEntryPoint;
import com.demo.ai_study_hub.config.SecurityConfig;
import com.demo.ai_study_hub.dto.AdminDashboardResponse;
import com.demo.ai_study_hub.dto.AdminPublicDocumentItem;
import com.demo.ai_study_hub.dto.AdminPublicDocumentListResponse;
import com.demo.ai_study_hub.service.AdminService;
import com.demo.ai_study_hub.service.JwtUtil;
import com.demo.ai_study_hub.service.UserDetailsServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@Import({SecurityConfig.class, CorsConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminService adminService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @MockBean
    private com.demo.ai_study_hub.repository.UserRepository userRepository;

    // =========================================================================
    // 1. Authentication & Authorization Checks
    // =========================================================================

    @Test
    void getDashboardSummary_AsGuest_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "user@test.com", roles = {"USER"})
    void getDashboardSummary_AsUser_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/summary"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void getDashboardSummary_AsAdmin_ShouldReturn200() throws Exception {
        AdminDashboardResponse mockResponse = AdminDashboardResponse.builder()
                .totalUsers(10)
                .totalDocuments(20)
                .totalRevenue(5000L)
                .build();

        when(adminService.getDashboardSummary()).thenReturn(mockResponse);

        mockMvc.perform(get("/api/admin/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalUsers").value(10))
                .andExpect(jsonPath("$.data.totalRevenue").value(5000));
    }

    // =========================================================================
    // 2. Public Documents List
    // =========================================================================

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void getPublicDocuments_AsAdmin_ShouldReturnList() throws Exception {
        AdminPublicDocumentItem item = AdminPublicDocumentItem.builder()
                .documentId(1)
                .title("Sample Doc")
                .ownerEmail("owner@test.com")
                .createdAt(Instant.now())
                .build();

        AdminPublicDocumentListResponse mockResponse = AdminPublicDocumentListResponse.builder()
                .items(Collections.singletonList(item))
                .page(0)
                .size(20)
                .totalItems(1)
                .totalPages(1)
                .build();

        when(adminService.getPublicDocuments(any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(mockResponse);

        mockMvc.perform(get("/api/admin/documents/public")
                        .param("search", "Sample")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items[0].documentId").value(1))
                .andExpect(jsonPath("$.data.items[0].title").value("Sample Doc"));
    }

    // =========================================================================
    // 3. Document Moderation Operations
    // =========================================================================

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void approveDocument_AsAdmin_ShouldSucceed() throws Exception {
        doNothing().when(adminService).approveDocument(1);

        mockMvc.perform(patch("/api/admin/documents/1/approve").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(adminService, times(1)).approveDocument(1);
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void rejectDocument_AsAdmin_ShouldSucceed() throws Exception {
        doNothing().when(adminService).rejectDocument(1);

        mockMvc.perform(patch("/api/admin/documents/1/reject").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(adminService, times(1)).rejectDocument(1);
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void unpublishDocument_AsAdmin_ShouldSucceed() throws Exception {
        doNothing().when(adminService).unpublishDocument(1);

        mockMvc.perform(patch("/api/admin/documents/1/unpublish").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(adminService, times(1)).unpublishDocument(1);
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void makeDocumentPending_AsAdmin_ShouldSucceed() throws Exception {
        doNothing().when(adminService).makeDocumentPending(1);

        mockMvc.perform(patch("/api/admin/documents/1/pending").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(adminService, times(1)).makeDocumentPending(1);
    }

    // =========================================================================
    // 4. Excel Export
    // =========================================================================

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void exportPublicDocuments_AsAdmin_ShouldReturnExcelStream() throws Exception {
        byte[] mockExcel = new byte[]{1, 2, 3, 4};
        when(adminService.exportPublicDocuments(any(), any(), any(), any())).thenReturn(mockExcel);

        mockMvc.perform(get("/api/admin/documents/public/export"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"public_documents.xlsx\""))
                .andExpect(content().contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(content().bytes(mockExcel));
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void getDashboardCharts_AsAdmin_ShouldReturn200() throws Exception {
        com.demo.ai_study_hub.dto.AdminDashboardChartsResponse response =
                com.demo.ai_study_hub.dto.AdminDashboardChartsResponse.builder()
                        .userTierDistribution(Collections.emptyList())
                        .documentApprovalStatus(Collections.emptyList())
                        .revenueByDay(Collections.emptyList())
                        .aiUsageByDay(Collections.emptyList())
                        .build();

        when(adminService.getDashboardCharts()).thenReturn(response);

        mockMvc.perform(get("/api/admin/dashboard/charts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void getAllPlans_AsAdmin_ShouldReturn200() throws Exception {
        when(adminService.getAllPlanConfigs()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/admin/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void getPlanDetails_AsAdmin_ShouldReturn200() throws Exception {
        com.demo.ai_study_hub.entity.PlanConfig mockPlan = com.demo.ai_study_hub.entity.PlanConfig.builder()
                .planCode("PREMIUM_1_MONTH")
                .planName("Premium")
                .price(199000L)
                .build();

        when(adminService.getPlanConfig("PREMIUM_1_MONTH")).thenReturn(mockPlan);

        mockMvc.perform(get("/api/admin/plans/PREMIUM_1_MONTH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.planCode").value("PREMIUM_1_MONTH"))
                .andExpect(jsonPath("$.data.planName").value("Premium"));
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void updatePlan_AsAdmin_ShouldReturn200() throws Exception {
        com.demo.ai_study_hub.entity.PlanConfig mockPlan = com.demo.ai_study_hub.entity.PlanConfig.builder()
                .planCode("PREMIUM_1_MONTH")
                .planName("Premium Renamed")
                .price(249000L)
                .build();

        when(adminService.updatePlanConfig(eq("PREMIUM_1_MONTH"), any())).thenReturn(mockPlan);

        String jsonRequest = "{\"planName\":\"Premium Renamed\",\"price\":249000,\"billingLabel\":\"1 month\"}";

        mockMvc.perform(put("/api/admin/plans/PREMIUM_1_MONTH")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonRequest)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.planName").value("Premium Renamed"))
                .andExpect(jsonPath("$.data.price").value(249000));
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void patchPlanStatus_AsAdmin_ShouldReturn200() throws Exception {
        com.demo.ai_study_hub.entity.PlanConfig mockPlan = com.demo.ai_study_hub.entity.PlanConfig.builder()
                .planCode("PREMIUM_1_MONTH")
                .status("ACTIVE")
                .build();

        when(adminService.patchPlanStatus(eq("PREMIUM_1_MONTH"), eq("ACTIVE"))).thenReturn(mockPlan);

        mockMvc.perform(patch("/api/admin/plans/PREMIUM_1_MONTH/status")
                        .param("status", "ACTIVE")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void exportPlanConfigs_AsAdmin_ShouldReturnExcelStream() throws Exception {
        byte[] mockExcel = new byte[]{5, 6, 7, 8};
        when(adminService.exportPlanConfigs()).thenReturn(mockExcel);

        mockMvc.perform(get("/api/admin/plans/export"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"plans_configuration.xlsx\""))
                .andExpect(content().contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(content().bytes(mockExcel));
    }
}
