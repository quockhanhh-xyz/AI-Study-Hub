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
public class MySharesResponse {
    private List<DocumentShareResponse> documentShares;
    private List<GroupDocumentShareResponse> groupDocumentShares;
    private List<FolderShareResponse> folderShares;
    private List<FolderShareResponse> groupFolderShares;
    private List<DocumentResponse> publicDocuments;
}
