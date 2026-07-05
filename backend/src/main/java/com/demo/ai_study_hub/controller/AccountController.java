package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.TierPolicyService;
import com.demo.ai_study_hub.service.UsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final UserRepository userRepository;
    private final TierPolicyService tierPolicyService;
    private final UsageService usageService;

    @GetMapping("/entitlements")
    public ResponseEntity<ApiResponse<EntitlementResponse>> getEntitlements(Principal principal) {
        try {
            User user = getUser(principal);
            UserTier effectiveTier = tierPolicyService.getEffectiveTier(user);
            TierLimits limits = tierPolicyService.getLimits(effectiveTier);

            EntitlementResponse response = EntitlementResponse.builder()
                    .tier(effectiveTier.name())
                    .tierExpiresAt(user.getTierExpiresAt())
                    .limits(EntitlementResponse.LimitsDto.builder()
                            .storageBytes(limits.storageBytes())
                            .documents(limits.maxDocuments())
                            .maxFileBytes(limits.maxFileBytes())
                            .folders(limits.maxFolders())
                            .folderDepth(limits.maxFolderDepth())
                            .ownedGroups(limits.maxOwnedGroups())
                            .membersPerGroup(limits.maxMembersPerGroup())
                            .activeShares(limits.maxActiveShares())
                            .aiQuestionsPerDay(limits.aiQuestionsPerDay())
                            .maxQuestionChars(limits.maxQuestionChars())
                            .contextChunks(limits.maxContextChunks())
                            .outputTokens(limits.maxOutputTokens())
                            .aiModel(limits.aiModel())
                            .summaryGenerationsPerDay(limits.summaryGenerationsPerDay())
                            .flashcardSetsPerDay(limits.flashcardSetsPerDay())
                            .quizSetsPerDay(limits.quizSetsPerDay())
                            .itemsPerSet(limits.itemsPerSet())
                            .build())
                    .build();

            return ResponseEntity.ok(ApiResponse.success(response, "Entitlements retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        }
    }

    @GetMapping("/usage")
    public ResponseEntity<ApiResponse<AccountUsageResponse>> getUsage(Principal principal) {
        try {
            User user = getUser(principal);
            UserTier effectiveTier = tierPolicyService.getEffectiveTier(user);
            TierLimits limits = tierPolicyService.getLimits(effectiveTier);

            long usedStorage = usageService.countStorageBytes(user);
            long usedDocs = usageService.countDocuments(user);
            long usedFolders = usageService.countFolders(user);
            long usedGroups = usageService.countOwnedGroups(user);
            long usedShares = usageService.countActiveShares(user);
            long usedAiToday = usageService.countAiQuestionsToday(user);

            AccountUsageResponse response = AccountUsageResponse.builder()
                    .tier(effectiveTier.name())
                    .tierExpiresAt(user.getTierExpiresAt())
                    .limits(AccountUsageResponse.UsageSnapshot.builder()
                            .storageBytes(limits.storageBytes())
                            .documents(limits.maxDocuments())
                            .folders(limits.maxFolders())
                            .ownedGroups(limits.maxOwnedGroups())
                            .activeShares(limits.maxActiveShares())
                            .aiQuestionsToday(limits.aiQuestionsPerDay())
                            .build())
                    .usage(AccountUsageResponse.UsageSnapshot.builder()
                            .storageBytes(usedStorage)
                            .documents(usedDocs)
                            .folders(usedFolders)
                            .ownedGroups(usedGroups)
                            .activeShares(usedShares)
                            .aiQuestionsToday(usedAiToday)
                            .build())
                    .remaining(AccountUsageResponse.UsageSnapshot.builder()
                            .storageBytes(Math.max(limits.storageBytes() - usedStorage, 0))
                            .documents(Math.max(limits.maxDocuments() - usedDocs, 0))
                            .folders(Math.max(limits.maxFolders() - usedFolders, 0))
                            .ownedGroups(Math.max(limits.maxOwnedGroups() - usedGroups, 0))
                            .activeShares(Math.max(limits.maxActiveShares() - usedShares, 0))
                            .aiQuestionsToday(Math.max(limits.aiQuestionsPerDay() - usedAiToday, 0))
                            .build())
                    .overLimit(AccountUsageResponse.OverLimitSnapshot.builder()
                            .storageBytes(usedStorage > limits.storageBytes())
                            .documents(usedDocs > limits.maxDocuments())
                            .folders(usedFolders > limits.maxFolders())
                            .ownedGroups(usedGroups > limits.maxOwnedGroups())
                            .activeShares(usedShares > limits.maxActiveShares())
                            .build())
                    .overBy(AccountUsageResponse.UsageSnapshot.builder()
                            .storageBytes(Math.max(usedStorage - limits.storageBytes(), 0))
                            .documents(Math.max(usedDocs - limits.maxDocuments(), 0))
                            .folders(Math.max(usedFolders - limits.maxFolders(), 0))
                            .ownedGroups(Math.max(usedGroups - limits.maxOwnedGroups(), 0))
                            .activeShares(Math.max(usedShares - limits.maxActiveShares(), 0))
                            .aiQuestionsToday(0)
                            .build())
                    .build();

            return ResponseEntity.ok(ApiResponse.success(response, "Usage retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        }
    }

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
