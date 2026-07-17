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
public class AdminPublicDocumentListResponse {
    private List<AdminPublicDocumentItem> items;
    private int page;
    private int size;
    private long totalItems;
    private int totalPages;
}
