package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.CreateCustomSubjectRequest;
import com.demo.ai_study_hub.dto.SubjectResponse;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
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

    public List<SubjectResponse> getActiveSubjects(String email) {
        User user = getUser(email);

        return subjectRepository.findVisibleSubjects(user)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
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
        return subjectRepository.findActiveSystemSubjects()
                .stream()
                .map(s -> SubjectResponse.builder()
                        .subjectId(s.getSubjectId())
                        .subjectCode(s.getSubjectCode())
                        .subjectName(s.getSubjectName())
                        .description(s.getDescription())
                        .scope(s.getScope())
                        .ownerId(null)
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
                .build();
    }
}
