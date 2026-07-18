package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final PaymentOrderRepository paymentOrderRepository;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final PlanConfigRepository planConfigRepository;

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboardSummary() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus("ACTIVE");
        long blockedUsers = userRepository.countByStatus("BLOCKED");
        long totalDocuments = documentRepository.countByStatus("ACTIVE");
        long pendingDocs = documentRepository.countByVisibilityAndApprovalStatusAndStatus("PUBLIC", "PENDING", "ACTIVE");
        long approvedDocs = documentRepository.countByVisibilityAndApprovalStatusAndStatus("PUBLIC", "APPROVED", "ACTIVE");

        long totalRevenue = paymentOrderRepository.sumSuccessfulRevenue();
        long successfulPaymentsCount = paymentOrderRepository.countByStatus("SUCCESS");

        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime startOfToday = nowUtc.toLocalDate().atStartOfDay();
        LocalDateTime startOfThisMonth = nowUtc.toLocalDate().withDayOfMonth(1).atStartOfDay();

        long aiRequestsToday = aiUsageLogRepository.countSuccessfulLogsAfter(startOfToday);
        long aiRequestsThisMonth = aiUsageLogRepository.countSuccessfulLogsAfter(startOfThisMonth);
        long aiRequestsTotal = aiUsageLogRepository.countByStatus("SUCCESS");

        List<AdminDashboardResponse.TierCountItem> usersByTier = userRepository.countUsersByTier().stream()
                .map(row -> new AdminDashboardResponse.TierCountItem(row[0].toString(), (Long) row[1]))
                .collect(Collectors.toList());

        List<AdminDashboardResponse.ApprovalStatusCountItem> docsByApproval = documentRepository.countDocumentsByApprovalStatus().stream()
                .map(row -> new AdminDashboardResponse.ApprovalStatusCountItem(row[0].toString(), (Long) row[1]))
                .collect(Collectors.toList());

        List<Object[]> payGroupingData = paymentOrderRepository.findSuccessPaymentDatesAndAmounts();
        Map<String, Long> monthlyRev = payGroupingData.stream()
                .collect(Collectors.groupingBy(
                        row -> {
                            LocalDateTime dt = (LocalDateTime) row[0];
                            return dt.format(DateTimeFormatter.ofPattern("yyyy-MM"));
                        },
                        Collectors.summingLong(row -> (Long) row[1])
                ));

        List<AdminDashboardResponse.RevenueByMonthItem> revenueByMonth = monthlyRev.entrySet().stream()
                .map(e -> new AdminDashboardResponse.RevenueByMonthItem(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(AdminDashboardResponse.RevenueByMonthItem::getMonth))
                .collect(Collectors.toList());

        Map<String, String> featureMap = Map.of(
                "QA", "AI_QA",
                "SUMMARY", "AI_SUMMARY",
                "QUIZ", "AI_QUIZ",
                "FLASHCARD", "AI_FLASHCARD"
        );

        List<AdminDashboardResponse.AiFeatureUsageItem> aiUsage = aiUsageLogRepository.countUsageByRequestType().stream()
                .map(row -> {
                    String type = row[0].toString();
                    String featureName = featureMap.getOrDefault(type, "AI_" + type);
                    return new AdminDashboardResponse.AiFeatureUsageItem(featureName, (Long) row[1]);
                })
                .collect(Collectors.toList());

        return AdminDashboardResponse.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .blockedUsers(blockedUsers)
                .totalDocuments(totalDocuments)
                .pendingPublicDocuments(pendingDocs)
                .approvedPublicDocuments(approvedDocs)
                .totalRevenue(totalRevenue)
                .successfulPayments(successfulPaymentsCount)
                .aiRequestsToday(aiRequestsToday)
                .aiRequestsThisMonth(aiRequestsThisMonth)
                .aiRequestsTotal(aiRequestsTotal)
                .usersByTier(usersByTier)
                .documentsByApprovalStatus(docsByApproval)
                .revenueByMonth(revenueByMonth)
                .aiUsageByFeature(aiUsage)
                .build();
    }

    @Transactional(readOnly = true)
    @Override
    public AdminDashboardChartsResponse getDashboardCharts() {
        List<AdminDashboardChartsResponse.TierCountItem> userTierDistribution = userRepository.countUsersByTier().stream()
                .map(row -> new AdminDashboardChartsResponse.TierCountItem(row[0].toString(), (Long) row[1]))
                .collect(Collectors.toList());

        List<AdminDashboardChartsResponse.ApprovalStatusCountItem> documentApprovalStatus = documentRepository.countDocumentsByApprovalStatus().stream()
                .map(row -> new AdminDashboardChartsResponse.ApprovalStatusCountItem(row[0].toString(), (Long) row[1]))
                .collect(Collectors.toList());

        List<Object[]> payGroupingData = paymentOrderRepository.findSuccessPaymentDatesAndAmounts();
        Map<String, Long> dailyRev = payGroupingData.stream()
                .collect(Collectors.groupingBy(
                        row -> {
                            LocalDateTime dt = (LocalDateTime) row[0];
                            return dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                        },
                        Collectors.summingLong(row -> (Long) row[1])
                ));
        List<AdminDashboardChartsResponse.RevenueByDayItem> revenueByDay = dailyRev.entrySet().stream()
                .map(e -> new AdminDashboardChartsResponse.RevenueByDayItem(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(AdminDashboardChartsResponse.RevenueByDayItem::getDate))
                .collect(Collectors.toList());

        List<LocalDateTime> aiLogDates = aiUsageLogRepository.findSuccessLogDates();
        Map<String, Long> dailyAi = aiLogDates.stream()
                .collect(Collectors.groupingBy(
                        dt -> dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                        Collectors.counting()
                ));
        List<AdminDashboardChartsResponse.AiUsageByDayItem> aiUsageByDay = dailyAi.entrySet().stream()
                .map(e -> new AdminDashboardChartsResponse.AiUsageByDayItem(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(AdminDashboardChartsResponse.AiUsageByDayItem::getDate))
                .collect(Collectors.toList());

        return AdminDashboardChartsResponse.builder()
                .userTierDistribution(userTierDistribution)
                .documentApprovalStatus(documentApprovalStatus)
                .revenueByDay(revenueByDay)
                .aiUsageByDay(aiUsageByDay)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminPublicDocumentListResponse getPublicDocuments(String search, String approvalStatus, String fileType, Integer subjectId, int page, int size) {
        if (page < 0) page = 0;
        if (size < 1) size = 20;
        if (size > 100) size = 100;
        Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        String searchParam = (search == null || search.trim().isEmpty()) ? null : search.trim();
        String appStatusParam = (approvalStatus == null || approvalStatus.trim().isEmpty()) ? null : approvalStatus.trim();
        String fileTypeParam = (fileType == null || fileType.trim().isEmpty()) ? null : fileType.trim();

        Page<Document> docPage = documentRepository.findPublicDocumentsForAdmin(
                searchParam, appStatusParam, fileTypeParam, subjectId, pageable
        );

        List<AdminPublicDocumentItem> items = docPage.getContent().stream()
                .map(this::mapToItem)
                .collect(Collectors.toList());

        return AdminPublicDocumentListResponse.builder()
                .items(items)
                .page(docPage.getNumber())
                .size(docPage.getSize())
                .totalItems(docPage.getTotalElements())
                .totalPages(docPage.getTotalPages())
                .build();
    }

    @Override
    @Transactional
    public void approveDocument(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!"ACTIVE".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
        if (!"PUBLIC".equals(doc.getVisibility())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only public documents can be moderated");
        }
        doc.setApprovalStatus("APPROVED");
        if (doc.getPublishedAt() == null) {
            doc.setPublishedAt(LocalDateTime.now(ZoneOffset.UTC));
        }
        documentRepository.save(doc);
    }

    @Override
    @Transactional
    public void rejectDocument(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!"ACTIVE".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
        if (!"PUBLIC".equals(doc.getVisibility())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only public documents can be moderated");
        }
        doc.setApprovalStatus("REJECTED");
        documentRepository.save(doc);
    }

    @Override
    @Transactional
    public void unpublishDocument(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!"ACTIVE".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
        if (!"PUBLIC".equals(doc.getVisibility())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only public documents can be unpublished");
        }
        doc.setVisibility("PRIVATE");
        documentRepository.save(doc);
    }

    @Override
    @Transactional
    public void makeDocumentPending(Integer id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!"ACTIVE".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
        if (!"PUBLIC".equals(doc.getVisibility())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only public documents can be moderated");
        }
        doc.setApprovalStatus("PENDING");
        doc.setPublishedAt(null);
        documentRepository.save(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportPublicDocuments(String search, String approvalStatus, String fileType, Integer subjectId) {
        String searchParam = (search == null || search.trim().isEmpty()) ? null : search.trim();
        String appStatusParam = (approvalStatus == null || approvalStatus.trim().isEmpty()) ? null : approvalStatus.trim();
        String fileTypeParam = (fileType == null || fileType.trim().isEmpty()) ? null : fileType.trim();

        List<Document> docs = documentRepository.findPublicDocumentsForAdminExport(
                searchParam, appStatusParam, fileTypeParam, subjectId
        );

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Public Documents");

            // Header Style
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "Document ID", "Title", "Owner Email", "Subject", "File Type",
                    "Visibility", "Approval Status", "Processing Status",
                    "View Count", "Download Count", "Created At", "Published At"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Document doc : docs) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(doc.getDocumentId());
                row.createCell(1).setCellValue(doc.getTitle() != null ? doc.getTitle() : "");
                row.createCell(2).setCellValue(doc.getOwner() != null ? doc.getOwner().getEmail() : "");
                row.createCell(3).setCellValue(doc.getSubject() != null ? doc.getSubject().getSubjectName() : "");
                row.createCell(4).setCellValue(doc.getFileType() != null ? doc.getFileType() : "");
                row.createCell(5).setCellValue(doc.getVisibility() != null ? doc.getVisibility() : "");
                row.createCell(6).setCellValue(doc.getApprovalStatus() != null ? doc.getApprovalStatus() : "");
                ProcessingStatus ps = doc.getDocumentContent() != null ? doc.getDocumentContent().getProcessingStatus() : null;
                row.createCell(7).setCellValue(ps != null ? ps.toString() : "");
                row.createCell(8).setCellValue(doc.getViewCount() != null ? doc.getViewCount() : 0L);
                row.createCell(9).setCellValue(doc.getDownloadCount() != null ? doc.getDownloadCount() : 0L);
                row.createCell(10).setCellValue(doc.getCreatedAt() != null ? doc.getCreatedAt().toString() : "");
                row.createCell(11).setCellValue(doc.getPublishedAt() != null ? doc.getPublishedAt().toString() : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate Excel file", e);
        }
    }

    private AdminPublicDocumentItem mapToItem(Document doc) {
        return AdminPublicDocumentItem.builder()
                .documentId(doc.getDocumentId())
                .title(doc.getTitle())
                .ownerEmail(doc.getOwner() != null ? doc.getOwner().getEmail() : null)
                .subject(doc.getSubject() != null ? doc.getSubject().getSubjectName() : null)
                .fileType(doc.getFileType())
                .visibility(doc.getVisibility())
                .approvalStatus(doc.getApprovalStatus())
                .processingStatus(doc.getDocumentContent() != null && doc.getDocumentContent().getProcessingStatus() != null ? doc.getDocumentContent().getProcessingStatus().toString() : null)
                .viewCount(doc.getViewCount() != null ? doc.getViewCount() : 0L)
                .downloadCount(doc.getDownloadCount() != null ? doc.getDownloadCount() : 0L)
                .createdAt(doc.getCreatedAt() != null ? doc.getCreatedAt().toInstant(ZoneOffset.UTC) : null)
                .publishedAt(doc.getPublishedAt() != null ? doc.getPublishedAt().toInstant(ZoneOffset.UTC) : null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlanConfig> getAllPlanConfigs() {
        return planConfigRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public PlanConfig getPlanConfig(String planCode) {
        return planConfigRepository.findById(planCode.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found with code: " + planCode));
    }

    @Override
    @Transactional
    public PlanConfig updatePlanConfig(String planCode, PlanUpdateRequest request) {
        PlanConfig pc = planConfigRepository.findById(planCode.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found with code: " + planCode));

        if (request.getPlanName() != null) pc.setPlanName(request.getPlanName());
        if (request.getPrice() != null) pc.setPrice(request.getPrice());
        if (request.getBillingLabel() != null) pc.setBillingLabel(request.getBillingLabel());
        if (request.getPurchasable() != null) pc.setPurchasable(request.getPurchasable());
        if (request.getAiDailyQuestionLimit() != null) pc.setAiDailyQuestionLimit(request.getAiDailyQuestionLimit());
        if (request.getStorageLimit() != null) pc.setStorageLimit(request.getStorageLimit());
        if (request.getMaxFileSize() != null) pc.setMaxFileSize(request.getMaxFileSize());
        if (request.getMaxDocumentCount() != null) pc.setMaxDocumentCount(request.getMaxDocumentCount());
        if (request.getMaxFolderCount() != null) pc.setMaxFolderCount(request.getMaxFolderCount());
        if (request.getMaxGroupCount() != null) pc.setMaxGroupCount(request.getMaxGroupCount());
        if (request.getMaxFlashcardsPerSet() != null) pc.setMaxFlashcardsPerSet(request.getMaxFlashcardsPerSet());
        if (request.getMaxQuizQuestionsPerSet() != null) pc.setMaxQuizQuestionsPerSet(request.getMaxQuizQuestionsPerSet());
        if (request.getSummaryDailyLimit() != null) pc.setSummaryDailyLimit(request.getSummaryDailyLimit());
        if (request.getFlashcardDailyLimit() != null) pc.setFlashcardDailyLimit(request.getFlashcardDailyLimit());
        if (request.getQuizDailyLimit() != null) pc.setQuizDailyLimit(request.getQuizDailyLimit());

        if (request.getFeatures() != null) {
            pc.setFeaturesList(String.join(",", request.getFeatures()));
        }

        return planConfigRepository.save(pc);
    }

    @Override
    @Transactional
    public PlanConfig patchPlanStatus(String planCode, String status) {
        PlanConfig pc = planConfigRepository.findById(planCode.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found with code: " + planCode));

        if (!"ACTIVE".equalsIgnoreCase(status) && !"INACTIVE".equalsIgnoreCase(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + status);
        }

        pc.setStatus(status.toUpperCase());
        return planConfigRepository.save(pc);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportPlanConfigs() {
        List<PlanConfig> plans = planConfigRepository.findAll();

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Plans Configuration");

            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "Plan Code", "Plan Name", "Price", "Billing Label", "Purchasable",
                    "AI Daily Question Limit", "Storage Limit", "Max File Size",
                    "Max Document Count", "Max Folder Count", "Max Group Count",
                    "Max Flashcards Per Set", "Max Quiz Questions Per Set",
                    "Summary Daily Limit", "Flashcard Daily Limit", "Quiz Daily Limit",
                    "Features List", "Status", "Target Tier", "Duration Months"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (PlanConfig pc : plans) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(pc.getPlanCode());
                row.createCell(1).setCellValue(pc.getPlanName());
                row.createCell(2).setCellValue(pc.getPrice());
                row.createCell(3).setCellValue(pc.getBillingLabel());
                row.createCell(4).setCellValue(pc.getPurchasable() ? "YES" : "NO");
                row.createCell(5).setCellValue(pc.getAiDailyQuestionLimit());
                row.createCell(6).setCellValue(pc.getStorageLimit());
                row.createCell(7).setCellValue(pc.getMaxFileSize());
                row.createCell(8).setCellValue(pc.getMaxDocumentCount());
                row.createCell(9).setCellValue(pc.getMaxFolderCount());
                row.createCell(10).setCellValue(pc.getMaxGroupCount());
                row.createCell(11).setCellValue(pc.getMaxFlashcardsPerSet());
                row.createCell(12).setCellValue(pc.getMaxQuizQuestionsPerSet());
                row.createCell(13).setCellValue(pc.getSummaryDailyLimit());
                row.createCell(14).setCellValue(pc.getFlashcardDailyLimit());
                row.createCell(15).setCellValue(pc.getQuizDailyLimit());
                row.createCell(16).setCellValue(pc.getFeaturesList() != null ? pc.getFeaturesList() : "");
                row.createCell(17).setCellValue(pc.getStatus());
                row.createCell(18).setCellValue(pc.getTargetTier());
                row.createCell(19).setCellValue(pc.getDurationMonths());
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate Excel file", e);
        }
    }
}
