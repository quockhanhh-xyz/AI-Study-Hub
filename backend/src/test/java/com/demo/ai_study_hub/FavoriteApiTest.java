package com.demo.ai_study_hub;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
public class FavoriteApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Test
    public void testUnauthorized() throws Exception {
        // 1. Unauthorized (No token)
        System.out.println("TEST 1: Unauthorized");
        mockMvc.perform(post("/api/documents/1/favorite"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    public void testAdminForbidden() throws Exception {
        System.out.println("TEST 2: Admin Access Forbidden");
        mockMvc.perform(post("/api/documents/1/favorite"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "favtest@test.com", roles = {"USER"})
    public void testUserFavoriteFlow() throws Exception {
        System.out.println("TEST 3: User Favorite Flow");
        // Setup user and doc
        User user = new User();
        user.setEmail("favtest@test.com");
        user.setFullName("Fav Test");
        user.setPasswordHash("hash");
        user.setRole("USER");
        user.setStatus("ACTIVE");
        user.setCreatedAt(LocalDateTime.now());
        userRepository.save(user);

        Document doc = new Document();
        doc.setTitle("Test Doc");
        doc.setVisibility("PUBLIC");
        doc.setApprovalStatus("APPROVED");
        doc.setStatus("ACTIVE");
        doc.setOwner(user);
        doc.setFileSize(1024L);
        doc.setFileType("pdf");
        doc.setFileUrl("http://example.com/file.pdf");
        doc.setOriginalFileName("file.pdf");
        doc.setPublicId("/some/path/file.pdf");
        doc.setCreatedAt(LocalDateTime.now());
        documentRepository.save(doc);

        Integer docId = doc.getDocumentId();

        // Favorite the document
        mockMvc.perform(post("/api/documents/" + docId + "/favorite"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", containsString("added")));

        // Favorite the document AGAIN (should be idempotent or return 200 without duplicate)
        mockMvc.perform(post("/api/documents/" + docId + "/favorite"))
                .andExpect(status().isOk());

        // Get favorites
        mockMvc.perform(get("/api/documents/favorites"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].documentId", is(docId)));

        // Unfavorite the document
        mockMvc.perform(delete("/api/documents/" + docId + "/favorite"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", containsString("removed")));

        // Unfavorite the document AGAIN
        mockMvc.perform(delete("/api/documents/" + docId + "/favorite"))
                .andExpect(status().isOk());

        // Get favorites again
        mockMvc.perform(get("/api/documents/favorites"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }
}
