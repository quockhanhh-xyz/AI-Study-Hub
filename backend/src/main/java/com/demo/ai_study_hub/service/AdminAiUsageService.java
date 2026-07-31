package com.demo.ai_study_hub.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.demo.ai_study_hub.dto.AdminAiUsageItem;
import com.demo.ai_study_hub.dto.AdminAiUsageListResponse;
import com.demo.ai_study_hub.dto.AdminAiUsageSummaryResponse;
import com.demo.ai_study_hub.entity.AiUsageLog;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.AiUsageLogRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Arrays;

@Service
public class AdminAiUsageService {

    private static final List<String> QA_ALIASES = Arrays.asList("QA", "ASK", "AI_QA");
    private static final List<String> SUMMARY_ALIASES = Arrays.asList("SUMMARY", "AI_SUMMARY");
    private static final List<String> FLASHCARD_ALIASES = Arrays.asList("FLASHCARD", "AI_FLASHCARD");
    private static final List<String> QUIZ_ALIASES = Arrays.asList("QUIZ", "AI_QUIZ");

    @Autowired
    private AiUsageLogRepository aiUsageLogRepository;

    @Autowired
    private UserRepository userRepository;

    public AdminAiUsageListResponse getAiUsages(String search, String tier, String feature, String status, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Specification<User> spec = buildSpecification(search, tier, feature, status, startDate, endDate);
        Page<User> page = userRepository.findAll(spec, pageable);

        List<AdminAiUsageItem> items = page.getContent().stream()
                .map(user -> mapToItem(user, status, startDate, endDate))
                .collect(Collectors.toList());

        AdminAiUsageListResponse response = new AdminAiUsageListResponse();
        response.setUsages(items);
        response.setTotalPages(page.getTotalPages());
        response.setTotalElements(page.getTotalElements());
        response.setCurrentPage(page.getNumber());
        
        response.setSummary(getAiUsageSummary(search, tier, feature, status, startDate, endDate));
        
        return response;
    }

    public byte[] exportAiUsage(String search, String tier, String feature, String status, LocalDateTime startDate, LocalDateTime endDate) {
        Specification<User> spec = buildSpecification(search, tier, feature, status, startDate, endDate);
        List<User> users = userRepository.findAll(spec);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("AI Usage");
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("User Email");
            headerRow.createCell(1).setCellValue("Tier");
            headerRow.createCell(2).setCellValue("AI QA Used");
            headerRow.createCell(3).setCellValue("Summary Used");
            headerRow.createCell(4).setCellValue("Flashcard Used");
            headerRow.createCell(5).setCellValue("Quiz Used");
            headerRow.createCell(6).setCellValue("Total Requests");
            headerRow.createCell(7).setCellValue("Last Used At");

            int rowIdx = 1;
            for (User user : users) {
                AdminAiUsageItem item = mapToItem(user, status, startDate, endDate);
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(item.getUserEmail());
                row.createCell(1).setCellValue(item.getTier());
                row.createCell(2).setCellValue(item.getAiQaUsed());
                row.createCell(3).setCellValue(item.getSummaryUsed());
                row.createCell(4).setCellValue(item.getFlashcardUsed());
                row.createCell(5).setCellValue(item.getQuizUsed());
                row.createCell(6).setCellValue(item.getTotalAiRequests());
                row.createCell(7).setCellValue(item.getLastUsedAt() != null ? item.getLastUsedAt().toString() : "");
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error exporting AI usage to Excel", e);
        }
    }

