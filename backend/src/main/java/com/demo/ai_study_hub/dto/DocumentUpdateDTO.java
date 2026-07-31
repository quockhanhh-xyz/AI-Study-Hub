package com.demo.ai_study_hub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentUpdateDTO {
    private String title;
    private String description;
    private Integer subjectId;
    private Integer schoolId;
    private Integer majorId;
}