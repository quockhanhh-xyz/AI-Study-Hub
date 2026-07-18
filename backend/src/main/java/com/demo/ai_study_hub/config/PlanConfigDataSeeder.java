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
        if (planConfigRepository.count() == 0) {
            // Seed FREE plan
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

            // Seed PREMIUM_1_MONTH plan
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

            // Seed ULTRA_1_MONTH plan
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

            System.out.println("✅ [PlanConfigDataSeeder] Seeded default plan configurations.");
        }
    }
}
