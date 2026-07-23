package com.demo.ai_study_hub.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.demo.ai_study_hub.dto.AdminSubjectItem;
import com.demo.ai_study_hub.dto.AdminSubjectListResponse;
import com.demo.ai_study_hub.dto.AdminSubjectRequest;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.SubjectRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminSubjectService {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private DocumentRepository documentRepository;

    public AdminSubjectListResponse getSystemSubjects(String search, String status, Pageable pageable) {
        Specification<Subject> spec = buildSpecification(search, status);
        Page<Subject> page = subjectRepository.findAll(spec, pageable);

        List<AdminSubjectItem> items = page.getContent().stream().map(this::mapToItem).collect(Collectors.toList());

        AdminSubjectListResponse response = new AdminSubjectListResponse();
        response.setSubjects(items);
        response.setTotalPages(page.getTotalPages());
        response.setTotalElements(page.getTotalElements());
        response.setCurrentPage(page.getNumber());
        return response;
    }

    public AdminSubjectItem createSubject(AdminSubjectRequest request) {
        if (subjectRepository.existsBySubjectCode(request.getSubjectCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Subject code already exists");
        }

        Subject subject = new Subject();
        subject.setSubjectCode(request.getSubjectCode());
        subject.setSubjectName(request.getSubjectName());
        subject.setDescription(request.getDescription());
        subject.setScope("SYSTEM");
        subject.setStatus("ACTIVE");
        
        subject = subjectRepository.save(subject);
        return mapToItem(subject);
    }

    public AdminSubjectItem updateSubject(Integer id, AdminSubjectRequest request) {
        Subject subject = subjectRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
        
        if (!isSystemSubject(subject)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot edit custom subjects");
        }

        if (!subject.getSubjectCode().equals(request.getSubjectCode()) && subjectRepository.existsBySubjectCode(request.getSubjectCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Subject code already exists");
        }

        subject.setSubjectCode(request.getSubjectCode());
        subject.setSubjectName(request.getSubjectName());
        subject.setDescription(request.getDescription());

        subject = subjectRepository.save(subject);
        return mapToItem(subject);
    }

    public AdminSubjectItem updateSubjectStatus(Integer id, String status) {
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status");
        }

        Subject subject = subjectRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));

        if (!isSystemSubject(subject)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot edit custom subjects");
        }

        subject.setStatus(status);
        subject = subjectRepository.save(subject);
        return mapToItem(subject);
    }

    public byte[] exportSubjects(String search, String status) {
        Specification<Subject> spec = buildSpecification(search, status);
        List<Subject> subjects = subjectRepository.findAll(spec);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("System Subjects");
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("Subject ID");
            headerRow.createCell(1).setCellValue("Code");
            headerRow.createCell(2).setCellValue("Name");
            headerRow.createCell(3).setCellValue("Description");
            headerRow.createCell(4).setCellValue("Status");
            headerRow.createCell(5).setCellValue("Created At");

            int rowIdx = 1;
            for (Subject subject : subjects) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(subject.getSubjectId());
                row.createCell(1).setCellValue(subject.getSubjectCode());
                row.createCell(2).setCellValue(subject.getSubjectName());
                row.createCell(3).setCellValue(subject.getDescription());
                row.createCell(4).setCellValue(subject.getStatus());
                row.createCell(5).setCellValue(subject.getCreatedAt() != null ? subject.getCreatedAt().toString() : "");
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error exporting subjects to Excel", e);
        }
    }

    private Specification<Subject> buildSpecification(String search, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();


            if (search != null && !search.isEmpty()) {
                String searchLike = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("subjectCode")), searchLike),
                        cb.like(cb.lower(root.get("subjectName")), searchLike)
                ));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private boolean isSystemSubject(Subject subject) {
        return "SYSTEM".equals(subject.getScope()) || subject.getOwner() == null;
    }

    private AdminSubjectItem mapToItem(Subject subject) {
        AdminSubjectItem item = new AdminSubjectItem();
        item.setSubjectId(subject.getSubjectId());
        item.setSubjectCode(subject.getSubjectCode());
        item.setSubjectName(subject.getSubjectName());
        item.setDescription(subject.getDescription());
        item.setStatus(subject.getStatus());
        item.setCreatedAt(subject.getCreatedAt());
        item.setUpdatedAt(subject.getUpdatedAt());
        item.setDocumentsCount(documentRepository.countBySubject(subject));
        return item;
    }
}
