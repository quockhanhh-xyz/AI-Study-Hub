package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.DocumentDownloadInfo;
import com.demo.ai_study_hub.dto.PublicDocumentResponse;
import com.demo.ai_study_hub.controller.AdminDocumentController;
import com.demo.ai_study_hub.service.AdminDocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminDocumentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AdminDocumentService adminDocumentService;

    @InjectMocks
    private AdminDocumentController adminDocumentController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(adminDocumentController).build();
    }

    @Test
    void getDocumentDetail_Success() throws Exception {
        PublicDocumentResponse res = PublicDocumentResponse.builder()
                .documentId(1)
                .title("Test Doc")
                .build();

        when(adminDocumentService.getAdminDocumentDetail(1)).thenReturn(res);

        mockMvc.perform(get("/api/admin/documents/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.documentId").value(1))
                .andExpect(jsonPath("$.data.title").value("Test Doc"));
    }

    @Test
    void previewDocument_Success() throws Exception {
        DocumentDownloadInfo info = new DocumentDownloadInfo();
        info.setFileUrl("http://example.com/file.pdf");
        info.setFileName("file.pdf");
        info.setContentType("application/pdf");

        when(adminDocumentService.getAdminDocumentDownloadInfo(1)).thenReturn(info);

        mockMvc.perform(get("/api/admin/documents/1/preview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fileUrl").value("http://example.com/file.pdf"));
    }
}
