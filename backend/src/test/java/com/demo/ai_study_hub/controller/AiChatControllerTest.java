package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.AiAskRequest;
import com.demo.ai_study_hub.dto.AiAskResponse;
import com.demo.ai_study_hub.dto.AiChatHistoryResponse;
import com.demo.ai_study_hub.dto.AiUsageSummaryResponse;
import com.demo.ai_study_hub.service.AiChatService;
import com.demo.ai_study_hub.service.JwtUtil;
import com.demo.ai_study_hub.service.UserDetailsServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AiChatController.class)
class AiChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AiChatService aiChatService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @MockBean
    private com.demo.ai_study_hub.repository.UserRepository userRepository;

    // =========================================================================
    // 1. Chưa login bị 401
    // =========================================================================
    @Test
    void ask_WithoutLogin_ShouldReturn401() throws Exception {
        AiAskRequest request = new AiAskRequest();
        request.setQuestion("Test question");

        mockMvc.perform(post("/api/ai/documents/1/ask")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // 2. Login & Validation (Question blank) -> 400
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void ask_WithBlankQuestion_ShouldReturn400() throws Exception {
        AiAskRequest request = new AiAskRequest();
        request.setQuestion("");

        mockMvc.perform(post("/api/ai/documents/1/ask")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // 3. Ask successfully -> 200
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void ask_Success_ShouldReturn200() throws Exception {
        AiAskResponse response = AiAskResponse.builder()
                .answer("This is mock answer")
                .sourceChunks(Collections.emptyList())
                .provider("mock")
                .modelName("mock")
                .inputTokens(10)
                .outputTokens(20)
                .totalTokens(30)
                .tokenUsageEstimated(true)
                .remainingQuestions(2)
                .build();

        when(aiChatService.ask(anyInt(), anyString(), anyString())).thenReturn(response);

        AiAskRequest request = new AiAskRequest();
        request.setQuestion("Valid question");

        mockMvc.perform(post("/api/ai/documents/1/ask")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.answer").value("This is mock answer"))
                .andExpect(jsonPath("$.data.provider").value("mock"))
                .andExpect(jsonPath("$.data.remainingQuestions").value(2));
    }

    // =========================================================================
    // 4. Get chat history successfully -> 200
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void getChatHistory_Success_ShouldReturn200() throws Exception {
        AiChatHistoryResponse response = AiChatHistoryResponse.builder()
                .sessionId(100L)
                .documentId(1)
                .messages(Collections.emptyList())
                .build();

        when(aiChatService.getChatHistory(anyInt(), anyString())).thenReturn(response);

        mockMvc.perform(get("/api/ai/documents/1/chats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").value(100))
                .andExpect(jsonPath("$.data.documentId").value(1));
    }

    // =========================================================================
    // 5. Delete chat successfully -> 200
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void deleteChat_Success_ShouldReturn200() throws Exception {
        doNothing().when(aiChatService).deleteChat(anyLong(), anyString());

        mockMvc.perform(delete("/api/ai/chats/100")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Chat session deleted successfully"));
    }

    // =========================================================================
    // 6. Get usage successfully -> 200
    // =========================================================================
    @Test
    @WithMockUser(username = "test@gmail.com")
    void getMyUsage_Success_ShouldReturn200() throws Exception {
        AiUsageSummaryResponse response = AiUsageSummaryResponse.builder()
                .tier("FREE")
                .dailyLimit(3)
                .usedToday(1)
                .remainingQuestions(2)
                .provider("mock")
                .modelName("mock")
                .build();

        when(aiChatService.getUsageSummary(anyString())).thenReturn(response);

        mockMvc.perform(get("/api/ai/usage/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tier").value("FREE"))
                .andExpect(jsonPath("$.data.dailyLimit").value(3))
                .andExpect(jsonPath("$.data.usedToday").value(1))
                .andExpect(jsonPath("$.data.remainingQuestions").value(2));
    }
}
