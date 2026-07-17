package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.util.List;

@Data
public class AdminSubjectListResponse {
    private List<AdminSubjectItem> subjects;
    private int totalPages;
    private long totalElements;
    private int currentPage;
}
