package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.DocumentDownloadInfo;
import com.demo.ai_study_hub.dto.PublicDocumentResponse;
import com.demo.ai_study_hub.dto.SubjectResponse;
import com.demo.ai_study_hub.service.DocumentService;
import com.demo.ai_study_hub.service.SubjectService;
import com.demo.ai_study_hub.service.JwtUtil;
import com.demo.ai_study_hub.service.UserDetailsServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import com.demo.ai_study_hub.config.SecurityConfig;
import com.demo.ai_study_hub.config.CorsConfig;
import com.demo.ai_study_hub.config.JwtAuthenticationEntryPoint;
import com.demo.ai_study_hub.config.CustomAccessDeniedHandler;
import org.springframework.context.annotation.Import;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({DocumentController.class, SubjectController.class})
@Import({SecurityConfig.class, CorsConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class PublicSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DocumentService documentService;

    @MockBean
    private SubjectService subjectService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void getPublicDocuments_AsGuest_ShouldReturn200AndCleanData() throws Exception {
        PublicDocumentResponse publicDoc = PublicDocumentResponse.builder()
                .documentId(25)
                .title("Public Physics PDF")
                .description("Public document desc")
                .subjectCode("PHYS101")
                .subjectName("Introduction to Physics")
                .fileType("PDF")
                .fileSize(1024L)
                .fileUrl("https://cloudinary.com/guide.pdf")
                .viewCount(10L)
                .downloadCount(5L)
                .ownerName("John Doe")
                .canPreview(true)
                .canOpen(true)
                .canDownload(true)
                .build();

        when(documentService.getPublicDocuments(any(), any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(publicDoc));

        mockMvc.perform(get("/api/documents/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].documentId").value(25))
                .andExpect(jsonPath("$.data[0].title").value("Public Physics PDF"))
                .andExpect(jsonPath("$.data[0].ownerName").value("John Doe"))
                .andExpect(jsonPath("$.data[0].uploadedBy").doesNotExist())
                .andExpect(jsonPath("$.data[0].publicId").doesNotExist())
                .andExpect(jsonPath("$.data[0].ownerId").doesNotExist())
                .andExpect(jsonPath("$.data[0].fileUrl").value("https://cloudinary.com/guide.pdf"));
    }

    @Test
    void getPublicDocumentDetail_AsGuest_ShouldReturn200AndCleanData() throws Exception {
        PublicDocumentResponse publicDoc = PublicDocumentResponse.builder()
                .documentId(25)
                .title("Public Physics PDF")
                .description("Public document desc")
                .subjectCode("PHYS101")
                .subjectName("Introduction to Physics")
                .fileType("PDF")
                .fileSize(1024L)
                .fileUrl("https://cloudinary.com/guide.pdf")
                .viewCount(11L)
                .downloadCount(5L)
                .ownerName("John Doe")
                .canPreview(true)
                .canOpen(true)
                .canDownload(true)
                .build();

        when(documentService.getPublicDocumentDetail(25, null)).thenReturn(publicDoc);

        mockMvc.perform(get("/api/documents/public/25"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.documentId").value(25))
                .andExpect(jsonPath("$.data.uploadedBy").doesNotExist())
                .andExpect(jsonPath("$.data.publicId").doesNotExist())
                .andExpect(jsonPath("$.data.ownerId").doesNotExist())
                .andExpect(jsonPath("$.data.fileUrl").value("https://cloudinary.com/guide.pdf"));
    }

    @Test
    void getPublicSubjects_AsGuest_ShouldReturn200AndNoOwnerId() throws Exception {
        SubjectResponse publicSubject = SubjectResponse.builder()
                .subjectId(1)
                .subjectCode("PHYS101")
                .subjectName("Physics I")
                .description("Mechanics")
                .scope("SYSTEM")
                .ownerId(null)
                .build();

        when(subjectService.getPublicSubjects()).thenReturn(Collections.singletonList(publicSubject));

        mockMvc.perform(get("/api/subjects/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].subjectId").value(1))
                .andExpect(jsonPath("$.data[0].subjectCode").value("PHYS101"))
                .andExpect(jsonPath("$.data[0].ownerId").isEmpty());
    }

    @Test
    void publishDocument_AsGuest_ShouldReturn401() throws Exception {
        mockMvc.perform(put("/api/documents/25/publish").with(csrf()))
                .andExpect(status().isUnauthorized());

        verify(documentService, never()).publishDocument(anyInt(), anyString());
    }

    @Test
    void unpublishDocument_AsGuest_ShouldReturn401() throws Exception {
        mockMvc.perform(put("/api/documents/25/unpublish").with(csrf()))
                .andExpect(status().isUnauthorized());

        verify(documentService, never()).unpublishDocument(anyInt(), anyString());
    }

    @Test
    void downloadPublicDocument_OnDownloadFailure_ShouldNotIncrementCount() throws Exception {
        DocumentDownloadInfo info = DocumentDownloadInfo.builder()
                .fileUrl("http://invalid-nonexistent-url-domain.xyz/file.pdf")
                .fileName("test.pdf")
                .contentType("application/pdf")
                .build();

        when(documentService.getPublicDocumentDownloadInfo(25)).thenReturn(info);

        mockMvc.perform(get("/api/documents/public/25/download"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));

        verify(documentService, never()).incrementDownloadCount(25);
    }
}