package com.demo.ai_study_hub.config;

import com.demo.ai_study_hub.entity.PlanConfig;
import com.demo.ai_study_hub.repository.PlanConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PlanConfigDataSeeder implements CommandLineRunner {

    private final PlanConfigRepository planConfigRepository;

    @Override
    public void run(String... args) {
        // Seed FREE plan
        if (!planConfigRepository.existsById("FREE")) {
            planConfigRepository.save(PlanConfig.builder()
                    .planCode("FREE")
                    .planName("Free")
                    .price(0L)
                    .billingLabel("Free")
                    .purchasable(false)
                    .aiDailyQuestionLimit(5)
                    .storageLimit(100L * 1024 * 1024) // 100MB
                    .maxFileSize(10L * 1024 * 1024) // 10MB
                    .maxDocumentCount(30)
                    .maxFolderCount(20)
                    .maxGroupCount(3)
                    .maxFolderDepth(3)
                    .maxMembersPerGroup(3)
                    .maxActiveShares(30)
                    .maxAiSessionsPerDocument(3)
                    .maxMessagesPerSession(30)
                    .maxQuestionChars(500)
                    .maxContextChunks(3)
                    .maxOutputTokens(500)
                    .itemsPerSet(5)
                    .maxFlashcardsPerSet(20)
                    .maxQuizQuestionsPerSet(20)
                    .summaryDailyLimit(3)
                    .flashcardDailyLimit(2)
                    .quizDailyLimit(2)
                    .featuresList("5 AI questions per day,Generate up to 20 quiz questions per set,Generate up to 20 flashcards per set,Upload files up to 10MB,View shared and community documents")
                    .status("ACTIVE")
                    .targetTier("FREE")
                    .durationMonths(0)
                    .build());
        }

        // Seed PREMIUM_1_MONTH plan
        if (!planConfigRepository.existsById("PREMIUM_1_MONTH")) {
            planConfigRepository.save(PlanConfig.builder()
                    .planCode("PREMIUM_1_MONTH")
                    .planName("Premium")
                    .price(199000L)
                    .billingLabel("1 month")
                    .purchasable(true)
                    .aiDailyQuestionLimit(50)
                    .storageLimit(2L * 1024 * 1024 * 1024) // 2GB
                    .maxFileSize(50L * 1024 * 1024) // 50MB
                    .maxDocumentCount(500)
                    .maxFolderCount(200)
                    .maxGroupCount(30)
                    .maxFolderDepth(8)
                    .maxMembersPerGroup(100)
                    .maxActiveShares(1000)
                    .maxAiSessionsPerDocument(30)
                    .maxMessagesPerSession(300)
                    .maxQuestionChars(2000)
                    .maxContextChunks(8)
                    .maxOutputTokens(1500)
                    .itemsPerSet(15)
                    .maxFlashcardsPerSet(50)
                    .maxQuizQuestionsPerSet(50)
                    .summaryDailyLimit(20)
                    .flashcardDailyLimit(15)
                    .quizDailyLimit(15)
                    .featuresList("50 AI questions per day,Generate up to 50 quiz questions per set,Generate up to 50 flashcards per set,Upload files up to 50MB")
                    .status("ACTIVE")
                    .targetTier("PREMIUM")
                    .durationMonths(1)
                    .build());
        }

        // Seed ULTRA_1_MONTH plan
        if (!planConfigRepository.existsById("ULTRA_1_MONTH")) {
            planConfigRepository.save(PlanConfig.builder()
                    .planCode("ULTRA_1_MONTH")
                    .planName("Ultra")
                    .price(399000L)
                    .billingLabel("1 month")
                    .purchasable(true)
                    .aiDailyQuestionLimit(200)
                    .storageLimit(10L * 1024 * 1024 * 1024) // 10GB
                    .maxFileSize(100L * 1024 * 1024) // 100MB
                    .maxDocumentCount(2000)
                    .maxFolderCount(1000)
                    .maxGroupCount(100)
                    .maxFolderDepth(12)
                    .maxMembersPerGroup(300)
                    .maxActiveShares(5000)
                    .maxAiSessionsPerDocument(100)
                    .maxMessagesPerSession(1000)
                    .maxQuestionChars(5000)
                    .maxContextChunks(15)
                    .maxOutputTokens(3000)
                    .itemsPerSet(30)
                    .maxFlashcardsPerSet(80)
                    .maxQuizQuestionsPerSet(80)
                    .summaryDailyLimit(50)
                    .flashcardDailyLimit(40)
                    .quizDailyLimit(40)
                    .featuresList("200 AI questions per day,Generate up to 80 quiz questions per set,Generate up to 80 flashcards per set,Upload files up to 100MB")
                    .status("ACTIVE")
                    .targetTier("ULTRA")
                    .durationMonths(1)
                    .build());
        }

        System.out.println("✅ [PlanConfigDataSeeder] Seeded missing plan configurations.");
    }
}
