package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.config.CorsConfig;
import com.demo.ai_study_hub.config.CustomAccessDeniedHandler;
import com.demo.ai_study_hub.config.JwtAuthenticationEntryPoint;
import com.demo.ai_study_hub.config.SecurityConfig;
import com.demo.ai_study_hub.dto.DocumentContentResponse;
import com.demo.ai_study_hub.dto.DocumentProcessingStatusResponse;
import com.demo.ai_study_hub.service.DocumentProcessingService;
import com.demo.ai_study_hub.service.JwtUtil;
import com.demo.ai_study_hub.service.UserDetailsServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DocumentProcessingController.class)
@Import({SecurityConfig.class, CorsConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class DocumentProcessingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DocumentProcessingService documentProcessingService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void processDocument_WhenSucceed_ShouldReturn202Accepted() throws Exception {
        DocumentProcessingStatusResponse mockResponse = DocumentProcessingStatusResponse.builder()
                .documentId(10)
                .processingStatus("PROCESSING")
                .build();

        when(documentProcessingService.startProcessing(anyInt(), anyString())).thenReturn(mockResponse);

        mockMvc.perform(post("/api/documents/10/process")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Document processing started"))
                .andExpect(jsonPath("$.data.processingStatus").value("PROCESSING"));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void processDocument_WhenConflict_ShouldReturn409() throws Exception {
        when(documentProcessingService.startProcessing(anyInt(), anyString()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Document is already being processed"));

        mockMvc.perform(post("/api/documents/10/process")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Document is already being processed"));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void processDocument_WhenCapacityExceeded_ShouldReturn503() throws Exception {
        when(documentProcessingService.startProcessing(anyInt(), anyString()))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Server is busy. Please try again later."));

        mockMvc.perform(post("/api/documents/10/process")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Server is busy. Please try again later."));
    }

    @Test
    @WithMockUser(username = "other@gmail.com")
    void processDocument_WhenForbidden_ShouldReturn403() throws Exception {
        when(documentProcessingService.startProcessing(anyInt(), anyString()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not the owner of this document"));

        mockMvc.perform(post("/api/documents/10/process")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You are not the owner of this document"));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void getProcessingStatus_WhenSucceed_ShouldReturn200() throws Exception {
        DocumentProcessingStatusResponse mockResponse = DocumentProcessingStatusResponse.builder()
                .documentId(10)
                .processingStatus("COMPLETED")
                .build();

        when(documentProcessingService.getProcessingStatus(anyInt(), anyString())).thenReturn(mockResponse);

        mockMvc.perform(get("/api/documents/10/processing-status")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Document processing status retrieved"))
                .andExpect(jsonPath("$.data.processingStatus").value("COMPLETED"));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void getExtractedContent_WhenSucceed_ShouldReturn200() throws Exception {
        DocumentContentResponse mockResponse = DocumentContentResponse.builder()
                .documentId(10)
                .extractedText("Full raw text content")
                .build();

        when(documentProcessingService.getExtractedContent(anyInt(), anyString())).thenReturn(mockResponse);

        mockMvc.perform(get("/api/documents/10/content")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Document extracted content retrieved"))
                .andExpect(jsonPath("$.data.extractedText").value("Full raw text content"));
    }
}
