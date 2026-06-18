package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.FolderRequest;
import com.demo.ai_study_hub.dto.FolderResponse;
import com.demo.ai_study_hub.service.FolderService;
import com.demo.ai_study_hub.service.JwtUtil;
import com.demo.ai_study_hub.service.UserDetailsServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.isNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * @WebMvcTest loads only FolderController and the web layer (no DB, no real services).
 * @MockBean JwtUtil + UserDetailsServiceImpl prevent JwtAuthFilter from crashing
 * when jwt.secret is absent from the test context.
 * .with(csrf()) is required on POST/PUT/DELETE to bypass the CSRF filter
 * that Spring Security test slice enables by default.
 */
@WebMvcTest(FolderController.class)
class FolderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FolderService folderService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    private FolderResponse sampleResponse;

    @BeforeEach
    void setUp() {
        sampleResponse = FolderResponse.builder()
                .folderId(1)
                .folderName("Test Folder")
                .description("Test description")
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // =========================================================================
    // TC1 — Create folder successfully → 200 OK
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void createFolder_Success() throws Exception {
        when(folderService.createFolder(any(), anyString()))
                .thenReturn(sampleResponse);

        FolderRequest body = new FolderRequest();
        body.setFolderName("Test Folder");
        body.setDescription("Test description");

        mockMvc.perform(post("/api/folders")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Folder created successfully"))
                .andExpect(jsonPath("$.data.folderId").value(1))
                .andExpect(jsonPath("$.data.folderName").value("Test Folder")) // FIX: name -> folderName
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    // =========================================================================
    // TC2 — Blank name fails @NotBlank validation → 400 Bad Request
    // .with(csrf()) is required; without it the request gets 403 before validation runs.
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void createFolder_Failed_NameEmpty() throws Exception {
        FolderRequest badBody = new FolderRequest();
        badBody.setFolderName("");
        badBody.setDescription("Some description");

        mockMvc.perform(post("/api/folders")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badBody)))
                .andExpect(status().isBadRequest());

        verify(folderService, never()).createFolder(any(), any());
    }

    // =========================================================================
    // TC3 — Retrieve folder list → 200 OK, verify each element
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void getMyFolders_Success() throws Exception {
        FolderResponse second = FolderResponse.builder()
                .folderId(2)
                .folderName("Exam Notes")
                .status("ACTIVE")
                .build();

        when(folderService.getMyFolders(isNull(), any(), anyString()))
                .thenReturn(List.of(sampleResponse, second));

        mockMvc.perform(get("/api/folders/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].folderId").value(1))
                .andExpect(jsonPath("$.data[0].folderName").value("Test Folder")) // FIX: name -> folderName
                .andExpect(jsonPath("$.data[1].folderId").value(2))
                .andExpect(jsonPath("$.data[1].folderName").value("Exam Notes")); // FIX: name -> folderName
    }

    // =========================================================================
    // TC4 — Folder detail → 200 OK with full fields
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void getFolderDetail_Success() throws Exception {
        when(folderService.getFolderDetail(anyInt(), anyString()))
                .thenReturn(sampleResponse);

        mockMvc.perform(get("/api/folders/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.folderId").value(1))
                .andExpect(jsonPath("$.data.folderName").value("Test Folder")) // FIX: name -> folderName
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    // =========================================================================
    // TC5 — Folder not found → service throws 404 → response 404
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void getFolderDetail_NotFound() throws Exception {
        when(folderService.getFolderDetail(anyInt(), anyString()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));

        mockMvc.perform(get("/api/folders/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Folder not found"));
    }

    // =========================================================================
    // TC6 — Update folder successfully → 200 OK with updated name
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void updateFolder_Success() throws Exception {
        FolderResponse updated = FolderResponse.builder()
                .folderId(1)
                .folderName("Updated Name")
                .description("Updated description")
                .status("ACTIVE")
                .build();

        when(folderService.updateFolder(anyInt(), any(), anyString()))
                .thenReturn(updated);

        FolderRequest body = new FolderRequest();
        body.setFolderName("Updated Name");
        body.setDescription("Updated description");

        mockMvc.perform(put("/api/folders/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Folder updated successfully"))
                .andExpect(jsonPath("$.data.folderName").value("Updated Name")); // FIX: name -> folderName
    }

    // =========================================================================
    // TC7 — Delete empty folder → 200 OK
    // The service requires the folder to be empty (no active documents or
    // subfolders) before soft-deleting it.
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void deleteFolder_Success() throws Exception {
        doNothing().when(folderService).deleteFolder(anyInt(), anyString());

        mockMvc.perform(delete("/api/folders/1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Folder deleted successfully"));
    }
}
