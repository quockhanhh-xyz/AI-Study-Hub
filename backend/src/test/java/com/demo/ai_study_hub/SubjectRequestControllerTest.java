package com.demo.ai_study_hub;

import com.demo.ai_study_hub.entity.SubjectRequest;
import com.demo.ai_study_hub.dto.CreateSubjectRequest;
import com.demo.ai_study_hub.dto.SubjectRequestResponse;
import com.demo.ai_study_hub.controller.SubjectRequestController;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SubjectRequestControllerTest {

    private MockMvc mockMvc;

    @Mock
    private SubjectRequestService subjectRequestService;

    @InjectMocks
    private SubjectRequestController subjectRequestController;

    private Principal mockPrincipal;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(subjectRequestController).build();
        mockPrincipal = () -> "user@test.com";
    }

    @Test
    void createRequest_Success() throws Exception {
        CreateSubjectRequest body = new CreateSubjectRequest();
        body.setRequestedCode("CS101");
        body.setRequestedName("Comp Sci");
        body.setDescription("Desc");
        body.setSchoolId(1);
        body.setMajorId(2);

        SubjectRequestResponse req = new SubjectRequestResponse();
        req.setRequestId(1);
        req.setRequestedCode("CS101");
        req.setStatus("PENDING");

        when(subjectRequestService.createSubjectRequest(any(CreateSubjectRequest.class), eq("user@test.com"))).thenReturn(req);

        mockMvc.perform(post("/api/subject-requests")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requestedCode").value("CS101"));
    }

    @Test
    void getMyRequests_Success() throws Exception {
        SubjectRequestResponse req = new SubjectRequestResponse();
        req.setRequestId(1);
        req.setRequestedCode("CS101");

        when(subjectRequestService.getMySubjectRequests("user@test.com")).thenReturn(Collections.singletonList(req));

        mockMvc.perform(get("/api/subject-requests/my")
                .principal(mockPrincipal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].requestedCode").value("CS101"));
    }
}
