package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.AdminUserItem;
import com.demo.ai_study_hub.dto.AdminUserListResponse;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.UserRepository;
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
public class AdminUserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    public AdminUserListResponse getUsers(String search, String role, String tier, String status, Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isEmpty()) {
                String searchLike = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("email")), searchLike),
                        cb.like(cb.lower(root.get("fullName")), searchLike)
                ));
            }
            if (role != null && !role.isEmpty()) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (tier != null && !tier.isEmpty()) {
                predicates.add(cb.equal(root.get("tier").as(String.class), tier));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> userPage = userRepository.findAll(spec, pageable);

        List<AdminUserItem> items = userPage.getContent().stream().map(this::mapToItem).collect(Collectors.toList());

        AdminUserListResponse response = new AdminUserListResponse();
        response.setUsers(items);
        response.setTotalPages(userPage.getTotalPages());
        response.setTotalElements(userPage.getTotalElements());
        response.setCurrentPage(userPage.getNumber());
        return response;
    }

    public AdminUserItem getUserById(Integer id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        return mapToItem(user);
    }

    public AdminUserItem updateUserStatus(Integer id, String newStatus, Integer currentAdminId) {
        if (id.equals(currentAdminId)) {
            throw new RuntimeException("Cannot block/unblock yourself");
        }

        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));

        if ("BLOCKED".equals(newStatus) && "ADMIN".equals(user.getRole())) {
            // Optional: prevent blocking last admin
            long adminCount = userRepository.findAll().stream().filter(u -> "ADMIN".equals(u.getRole()) && !"BLOCKED".equals(u.getStatus())).count();
            if (adminCount <= 1) {
                throw new RuntimeException("Cannot block the last active admin");
            }
        }

        user.setStatus(newStatus);
        user = userRepository.save(user);
        return mapToItem(user);
    }

    public byte[] exportUsers(String search, String role, String tier, String status) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isEmpty()) {
                String searchLike = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("email")), searchLike),
                        cb.like(cb.lower(root.get("fullName")), searchLike)
                ));
            }
            if (role != null && !role.isEmpty()) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (tier != null && !tier.isEmpty()) {
                predicates.add(cb.equal(root.get("tier").as(String.class), tier));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<User> users = userRepository.findAll(spec);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Users");
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("User ID");
            headerRow.createCell(1).setCellValue("Email");
            headerRow.createCell(2).setCellValue("Full Name");
            headerRow.createCell(3).setCellValue("Role");
            headerRow.createCell(4).setCellValue("Tier");
            headerRow.createCell(5).setCellValue("Status");
            headerRow.createCell(6).setCellValue("Document Count");
            headerRow.createCell(7).setCellValue("Created At");

            int rowIdx = 1;
            for (User user : users) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(user.getUserId());
                row.createCell(1).setCellValue(user.getEmail());
                row.createCell(2).setCellValue(user.getFullName());
                row.createCell(3).setCellValue(user.getRole());
                row.createCell(4).setCellValue(user.getTier() != null ? user.getTier().name() : "");
                row.createCell(5).setCellValue(user.getStatus());
                row.createCell(6).setCellValue(documentRepository.countByOwner(user));
                row.createCell(7).setCellValue(user.getCreatedAt() != null ? user.getCreatedAt().toString() : "");
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error exporting users to Excel", e);
        }
    }

    private AdminUserItem mapToItem(User user) {
        AdminUserItem item = new AdminUserItem();
        item.setUserId(user.getUserId());
        item.setEmail(user.getEmail());
        item.setFullName(user.getFullName());
        item.setRole(user.getRole());
        item.setTier(user.getTier() != null ? user.getTier().name() : null);
        item.setTierExpiresAt(user.getTierExpiresAt());
        item.setStatus(user.getStatus());
        item.setCreatedAt(user.getCreatedAt());
        item.setDocumentCount(documentRepository.countByOwner(user));
        return item;
    }
}
