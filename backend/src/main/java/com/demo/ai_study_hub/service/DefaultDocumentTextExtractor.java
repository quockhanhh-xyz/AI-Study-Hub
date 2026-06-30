package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.ProcessingStatus;

public class DefaultDocumentTextExtractor implements DocumentTextExtractor {

    @Override
    public ExtractionResult extract(Document doc) {
        // Fallback implementation: always return UNSUPPORTED to prevent writing fake completed data
        return ExtractionResult.builder()
                .status(ProcessingStatus.UNSUPPORTED)
                .error("Text extraction not implemented yet (Default fallback).")
                .originalCharacterCount(0)
                .isTruncated(false)
                .build();
    }
}
