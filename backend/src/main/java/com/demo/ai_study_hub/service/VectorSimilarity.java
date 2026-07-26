package com.demo.ai_study_hub.service;

/**
 * Small numeric helpers for semantic retrieval. Pure functions, no state.
 */
public final class VectorSimilarity {

    private VectorSimilarity() {
    }

    /**
     * Cosine similarity of two vectors, in [-1, 1].
     * Returns 0.0 when either vector is null, empty, has a different length, or has zero norm.
     */
    public static double cosine(float[] a, float[] b) {
        if (a == null || b == null || a.length == 0 || a.length != b.length) {
            return 0.0;
        }
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < a.length; i++) {
            dot += (double) a[i] * b[i];
            normA += (double) a[i] * a[i];
            normB += (double) b[i] * b[i];
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
