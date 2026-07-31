package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentSharingInfoResponse {
    private List<DocumentShareResponse> userShares;
    private List<GroupDocumentShareResponse> groupShares;
}
