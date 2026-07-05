package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UsageService {

    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final DocumentShareRepository documentShareRepository;
    private final GroupDocumentShareRepository groupDocumentShareRepository;
    private final FolderShareRepository folderShareRepository;
    private final GroupFolderShareRepository groupFolderShareRepository;
    private final AiUsageLogRepository aiUsageLogRepository;

    public long countDocuments(User user) {
        return documentRepository.countByOwnerAndStatusIn(user, java.util.List.of("ACTIVE", "DELETED"));
    }

    public long countFolders(User user) {
        return folderRepository.countByOwnerAndStatusIn(user, java.util.List.of("ACTIVE", "DELETED"));
    }

    public long countOwnedGroups(User user) {
        return studyGroupMemberRepository.countByUserAndRoleAndGroupStatus(user, "OWNER", "ACTIVE");
    }

    public long countActiveShares(User user) {
        long directDocShares = documentShareRepository.countBySharedByAndStatus(user, "ACTIVE");
        long groupDocShares = groupDocumentShareRepository.countBySharedByAndStatus(user, "ACTIVE");
        long directFolderShares = folderShareRepository.countBySharedByAndStatus(user, "ACTIVE");
        long groupFolderShares = groupFolderShareRepository.countBySharedByAndStatus(user, "ACTIVE");
        return directDocShares + groupDocShares + directFolderShares + groupFolderShares;
    }

    public long countStorageBytes(User user) {
        Long total = documentRepository.sumFileSizeByOwnerAndStatusIn(user,
                java.util.List.of("ACTIVE", "DELETED"));
        return total != null ? total : 0L;
    }

    public long countAiQuestionsToday(User user) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        return aiUsageLogRepository.countSuccessfulQuestionsAfter(user.getUserId(), startOfDay);
    }
}
