package com.demo.ai_study_hub.dto;

import lombok.Data;
import java.util.List;

@Data
public class AdminPaymentListResponse {
    private List<AdminPaymentItem> payments;
    private int totalPages;
    private long totalElements;
    private int currentPage;
}
