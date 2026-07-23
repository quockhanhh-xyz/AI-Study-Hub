package com.demo.ai_study_hub.dto;

import com.demo.ai_study_hub.entity.Appeal;
import java.time.LocalDateTime;

public class AppealResponse {
    private Integer appealId;
    private String email;
    private String fullName;
    private String message;
    private String status;
    private LocalDateTime createdAt;

    public AppealResponse(Appeal appeal) {
        this.appealId = appeal.getAppealId();
        this.email = appeal.getEmail();
        this.fullName = appeal.getFullName();
        this.message = appeal.getMessage();
        this.status = appeal.getStatus();
        this.createdAt = appeal.getCreatedAt();
    }

    public Integer getAppealId() {
        return appealId;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getMessage() {
        return message;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
