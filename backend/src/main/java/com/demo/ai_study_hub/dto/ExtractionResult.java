package com.demo.ai_study_hub.dto;

import com.demo.ai_study_hub.entity.ProcessingStatus;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractionResult {
    private String extractedText;
    private ProcessingStatus status;
    private String error;
    private List<ExtractedChunk> chunks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtractedChunk {
        private Integer chunkIndex;
        private String chunkText;
        private Integer characterCount;
        private Integer pageNumber;
        private String sourceLabel;
        private Integer startOffset;
        private Integer endOffset;
    }
}
