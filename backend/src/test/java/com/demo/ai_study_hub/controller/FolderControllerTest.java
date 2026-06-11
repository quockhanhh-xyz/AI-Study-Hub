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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * @WebMvcTest — chỉ load FolderController và web layer.
 * Không load DB, không load @Service/@Repository thật.
 *
 * @MockBean JwtUtil + UserDetailsServiceImpl để JwtAuthFilter load được
 * mà không crash vì thiếu @Value("${jwt.secret}") trong test context.
 *
 * .with(csrf()) bắt buộc với POST/PUT/DELETE để bypass CSRF filter
 * mà @WebMvcTest bật theo default của Spring Security test slice.
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
                .name("Test Folder")
                .description("Test description")
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // =========================================================================
    // TC1 — Tạo folder thành công → 201 Created
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void createFolder_Success() throws Exception {
        when(folderService.createFolder(any(), anyString()))
                .thenReturn(sampleResponse);

        FolderRequest body = new FolderRequest();
        body.setName("Test Folder");
        body.setDescription("Test description");

        mockMvc.perform(post("/api/folders")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Folder created successfully"))
                .andExpect(jsonPath("$.data.folderId").value(1))
                .andExpect(jsonPath("$.data.name").value("Test Folder"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    // =========================================================================
    // TC2 — name rỗng → @NotBlank chặn → 400 Bad Request
    // .with(csrf()) bắt buộc: không có sẽ bị 403 trước khi validation chạy.
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void createFolder_Failed_NameEmpty() throws Exception {
        FolderRequest badBody = new FolderRequest();
        badBody.setName("");
        badBody.setDescription("Some description");

        mockMvc.perform(post("/api/folders")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badBody)))
                .andExpect(status().isBadRequest());

        verify(folderService, never()).createFolder(any(), any());
    }

    // =========================================================================
    // TC3 — Lấy danh sách folder → 200 OK, kiểm tra từng phần tử trong list
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void getMyFolders_Success() throws Exception {
        FolderResponse second = FolderResponse.builder()
                .folderId(2)
                .name("Exam Notes")
                .status("ACTIVE")
                .build();

        when(folderService.getMyFolders(anyString()))
                .thenReturn(List.of(sampleResponse, second));

        mockMvc.perform(get("/api/folders/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].folderId").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Test Folder"))
                .andExpect(jsonPath("$.data[1].folderId").value(2))
                .andExpect(jsonPath("$.data[1].name").value("Exam Notes"));
    }

    // =========================================================================
    // TC4 — Chi tiết folder thành công → 200 OK + đầy đủ fields
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
                .andExpect(jsonPath("$.data.name").value("Test Folder"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    // =========================================================================
    // TC5 — Folder không tồn tại → service ném 404 → response 404
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
    // TC6 — Cập nhật folder thành công → 200 OK + name đã đổi
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void updateFolder_Success() throws Exception {
        FolderResponse updated = FolderResponse.builder()
                .folderId(1)
                .name("Updated Name")
                .description("Updated description")
                .status("ACTIVE")
                .build();

        when(folderService.updateFolder(anyInt(), any(), anyString()))
                .thenReturn(updated);

        FolderRequest body = new FolderRequest();
        body.setName("Updated Name");
        body.setDescription("Updated description");

        mockMvc.perform(put("/api/folders/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Folder updated successfully"))
                .andExpect(jsonPath("$.data.name").value("Updated Name"));
    }

    // =========================================================================
    // TC7 — Xóa folder rỗng thành công → 200 OK
    // doNothing() cho void method, không dùng when().thenReturn()
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void deleteFolder_Success_EmptyFolder() throws Exception {
        doNothing().when(folderService).deleteFolder(anyInt(), anyString());

        mockMvc.perform(delete("/api/folders/1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Folder deleted successfully"));
    }

    // =========================================================================
    // TC8 — Xóa folder còn file → service ném 400 → response 400 + message đúng
    // doThrow() cho void method, không dùng when().thenThrow()
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void deleteFolder_Failed_NotEmpty() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Folder must be empty before deleting"))
                .when(folderService).deleteFolder(anyInt(), anyString());

        mockMvc.perform(delete("/api/folders/1")
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Folder must be empty before deleting"));
    }
}
