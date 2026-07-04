package com.demo.ai_study_hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendGroupMessageRequest {

    @NotBlank(message = "Message content must not be blank")
    private String content;
}
