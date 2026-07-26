package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.VectorSimilarity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VectorSimilarityTest {

    @Test
    void identicalVectorsHaveCosineOne() {
        float[] v = {1f, 2f, 3f};
        assertEquals(1.0, VectorSimilarity.cosine(v, v), 1e-6);
    }

    @Test
    void orthogonalVectorsHaveCosineZero() {
        assertEquals(0.0, VectorSimilarity.cosine(new float[]{1f, 0f}, new float[]{0f, 1f}), 1e-6);
    }

    @Test
    void oppositeVectorsHaveCosineMinusOne() {
        assertEquals(-1.0, VectorSimilarity.cosine(new float[]{1f, 1f}, new float[]{-1f, -1f}), 1e-6);
    }

    @Test
    void mismatchedLengthReturnsZero() {
        assertEquals(0.0, VectorSimilarity.cosine(new float[]{1f, 2f}, new float[]{1f, 2f, 3f}));
    }

    @Test
    void nullOrEmptyReturnsZero() {
        assertEquals(0.0, VectorSimilarity.cosine(null, new float[]{1f}));
        assertEquals(0.0, VectorSimilarity.cosine(new float[]{1f}, null));
        assertEquals(0.0, VectorSimilarity.cosine(new float[]{}, new float[]{}));
    }

    @Test
    void zeroNormReturnsZero() {
        assertEquals(0.0, VectorSimilarity.cosine(new float[]{0f, 0f}, new float[]{1f, 1f}));
    }
}
