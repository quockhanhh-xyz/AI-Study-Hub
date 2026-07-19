package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.AdminSubjectRequest;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.SubjectRequest;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.SubjectRequestRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import com.demo.ai_study_hub.service.AdminSubjectService;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SubjectRequestService {

    @Autowired
    private SubjectRequestRepository subjectRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubjectRepository subjectRepository;
    
    @Autowired
    private AdminSubjectService adminSubjectService;

    public SubjectRequest createSubjectRequest(String requestedCode, String requestedName, String description, String email) {
        if (subjectRequestRepository.existsByRequestedCodeAndStatus(requestedCode, "PENDING") ||
            subjectRequestRepository.existsByRequestedNameAndStatus(requestedName, "PENDING")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A pending request with this code or name already exists");
        }
        
        if (subjectRepository.existsBySubjectCodeAndStatus(requestedCode, "ACTIVE")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An active subject with this code already exists");
        }
        
        java.util.Optional<Subject> existingByName = subjectRepository.findSystemSubjectByNameIgnoreCase(requestedName);
        if (existingByName.isPresent() && "ACTIVE".equals(existingByName.get().getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An active system subject with this name already exists");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        SubjectRequest request = new SubjectRequest();
        request.setRequestedCode(requestedCode);
        request.setRequestedName(requestedName);
        request.setDescription(description);
        request.setRequestedByUser(user);
        return subjectRequestRepository.save(request);
    }

    public List<SubjectRequest> getMySubjectRequests(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return subjectRequestRepository.findByRequestedByUser(user);
    }

    public Page<SubjectRequest> getAllSubjectRequests(String search, String status, Pageable pageable) {
        return subjectRequestRepository.findAll(buildSpecification(search, status), pageable);
    }

    public SubjectRequest approveRequest(Integer requestId, String adminEmail) {
        SubjectRequest request = subjectRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject request not found"));

        if (!"PENDING".equals(request.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending requests can be approved");
        }

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Admin not found"));

        // Check if subject already exists but is INACTIVE
        Subject existing = subjectRepository.findBySubjectCode(request.getRequestedCode()).orElse(null);
        if (existing == null) {
             existing = subjectRepository.findSystemSubjectByNameIgnoreCase(request.getRequestedName()).orElse(null);
        }
        
        if (existing != null) {
            if ("ACTIVE".equals(existing.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Subject with this code or name already exists and is active");
            } else {
                existing.setStatus("ACTIVE");
                subjectRepository.save(existing);
            }
        } else {
            // Create new system subject
            AdminSubjectRequest createReq = new AdminSubjectRequest();
            createReq.setSubjectCode(request.getRequestedCode());
            createReq.setSubjectName(request.getRequestedName());
            createReq.setDescription(request.getDescription());
            adminSubjectService.createSubject(createReq);
        }

        request.setStatus("APPROVED");
        request.setReviewedBy(admin);
        request.setReviewedAt(LocalDateTime.now());
        return subjectRequestRepository.save(request);
    }

    public SubjectRequest rejectRequest(Integer requestId, String rejectReason, String adminEmail) {
        SubjectRequest request = subjectRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject request not found"));

        if (!"PENDING".equals(request.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending requests can be rejected");
        }

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Admin not found"));

        request.setStatus("REJECTED");
        request.setRejectReason(rejectReason);
        request.setReviewedBy(admin);
        request.setReviewedAt(LocalDateTime.now());
        return subjectRequestRepository.save(request);
    }
    
    public byte[] exportSubjectRequests(String search, String status) {
        List<SubjectRequest> requests = subjectRequestRepository.findAll(buildSpecification(search, status));
        
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Subject Requests");
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("Request ID");
            headerRow.createCell(1).setCellValue("Requested Code");
            headerRow.createCell(2).setCellValue("Requested Name");
            headerRow.createCell(3).setCellValue("Description");
            headerRow.createCell(4).setCellValue("Requested By");
            headerRow.createCell(5).setCellValue("Status");
            headerRow.createCell(6).setCellValue("Created At");
            headerRow.createCell(7).setCellValue("Reviewed By");
            headerRow.createCell(8).setCellValue("Reviewed At");
            headerRow.createCell(9).setCellValue("Reject Reason");

            int rowIdx = 1;
            for (SubjectRequest req : requests) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(req.getRequestId());
                row.createCell(1).setCellValue(req.getRequestedCode());
                row.createCell(2).setCellValue(req.getRequestedName());
                row.createCell(3).setCellValue(req.getDescription());
                row.createCell(4).setCellValue(req.getRequestedByUser() != null ? req.getRequestedByUser().getEmail() : "");
                row.createCell(5).setCellValue(req.getStatus());
                row.createCell(6).setCellValue(req.getCreatedAt() != null ? req.getCreatedAt().toString() : "");
                row.createCell(7).setCellValue(req.getReviewedBy() != null ? req.getReviewedBy().getEmail() : "");
                row.createCell(8).setCellValue(req.getReviewedAt() != null ? req.getReviewedAt().toString() : "");
                row.createCell(9).setCellValue(req.getRejectReason());
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to export subject requests");
        }
    }

    private Specification<SubjectRequest> buildSpecification(String search, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isEmpty()) {
                String searchLike = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("requestedCode")), searchLike),
                        cb.like(cb.lower(root.get("requestedName")), searchLike)
                ));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
