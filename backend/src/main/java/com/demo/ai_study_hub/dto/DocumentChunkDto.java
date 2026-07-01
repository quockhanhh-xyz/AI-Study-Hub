package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Internal DTO representing a document chunk retrieved for AI context.
 * Used internally between retrieval, prompt-building, and AI service layers.
 * Not exposed directly in API responses (use AiSourceChunk for that).
 *
 * NOTE: Entity class is com.demo.ai_study_hub.entity.DocumentChunk.
 * This DTO is named DocumentChunkDto to avoid class name collision.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChunkDto {


    /** Database ID of this chunk */
    private Long chunkId;

    /** Sequential index of the chunk within the document (0-based) */
    private Integer chunkIndex;

    /** Full text content of this chunk */
    private String chunkText;

    /** Page number if available (PDF), or null */
    private Integer pageNumber;

    /** Human-readable label, e.g. "Chunk 1", "Page 2" */
    private String sourceLabel;

    /** Keyword relevance score (used for sorting, not returned in API) */
    private double score;
}
