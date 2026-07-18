package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.util.List;

@Data
public class AdminUserListResponse {
    private List<AdminUserItem> users;
    private int totalPages;
    private long totalElements;
    private int currentPage;
}
