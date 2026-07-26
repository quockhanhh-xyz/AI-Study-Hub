package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.AiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Embedding provider backed by the Google Gemini REST API.
 *
 * Best-effort contract: every method swallows failures and returns null / empty so that
 * {@link HybridDocumentChunkRetrievalService} can transparently fall back to keyword scoring.
 * Only activates when {@code ai.provider=gemini} and a non-blank API key is configured;
 * otherwise {@link #isAvailable()} is false and no network call is ever made.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiEmbeddingService implements EmbeddingService {

    private static final String EMBED_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:embedContent?key=%s";
    private static final String BATCH_EMBED_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:batchEmbedContents?key=%s";

    private final AiProperties aiProperties;

    @Override
    public boolean isAvailable() {
        if (!"gemini".equalsIgnoreCase(aiProperties.getProvider())) {
            return false;
        }
        String key = aiProperties.getGemini().getApiKey();
        return key != null && !key.isBlank();
    }

    @Override
    public String getModelName() {
        String model = aiProperties.getGemini().getEmbeddingModel();
        return (model == null || model.isBlank()) ? "none" : model;
    }

    @Override
    public float[] embed(String text) {
        if (!isAvailable() || text == null || text.isBlank()) {
            return null;
        }
        try {
            String model = getModelName();
            String url = String.format(EMBED_URL_TEMPLATE, model, aiProperties.getGemini().getApiKey());
            Map<String, Object> body = Map.of(
                    "model", "models/" + model,
                    "content", Map.of("parts", List.of(Map.of("text", truncate(text))))
            );
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient(url).post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            return parseEmbedding(response == null ? null : response.get("embedding"));
        } catch (Exception e) {
            log.warn("Embedding call failed (falling back to keyword). reason={}", sanitize(e.getMessage()));
            return null;
        }
    }

    @Override
    public List<float[]> embedBatch(List<String> texts) {
        if (!isAvailable() || texts == null || texts.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            String model = getModelName();
            String url = String.format(BATCH_EMBED_URL_TEMPLATE, model, aiProperties.getGemini().getApiKey());
            List<Map<String, Object>> requests = new ArrayList<>(texts.size());
            for (String text : texts) {
                requests.add(Map.of(
                        "model", "models/" + model,
                        "content", Map.of("parts", List.of(Map.of("text", truncate(text == null ? "" : text))))
                ));
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient(url).post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("requests", requests))
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                return Collections.emptyList();
            }
            Object embeddingsObj = response.get("embeddings");
            if (!(embeddingsObj instanceof List<?> embeddings)) {
                return Collections.emptyList();
            }
            List<float[]> result = new ArrayList<>(embeddings.size());
            for (Object item : embeddings) {
                result.add(parseValues(item));
            }
            return result;
        } catch (Exception e) {
            log.warn("Batch embedding call failed (falling back to keyword). reason={}", sanitize(e.getMessage()));
            return Collections.emptyList();
        }
    }

    // --- helpers ---

    private RestClient restClient(String url) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(aiProperties.getGemini().getConnectTimeoutMs());
        factory.setReadTimeout(aiProperties.getGemini().getReadTimeoutMs());
        return RestClient.builder().baseUrl(url).requestFactory(factory).build();
    }

    /**
     * Gemini embedding inputs are bounded; keep well under the model limit to avoid 400s.
     * Chunks are already small, but guard against oversized text defensively.
     */
    private String truncate(String text) {
        int max = 8000;
        return text.length() > max ? text.substring(0, max) : text;
    }

    /** Parse a single {"embedding": {"values": [...]}} node. */
    private float[] parseEmbedding(Object embeddingNode) {
        return parseValuesFromEmbeddingNode(embeddingNode);
    }

    /** Parse an item of the batch "embeddings" list: {"values": [...]}. */
    @SuppressWarnings("unchecked")
    private float[] parseValues(Object item) {
        if (!(item instanceof Map<?, ?> map)) {
            return null;
        }
        return toFloatArray(((Map<String, Object>) map).get("values"));
    }

    @SuppressWarnings("unchecked")
    private float[] parseValuesFromEmbeddingNode(Object embeddingNode) {
        if (!(embeddingNode instanceof Map<?, ?> map)) {
            return null;
        }
        return toFloatArray(((Map<String, Object>) map).get("values"));
    }

    private float[] toFloatArray(Object valuesObj) {
        if (!(valuesObj instanceof List<?> values) || values.isEmpty()) {
            return null;
        }
        float[] vec = new float[values.size()];
        for (int i = 0; i < values.size(); i++) {
            Object v = values.get(i);
            vec[i] = (v instanceof Number number) ? number.floatValue() : 0f;
        }
        return vec;
    }

    private String sanitize(String message) {
        if (message == null) {
            return "";
        }
        String apiKey = aiProperties.getGemini().getApiKey();
        if (apiKey != null && !apiKey.isBlank()) {
            return message.replace(apiKey, "******");
        }
        return message;
    }
}
