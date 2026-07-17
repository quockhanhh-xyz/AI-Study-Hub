package com.demo.ai_study_hub.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.demo.ai_study_hub.dto.AdminAiUsageItem;
import com.demo.ai_study_hub.dto.AdminAiUsageListResponse;
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

@Service
public class AdminAiUsageService {

    @Autowired
    private AiUsageLogRepository aiUsageLogRepository;

    @Autowired
    private UserRepository userRepository;

    public AdminAiUsageListResponse getAiUsages(String search, String tier, String feature, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Specification<User> spec = buildSpecification(search, tier, feature, startDate, endDate);
        Page<User> page = userRepository.findAll(spec, pageable);

        List<AdminAiUsageItem> items = page.getContent().stream()
                .map(user -> mapToItem(user, startDate, endDate))
                .collect(Collectors.toList());

        AdminAiUsageListResponse response = new AdminAiUsageListResponse();
        response.setUsages(items);
        response.setTotalPages(page.getTotalPages());
        response.setTotalElements(page.getTotalElements());
        response.setCurrentPage(page.getNumber());
        return response;
    }

    public byte[] exportAiUsage(String search, String tier, String feature, LocalDateTime startDate, LocalDateTime endDate) {
        Specification<User> spec = buildSpecification(search, tier, feature, startDate, endDate);
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
                AdminAiUsageItem item = mapToItem(user, startDate, endDate);
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

    private Specification<User> buildSpecification(String search, String tier, String feature, LocalDateTime startDate, LocalDateTime endDate) {
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
                subPredicates.add(cb.equal(subRoot.get("requestType"), mappedFeature));

                if (startDate != null) {
                    subPredicates.add(cb.greaterThanOrEqualTo(subRoot.get("createdAt"), startDate));
                }
                if (endDate != null) {
                    subPredicates.add(cb.lessThanOrEqualTo(subRoot.get("createdAt"), endDate));
                }
                subquery.where(cb.and(subPredicates.toArray(new Predicate[0])));

                predicates.add(root.get("userId").in(subquery));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private AdminAiUsageItem mapToItem(User user, LocalDateTime startDate, LocalDateTime endDate) {
        Specification<AiUsageLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user"), user));
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
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
            String type = log.getRequestType();
            if ("QA".equalsIgnoreCase(type) || "ASK".equalsIgnoreCase(type)) qa++;
            else if ("SUMMARY".equalsIgnoreCase(type)) summary++;
            else if ("FLASHCARD".equalsIgnoreCase(type)) flashcard++;
            else if ("QUIZ".equalsIgnoreCase(type)) quiz++;

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
}
