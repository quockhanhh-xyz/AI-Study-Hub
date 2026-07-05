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
                    .tier(user.getTier().name())
                    .effectiveTier(effectiveTier.name())
                    .tierExpiresAt(user.getTierExpiresAt())
                    .limits(EntitlementResponse.LimitsDto.builder()
                            .maxStorageBytes(limits.storageBytes())
                            .maxDocuments(limits.maxDocuments())
                            .maxFileSizeBytes(limits.maxFileBytes())
                            .maxFolders(limits.maxFolders())
                            .maxFolderDepth(limits.maxFolderDepth())
                            .maxOwnedGroups(limits.maxOwnedGroups())
                            .maxMembersPerGroup(limits.maxMembersPerGroup())
                            .maxActiveShares(limits.maxActiveShares())
                            .aiQuestionsPerDay(limits.aiQuestionsPerDay())
                            .maxQuestionChars(limits.maxQuestionChars())
                            .maxContextChunks(limits.maxContextChunks())
                            .maxOutputTokens(limits.maxOutputTokens())
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
                    .tier(user.getTier().name())
                    .effectiveTier(effectiveTier.name())
                    .tierExpiresAt(user.getTierExpiresAt())
                    .storage(build(limits.storageBytes(), usedStorage))
                    .documents(build(limits.maxDocuments(), usedDocs))
                    .folders(build(limits.maxFolders(), usedFolders))
                    .ownedGroups(build(limits.maxOwnedGroups(), usedGroups))
                    .activeShares(build(limits.maxActiveShares(), usedShares))
                    .aiQuestionsToday(build(limits.aiQuestionsPerDay(), usedAiToday))
                    .build();

            return ResponseEntity.ok(ApiResponse.success(response, "Usage retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        }
    }

    private AccountUsageResponse.ResourceUsage build(long limit, long used) {
        long remaining = Math.max(limit - used, 0);
        boolean overLimit = used > limit;
        long overBy = overLimit ? used - limit : 0;
        return AccountUsageResponse.ResourceUsage.builder()
                .limit(limit)
                .used(used)
                .remaining(remaining)
                .overLimit(overLimit)
                .overBy(overBy)
                .build();
    }
    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
