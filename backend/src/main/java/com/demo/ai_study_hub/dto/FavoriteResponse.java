package com.demo.ai_study_hub.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteResponse {
    private Integer documentId;
    private boolean favoritedByMe;
}