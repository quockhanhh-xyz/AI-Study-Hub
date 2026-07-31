package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.CreateCustomSubjectRequest;
import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.SubjectMyLibraryResponse;
import com.demo.ai_study_hub.dto.SubjectResponse;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.SubjectMajorMappingRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentService documentService;
    private final SubjectMajorMappingRepository subjectMajorMappingRepository;
    private final SubjectMappingService subjectMappingService;

    public List<SubjectResponse> getActiveSubjects(String email) {
        return getActiveSubjects(email, null);
    }

    public List<SubjectResponse> getActiveSubjects(String email, Integer majorId) {
        User user = getUser(email);
        List<Subject> subjects;
        if (majorId == null) {
            subjects = subjectRepository.findVisibleSubjects(user);
        } else {
            subjects = new java.util.ArrayList<>(
                    subjectMajorMappingRepository.findActiveSystemSubjectsByMajor(majorId));
            subjects.addAll(subjectRepository.findActiveCustomSubjectsByOwner(user));
        }

        return subjects.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<SubjectMyLibraryResponse> getMyLibrarySubjects(String email) {
        User user = getUser(email);
        List<Subject> visibleSubjects = subjectRepository.findVisibleSubjects(user);

        return visibleSubjects.stream()
                .map(s -> {
                    long docCount = documentRepository.countBySubjectAndOwnerAndStatus(s, user, "ACTIVE");
                    boolean canEdit = "USER_CUSTOM".equalsIgnoreCase(s.getScope()) 
                            && s.getOwner() != null 
                            && s.getOwner().getUserId().equals(user.getUserId());
                    
                    // canDelete is true if it's personal and has no active documents on the system
                    boolean canDelete = canEdit && (documentRepository.countBySubjectAndStatus(s, "ACTIVE") == 0);

                    String sourceType = "SYSTEM";
                    if ("USER_CUSTOM".equalsIgnoreCase(s.getScope())) {
                        sourceType = "PERSONAL";
                    }

                    return SubjectMyLibraryResponse.builder()
                            .subjectId(s.getSubjectId())
                            .code(s.getSubjectCode())
                            .name(s.getSubjectName())
                            .description(s.getDescription())
                            .sourceType(sourceType)
                            .status(s.getStatus())
                            .documentCount(docCount)
                            .canEdit(canEdit)
                            .canDelete(canDelete)
                            .mappings(subjectMappingService.getMappings(s.getSubjectId()))
                            .build();
                })
                .collect(Collectors.toList());
    }

    public Page<DocumentResponse> getSubjectDocuments(Integer subjectId, String email, Pageable pageable) {
        User user = getUser(email);
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));

        // Security check: must be active and visible to user
        if (!"ACTIVE".equals(subject.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Subject is inactive");
        }
        boolean isVisible = "SYSTEM".equalsIgnoreCase(subject.getScope()) 
                || (subject.getScope() == null && subject.getOwner() == null)
                || ("USER_CUSTOM".equalsIgnoreCase(subject.getScope()) 
                    && subject.getOwner() != null 
                    && subject.getOwner().getUserId().equals(user.getUserId()));

        if (!isVisible) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this subject");
        }

        Page<Document> docs = documentRepository.findBySubjectAndOwnerAndStatus(subject, user, "ACTIVE", pageable);
        return docs.map(d -> documentService.mapToResponse(d, user));
    }

    @Transactional
    public SubjectMyLibraryResponse updateCustomSubject(Integer subjectId, CreateCustomSubjectRequest request, String email) {
        User user = getUser(email);
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));

        // Validation: must be USER_CUSTOM and owned by user
        if (!"USER_CUSTOM".equalsIgnoreCase(subject.getScope()) 
                || subject.getOwner() == null 
                || !subject.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to edit this subject");
        }

        String code = request.getSubjectCode().trim().toUpperCase();
        String name = request.getSubjectName().trim();
        String desc = request.getDescription() != null ? request.getDescription().trim() : null;

        // Code uniqueness check
        boolean duplicate = subjectRepository.existsDuplicateCodeForUpdate(code, user, subjectId);
        if (duplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A subject with this code already exists");
        }

        subject.setSubjectCode(code);
        subject.setSubjectName(name);
        subject.setDescription(desc);

        Subject saved = subjectRepository.save(subject);
        return mapToLibraryResponse(saved, user);
    }

    @Transactional
    public void deleteCustomSubject(Integer subjectId, String email) {
        User user = getUser(email);
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));

        // Validation: must be USER_CUSTOM and owned by user
        if (!"USER_CUSTOM".equalsIgnoreCase(subject.getScope()) 
                || subject.getOwner() == null 
                || !subject.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to delete this subject");
        }

        // Check if in use by ANY active document
        long count = documentRepository.countBySubjectAndStatus(subject, "ACTIVE");
        if (count > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SUBJECT_IN_USE");
        }

        subject.setStatus("DISABLED");
        subjectRepository.save(subject);
    }

    @Transactional
    public SubjectResponse createCustomSubject(CreateCustomSubjectRequest request, String email) {
        User user = getUser(email);

        String code = request.getSubjectCode().trim().toUpperCase();
        String name = request.getSubjectName().trim();
        String desc = request.getDescription() != null ? request.getDescription().trim() : null;

        boolean duplicate = subjectRepository.existsDuplicateForUser(code, name, user);
        if (duplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A subject with this code or name already exists");
        }

        Subject subject = new Subject();
        subject.setSubjectCode(code);
        subject.setSubjectName(name);
        subject.setDescription(desc);
        subject.setStatus("ACTIVE");
        subject.setScope("USER_CUSTOM");
        subject.setOwner(user);

        Subject saved = subjectRepository.save(subject);
        return mapToResponse(saved);
    }

    public List<SubjectResponse> getPublicSubjects() {
        return getPublicSubjects(null);
    }

    public List<SubjectResponse> getPublicSubjects(Integer majorId) {
        List<Subject> subjects = majorId == null
                ? subjectRepository.findActiveSystemSubjects()
                : subjectMajorMappingRepository.findActiveSystemSubjectsByMajor(majorId);
        return subjects
                .stream()
                .map(s -> SubjectResponse.builder()
                         .subjectId(s.getSubjectId())
                         .subjectCode(s.getSubjectCode())
                         .subjectName(s.getSubjectName())
                         .description(s.getDescription())
                         .scope(s.getScope())
                         .ownerId(null)
                         .mappings(subjectMappingService.getMappings(s.getSubjectId()))
                         .build())
                .collect(Collectors.toList());
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private SubjectResponse mapToResponse(Subject s) {
        return SubjectResponse.builder()
                .subjectId(s.getSubjectId())
                .subjectCode(s.getSubjectCode())
                .subjectName(s.getSubjectName())
                .description(s.getDescription())
                .scope(s.getScope())
                .ownerId(s.getOwner() != null ? s.getOwner().getUserId() : null)
                .mappings("SYSTEM".equalsIgnoreCase(s.getScope())
                        ? subjectMappingService.getMappings(s.getSubjectId())
                        : List.of())
                .build();
    }

    private SubjectMyLibraryResponse mapToLibraryResponse(Subject s, User user) {
        long docCount = documentRepository.countBySubjectAndOwnerAndStatus(s, user, "ACTIVE");
        String sourceType = "SYSTEM";
        if ("USER_CUSTOM".equalsIgnoreCase(s.getScope())) {
            sourceType = "PERSONAL";
        }
        return SubjectMyLibraryResponse.builder()
                .subjectId(s.getSubjectId())
                .code(s.getSubjectCode())
                .name(s.getSubjectName())
                .description(s.getDescription())
                .sourceType(sourceType)
                .status(s.getStatus())
                .documentCount(docCount)
                .canEdit(true)
                .canDelete(documentRepository.countBySubjectAndStatus(s, "ACTIVE") == 0)
                .mappings(subjectMappingService.getMappings(s.getSubjectId()))
                .build();
    }
}
