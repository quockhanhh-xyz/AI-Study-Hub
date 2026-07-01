package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.AiProperties;
import com.demo.ai_study_hub.dto.AiAnswer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * Gemini AI provider using Spring RestClient to call the Gemini REST API.
 *
 * Rule:
 *   - If GEMINI_API_KEY is blank, throws 503 on every call.
 *   - Connect/read timeouts configured via AiProperties.
 *   - Never logs API key.
 *   - Never exposes raw provider error in response.
 *   - If provider returns token usage, use exact values; otherwise estimate.
 *
 * BE2 will implement the full Gemini integration.
 * This class is a stub that checks configuration and delegates.
 * When AI_PROVIDER=mock, this class is never called (see DefaultAiProviderRouter).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiAiProviderService implements AiProviderService {

    private static final String PROVIDER_NAME = "gemini";

    // Gemini generateContent endpoint template
    // Key is appended as query param, never logged
    private static final String GEMINI_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private final AiProperties aiProperties;

    @Override
    public AiAnswer call(String prompt, String modelName, int maxOutputTokens, double temperature) {
        String apiKey = aiProperties.getGemini().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gemini API key not configured. Returning 503.");
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI service is not configured");
        }

        String url = String.format(GEMINI_URL_TEMPLATE, modelName, apiKey);

        // Request body following Gemini generateContent API structure
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of(
                        "maxOutputTokens", maxOutputTokens,
                        "temperature", temperature
                )
        );

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(aiProperties.getGemini().getConnectTimeoutMs());
        requestFactory.setReadTimeout(aiProperties.getGemini().getReadTimeoutMs());

        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl(url)
                    .requestFactory(requestFactory)
                    .build();

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            return parseGeminiResponse(response, modelName, prompt);

        } catch (ResponseStatusException e) {
            throw e;
        } catch (RestClientException e) {
            log.error("Gemini API call failed: {}", sanitizeMessage(e.getMessage()));
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI service is temporarily unavailable");
        } catch (Exception e) {
            log.error("Unexpected error calling Gemini: {}", sanitizeMessage(e.getMessage()));
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI service is temporarily unavailable");
        }
    }

    private String sanitizeMessage(String message) {
        if (message == null) return "";
        String apiKey = aiProperties.getGemini().getApiKey();
        if (apiKey != null && !apiKey.isBlank()) {
            return message.replace(apiKey, "******");
        }
        return message;
    }

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @SuppressWarnings("unchecked")
    private AiAnswer parseGeminiResponse(Map<String, Object> response, String modelName, String prompt) {
        if (response == null) {
            log.error("Empty response from Gemini API");
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI service returned empty response");
        }

        try {
            // Extract answer text: response.candidates[0].content.parts[0].text
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "AI service returned no candidates");
            }
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String answerText = (String) parts.get(0).get("text");

            // Extract token usage if available
            Map<String, Object> usageMetadata = (Map<String, Object>) response.get("usageMetadata");
            boolean estimated = false;
            int inputTokens;
            int outputTokens;
            int totalTokens;

            if (usageMetadata != null) {
                inputTokens = toInt(usageMetadata.get("promptTokenCount"));
                outputTokens = toInt(usageMetadata.get("candidatesTokenCount"));
                totalTokens = toInt(usageMetadata.get("totalTokenCount"));
                if (totalTokens == 0) {
                    totalTokens = inputTokens + outputTokens;
                }
            } else {
                // Estimate from character counts
                inputTokens = Math.max(1, prompt.length() / 4);
                outputTokens = Math.max(1, (answerText != null ? answerText.length() : 0) / 4);
                totalTokens = inputTokens + outputTokens;
                estimated = true;
            }

            return AiAnswer.builder()
                    .text(answerText)
                    .provider(PROVIDER_NAME)
                    .modelName(modelName)
                    .inputTokens(inputTokens)
                    .outputTokens(outputTokens)
                    .totalTokens(totalTokens)
                    .tokenUsageEstimated(estimated)
                    .build();

        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", sanitizeMessage(e.getMessage()));
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI service returned invalid response");
        }
    }

    private int toInt(Object value) {
        if (value == null) return 0;
        if (value instanceof Number) return ((Number) value).intValue();
        return 0;
    }
}