    private Specification<User> buildSpecification(String search, String tier, String feature, String status, LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isEmpty()) {
                String searchLike = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("email")), searchLike),
                        cb.like(cb.lower(root.get("fullName")), searchLike)
                ));
            }
            if (tier != null && !tier.isEmpty()) {
                predicates.add(cb.equal(root.get("tier").as(String.class), tier));
            }
            
            if (feature != null && !feature.isEmpty()) {
                String mappedFeature = mapFeatureToInternal(feature);
                jakarta.persistence.criteria.Subquery<Integer> subquery = query.subquery(Integer.class);
                jakarta.persistence.criteria.Root<AiUsageLog> subRoot = subquery.from(AiUsageLog.class);
                subquery.select(subRoot.get("user").get("userId"));

                List<Predicate> subPredicates = new ArrayList<>();
                if ("QA".equals(mappedFeature)) {
                    subPredicates.add(subRoot.get("requestType").in(QA_ALIASES));
                } else if ("SUMMARY".equals(mappedFeature)) {
                    subPredicates.add(subRoot.get("requestType").in(SUMMARY_ALIASES));
                } else if ("FLASHCARD".equals(mappedFeature)) {
                    subPredicates.add(subRoot.get("requestType").in(FLASHCARD_ALIASES));
                } else if ("QUIZ".equals(mappedFeature)) {
                    subPredicates.add(subRoot.get("requestType").in(QUIZ_ALIASES));
                } else {
                    subPredicates.add(cb.equal(subRoot.get("requestType"), mappedFeature));
                }

                if (startDate != null) {
                    subPredicates.add(cb.greaterThanOrEqualTo(subRoot.get("createdAt"), startDate));
                }
                if (endDate != null) {
                    subPredicates.add(cb.lessThanOrEqualTo(subRoot.get("createdAt"), endDate));
                }
                if (status != null && !status.isEmpty()) {
                    subPredicates.add(cb.equal(subRoot.get("status"), status));
                }
                subquery.where(cb.and(subPredicates.toArray(new Predicate[0])));

                predicates.add(root.get("userId").in(subquery));
            } else if (status != null && !status.isEmpty() || startDate != null || endDate != null) {
                // If feature is not provided but status or date is, we still need a subquery to filter users who have logs in that range/status
                jakarta.persistence.criteria.Subquery<Integer> subquery = query.subquery(Integer.class);
                jakarta.persistence.criteria.Root<AiUsageLog> subRoot = subquery.from(AiUsageLog.class);
                subquery.select(subRoot.get("user").get("userId"));

                List<Predicate> subPredicates = new ArrayList<>();
                if (startDate != null) {
                    subPredicates.add(cb.greaterThanOrEqualTo(subRoot.get("createdAt"), startDate));
                }
                if (endDate != null) {
                    subPredicates.add(cb.lessThanOrEqualTo(subRoot.get("createdAt"), endDate));
                }
                if (status != null && !status.isEmpty()) {
                    subPredicates.add(cb.equal(subRoot.get("status"), status));
                }
                subquery.where(cb.and(subPredicates.toArray(new Predicate[0])));

                predicates.add(root.get("userId").in(subquery));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public AdminAiUsageItem mapUserToAiUsageItem(User user) {
        return mapToItem(user, null, null, null);
    }

    private AdminAiUsageItem mapToItem(User user, String status, LocalDateTime startDate, LocalDateTime endDate) {
        Specification<AiUsageLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user"), user));
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<AiUsageLog> logs = aiUsageLogRepository.findAll(spec);

        AdminAiUsageItem item = new AdminAiUsageItem();
        item.setUserEmail(user.getEmail());
        item.setTier(user.getTier() != null ? user.getTier().name() : "");
        
        int qa = 0, summary = 0, flashcard = 0, quiz = 0;
        LocalDateTime lastUsed = null;

        for (AiUsageLog log : logs) {
            String type = log.getRequestType() != null ? log.getRequestType().toUpperCase() : "";
            if (QA_ALIASES.contains(type)) qa++;
            else if (SUMMARY_ALIASES.contains(type)) summary++;
            else if (FLASHCARD_ALIASES.contains(type)) flashcard++;
            else if (QUIZ_ALIASES.contains(type)) quiz++;

            if (lastUsed == null || log.getCreatedAt().isAfter(lastUsed)) {
                lastUsed = log.getCreatedAt();
            }
        }

        item.setAiQaUsed(qa);
        item.setSummaryUsed(summary);
        item.setFlashcardUsed(flashcard);
        item.setQuizUsed(quiz);
        item.setTotalAiRequests(qa + summary + flashcard + quiz);
        item.setLastUsedAt(lastUsed);
        
        return item;
    }

    private String mapFeatureToInternal(String externalFeature) {
        if ("AI_QA".equalsIgnoreCase(externalFeature)) return "QA";
        if ("AI_SUMMARY".equalsIgnoreCase(externalFeature)) return "SUMMARY";
        if ("AI_FLASHCARD".equalsIgnoreCase(externalFeature)) return "FLASHCARD";
        if ("AI_QUIZ".equalsIgnoreCase(externalFeature)) return "QUIZ";
        return externalFeature;
    }

    private AdminAiUsageSummaryResponse getAiUsageSummary(String search, String tier, String feature, String status, LocalDateTime startDate, LocalDateTime endDate) {
        Specification<AiUsageLog> logSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (feature != null && !feature.isEmpty()) {
                String mappedFeature = mapFeatureToInternal(feature);
                if ("QA".equals(mappedFeature)) {
                    predicates.add(root.get("requestType").in("ASK", "QA", "AI_QA"));
                } else {
                    predicates.add(cb.equal(root.get("requestType"), mappedFeature));
                }
            }
            if ((search != null && !search.isEmpty()) || (tier != null && !tier.isEmpty())) {
                Join<AiUsageLog, User> userJoin = root.join("user");
                if (search != null && !search.isEmpty()) {
                    String searchLike = "%" + search.toLowerCase() + "%";
                    predicates.add(cb.or(
                            cb.like(cb.lower(userJoin.get("email")), searchLike),
                            cb.like(cb.lower(userJoin.get("fullName")), searchLike)
                    ));
                }
                if (tier != null && !tier.isEmpty()) {
                    predicates.add(cb.equal(userJoin.get("tier").as(String.class), tier));
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<AiUsageLog> logs = aiUsageLogRepository.findAll(logSpec);
        
        long totalRequests = logs.size();
        long successCount = 0;
        long failedCount = 0;
        long quotaBlockedCount = 0;
        
        java.util.Set<Integer> uniqueUsers = new java.util.HashSet<>();

        for (AiUsageLog log : logs) {
            String s = log.getStatus();
            if ("SUCCESS".equalsIgnoreCase(s)) successCount++;
            else if ("FAILED".equalsIgnoreCase(s) || "ERROR".equalsIgnoreCase(s) || "AI_PROVIDER_ERROR".equalsIgnoreCase(s)) failedCount++;
            else if ("QUOTA_EXCEEDED".equalsIgnoreCase(s)) quotaBlockedCount++;
            
            if (log.getUser() != null) {
                uniqueUsers.add(log.getUser().getUserId());
            }
        }

        return AdminAiUsageSummaryResponse.builder()
                .totalRequests(totalRequests)
                .successCount(successCount)
                .failedCount(failedCount)
                .quotaBlockedCount(quotaBlockedCount)
                .activeUsers(uniqueUsers.size())
                .build();
    }
}
