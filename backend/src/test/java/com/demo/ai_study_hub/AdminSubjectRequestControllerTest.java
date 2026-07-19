package com.demo.ai_study_hub;

import com.demo.ai_study_hub.entity.SubjectRequest;
import com.demo.ai_study_hub.controller.AdminSubjectRequestController;
import com.demo.ai_study_hub.service.SubjectRequestService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.security.Principal;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminSubjectRequestControllerTest {

    private MockMvc mockMvc;

    @Mock
    private SubjectRequestService subjectRequestService;

    @InjectMocks
    private AdminSubjectRequestController adminSubjectRequestController;

    private Principal mockPrincipal;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(adminSubjectRequestController).build();
        mockPrincipal = () -> "admin@test.com";
    }

    @Test
    void getAllRequests_Success() throws Exception {
        SubjectRequest req = new SubjectRequest();
        req.setRequestId(1);

        when(subjectRequestService.getAllSubjectRequests()).thenReturn(Collections.singletonList(req));

        mockMvc.perform(get("/api/admin/subject-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].requestId").value(1));
    }

    @Test
    void approveRequest_Success() throws Exception {
        SubjectRequest req = new SubjectRequest();
        req.setRequestId(1);
        req.setStatus("APPROVED");

        when(subjectRequestService.approveRequest(1, "admin@test.com")).thenReturn(req);

        mockMvc.perform(patch("/api/admin/subject-requests/1/approve")
                .principal(mockPrincipal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test
    void rejectRequest_Success() throws Exception {
        Map<String, String> body = new HashMap<>();
        body.put("rejectReason", "Not needed");

        SubjectRequest req = new SubjectRequest();
        req.setRequestId(1);
        req.setStatus("REJECTED");
        req.setRejectReason("Not needed");

        when(subjectRequestService.rejectRequest(1, "Not needed", "admin@test.com")).thenReturn(req);

        mockMvc.perform(patch("/api/admin/subject-requests/1/reject")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectReason").value("Not needed"));
    }

    @Test
    void exportSubjectRequests_Success() throws Exception {
        byte[] dummyData = "dummy excel data".getBytes();
        when(subjectRequestService.exportSubjectRequests()).thenReturn(dummyData);

        mockMvc.perform(get("/api/admin/subject-requests/export"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(content().bytes(dummyData));
    }
}
