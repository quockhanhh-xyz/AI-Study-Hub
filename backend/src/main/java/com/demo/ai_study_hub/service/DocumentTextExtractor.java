package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.entity.Document;

public interface DocumentTextExtractor {
    ExtractionResult extract(Document doc);
}
