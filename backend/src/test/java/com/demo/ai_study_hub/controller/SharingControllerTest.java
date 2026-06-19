package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.service.SharingService;
import com.demo.ai_study_hub.service.JwtUtil;
import com.demo.ai_study_hub.service.UserDetailsServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SharingController.class)
class SharingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SharingService sharingService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    private DocumentShareResponse sampleDirectShareResponse;
    private GroupDocumentShareResponse sampleGroupShareResponse;

    @BeforeEach
    void setUp() {
        sampleDirectShareResponse = DocumentShareResponse.builder()
                .shareId(1)
                .documentId(10)
                .title("Lecture Slides")
                .fileType("pdf")
                .fileSize(1024L)
                .fileUrl("https://res.cloudinary.com/demo/image/upload/lecture.pdf")
                .sharedByEmail("owner@gmail.com")
                .sharedWithEmail("recipient@gmail.com")
                .permission("VIEW")
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .build();

        sampleGroupShareResponse = GroupDocumentShareResponse.builder()
                .shareId(1)
                .documentId(10)
                .title("Lecture Slides")
                .fileType("pdf")
                .fileSize(1024L)
                .fileUrl("https://res.cloudinary.com/demo/image/upload/lecture.pdf")
                .groupId(5)
                .sharedByEmail("owner@gmail.com")
                .permission("VIEW")
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void shareDocumentDirect_Success() throws Exception {
        when(sharingService.shareDocumentDirect(anyInt(), any(DocumentShareRequest.class), anyString()))
                .thenReturn(sampleDirectShareResponse);

        DocumentShareRequest request = new DocumentShareRequest("recipient@gmail.com");

        mockMvc.perform(post("/api/documents/10/shares/users")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Document shared successfully"))
                .andExpect(jsonPath("$.data.shareId").value(1))
                .andExpect(jsonPath("$.data.sharedWithEmail").value("recipient@gmail.com"));
    }

    @Test
    @WithMockUser(username = "recipient@gmail.com")
    void getSharedWithMe_Success() throws Exception {
        when(sharingService.getSharedWithMe(anyString()))
                .thenReturn(List.of(sampleDirectShareResponse));

        mockMvc.perform(get("/api/documents/shared-with-me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].shareId").value(1))
                .andExpect(jsonPath("$.data[0].title").value("Lecture Slides"));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void getDocumentShares_Success() throws Exception {
        when(sharingService.getDocumentShares(anyInt(), anyString()))
                .thenReturn(List.of(sampleDirectShareResponse));

        mockMvc.perform(get("/api/documents/10/shares"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].shareId").value(1));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void revokeDirectShare_Success() throws Exception {
        doNothing().when(sharingService).revokeDirectShare(anyInt(), anyString());

        mockMvc.perform(delete("/api/document-shares/1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Share revoked successfully"));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void shareDocumentToGroup_Success() throws Exception {
        when(sharingService.shareDocumentToGroup(anyInt(), any(GroupDocumentShareRequest.class), anyString()))
                .thenReturn(sampleGroupShareResponse);

        GroupDocumentShareRequest request = new GroupDocumentShareRequest(5);

        mockMvc.perform(post("/api/documents/10/shares/groups")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Document shared to group successfully"))
                .andExpect(jsonPath("$.data.groupId").value(5));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void getGroupDocuments_Success() throws Exception {
        when(sharingService.getGroupDocuments(anyInt(), anyString()))
                .thenReturn(List.of(sampleGroupShareResponse));

        mockMvc.perform(get("/api/groups/5/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].groupId").value(5));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void revokeGroupShare_Success() throws Exception {
        doNothing().when(sharingService).revokeGroupShare(anyInt(), anyString());

        mockMvc.perform(delete("/api/group-document-shares/1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Group share revoked successfully"));
    }
}
