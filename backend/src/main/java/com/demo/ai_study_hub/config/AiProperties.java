package com.demo.ai_study_hub.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Strongly-typed binding of all AI-related properties from application.properties.
 * No AI config should ever be hardcoded in service/controller layers.
 *
 * Default profile: AI_PROVIDER=mock (no API key required).
 * Production profile: AI_PROVIDER=gemini + GEMINI_API_KEY env var.
 *
 * NOTE: per-tier quota values (daily question limit, max question chars,
 * max context chunks, max output tokens) are NOT configured here — they are
 * owned entirely by TierPolicyService as fixed, hardcoded values per tier.
 * This class only configures the AI *provider* (which model backs each tier,
 * API key, timeouts), never quota/business limits.
 */
@Configuration
@ConfigurationProperties(prefix = "ai")
@Getter
@Setter
public class AiProperties {

    /** Active provider: "mock" | "gemini" */
    private String provider = "mock";

    private Gemini gemini = new Gemini();
    private double temperature = 0.2;

    private Retrieval retrieval = new Retrieval();

    @Getter
    @Setter
    public static class Gemini {
        private String apiKey = "";
        private String freeModel = "gemini-2.5-flash-lite";
        private String premiumModel = "gemini-2.5-flash";
        private String ultraModel = "gemini-2.5-flash";
        private String fallbackModel = "gemini-2.5-pro";
        private int connectTimeoutMs = 5000;
        private int readTimeoutMs = 30000;

        /** Model used to embed chunks/questions for semantic retrieval. */
        private String embeddingModel = "text-embedding-004";
    }

    /**
     * Context-retrieval tuning. Defaults keep the ORIGINAL keyword-only behavior so
     * existing deployments are unaffected until embeddings are explicitly enabled.
     */
    @Getter
    @Setter
    public static class Retrieval {
        /**
         * Strategy: "keyword" (default, unchanged behavior) | "hybrid" (keyword + semantic).
         * Semantic scoring only activates when the strategy is "hybrid" AND an embedding
         * provider is available; otherwise the code always falls back to keyword.
         */
        private String strategy = "keyword";

        /** Weight of the (normalized) keyword score in hybrid fusion. */
        private double keywordWeight = 0.4;

        /** Weight of the cosine similarity in hybrid fusion. */
        private double embeddingWeight = 0.6;

        /** How many keyword candidates to pull before fusing with semantic scores. */
        private int candidatePoolSize = 50;

        /** Number of chunk texts sent per embedding batch request. */
        private int embeddingBatchSize = 50;
    }
}