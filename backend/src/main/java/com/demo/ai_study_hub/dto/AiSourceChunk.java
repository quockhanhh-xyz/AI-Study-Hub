package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Source chunk reference included in AI answer responses.
 * Points to the specific document chunk used as context.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSourceChunk {

    /** Sequential index of the chunk within the document (0-based). */
    private Integer chunkIndex;

    /** Human-readable label, e.g. "Chunk 1", "Page 2". */
    private String sourceLabel;

    private Integer documentId;
    private String documentTitle;
    private String sourceLibrary; // "My Library" or "Community Library"
}
