package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.entity.ProcessingStatus;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class DocumentProcessingEvent extends ApplicationEvent {
    private final Integer documentId;
    private final ProcessingStatus previousStatus;

    public DocumentProcessingEvent(Object source, Integer documentId, ProcessingStatus previousStatus) {
        super(source);
        this.documentId = documentId;
        this.previousStatus = previousStatus;
    }
}
