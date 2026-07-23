package com.demo.ai_study_hub.dto;

import lombok.Data;

@Data
public class ProfilePrivacyRequest {
    private Boolean profilePublic;
    private Boolean showSchool;
    private Boolean showMajor;
    private Boolean showBio;
    private Boolean showPublicDocuments;
}
