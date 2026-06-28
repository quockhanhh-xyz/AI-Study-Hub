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
public class EmptyTrashResponse {
    private String outcome;
    private Integer deletedCount;
    private Integer failedCount;
    private List<FailureItem> failures;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FailureItem {
        private String type;
        private Integer id;
        private String message;
    }
}
