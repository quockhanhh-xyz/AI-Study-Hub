package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.util.List;

@Data
public class AdminAiUsageListResponse {
    private List<AdminAiUsageItem> usages;
    private int totalPages;
    private long totalElements;
    private int currentPage;
}
