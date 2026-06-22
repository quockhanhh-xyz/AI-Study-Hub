package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.service.FolderShareService;
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
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GroupFolderShareController.class)
class GroupFolderShareControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FolderShareService folderShareService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    private FolderShareResponse sampleResponse;

    @BeforeEach
    void setUp() {
        sampleResponse = FolderShareResponse.builder()
                .shareId(1)
                .folderId(10)
                .folderName("Test Folder")
                .groupId(50)
                .groupName("Test Group")
                .permission("VIEW")
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .canRevoke(true)
                .build();
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void shareFolderToGroup_Success() throws Exception {
        when(folderShareService.shareFolderToGroup(anyInt(), any(GroupFolderShareRequest.class), anyString()))
                .thenReturn(sampleResponse);

        GroupFolderShareRequest body = new GroupFolderShareRequest(50);

        mockMvc.perform(post("/api/folders/10/shares/groups")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Folder shared to group successfully"))
                .andExpect(jsonPath("$.data.shareId").value(1))
                .andExpect(jsonPath("$.data.groupId").value(50))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void shareFolderToGroup_Conflict() throws Exception {
        when(folderShareService.shareFolderToGroup(anyInt(), any(GroupFolderShareRequest.class), anyString()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Folder is already shared in this group"));

        GroupFolderShareRequest body = new GroupFolderShareRequest(50);

        mockMvc.perform(post("/api/folders/10/shares/groups")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Folder is already shared in this group"));
    }

    @Test
    @WithMockUser(username = "member@gmail.com")
    void getGroupFolders_Success() throws Exception {
        when(folderShareService.getGroupFolders(anyInt(), anyString()))
                .thenReturn(Collections.singletonList(sampleResponse));

        mockMvc.perform(get("/api/groups/50/folders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Group shared folders retrieved successfully"))
                .andExpect(jsonPath("$.data[0].shareId").value(1))
                .andExpect(jsonPath("$.data[0].groupId").value(50));
    }

    @Test
    @WithMockUser(username = "owner@gmail.com")
    void revokeGroupFolderShare_Success() throws Exception {
        doNothing().when(folderShareService).revokeGroupFolderShare(anyInt(), anyString());

        mockMvc.perform(delete("/api/group-folder-shares/1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Group folder share revoked successfully"));
    }
}
