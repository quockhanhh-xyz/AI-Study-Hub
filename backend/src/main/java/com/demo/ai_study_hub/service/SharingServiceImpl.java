package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SharingServiceImpl implements SharingService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final DocumentShareRepository documentShareRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final GroupDocumentShareRepository groupDocumentShareRepository;
    private final TierPolicyService tierPolicyService;
    private final UsageService usageService;

    @Override
    @Transactional
    public DocumentShareResponse shareDocumentDirect(Integer documentId, DocumentShareRequest request, String email) {
        User owner = getUser(email);
        Document document = getActiveDocument(documentId);

        if (!document.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        com.demo.ai_study_hub.dto.TierLimits limits = tierPolicyService.getLimitsForUser(owner);
        long activeShares = usageService.countActiveShares(owner);
        if (activeShares >= limits.maxActiveShares()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Active share limit reached. Upgrade your plan to share more.");
        }

        User recipient = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!"ACTIVE".equals(recipient.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not active");
        }

        if (recipient.getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot share a document with yourself");
        }

        DocumentShare existing = documentShareRepository
                .findByDocumentAndSharedWithAndStatus(document, recipient, "ACTIVE")
                .orElse(null);
        if (existing != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document is already shared with this user");
        }

        DocumentShare share = documentShareRepository
                .findByDocumentAndSharedWithAndStatus(document, recipient, "REVOKED")
                .orElse(null);

        if (share != null) {
            share.setStatus("ACTIVE");
            share.setSharedBy(owner);
        } else {
            share = new DocumentShare();
            share.setDocument(document);
            share.setSharedBy(owner);
            share.setSharedWith(recipient);
            share.setPermission("VIEW");
            share.setStatus("ACTIVE");
        }

        DocumentShare saved = documentShareRepository.save(share);
        return mapToDirectResponse(saved, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentShareResponse> getSharedWithMe(String email) {
        User user = getUser(email);
        List<DocumentShare> activeShares = documentShareRepository.findActiveSharesWithMe(user);
        return activeShares.stream()
                .map(share -> mapToDirectResponse(share, false))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentSharingInfoResponse getDocumentShares(Integer documentId, String email) {
        User owner = getUser(email);
        Document document = getActiveDocument(documentId);

        if (!document.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }

        List<DocumentShare> activeDirectShares = documentShareRepository.findByDocumentAndStatus(document, "ACTIVE");
        List<GroupDocumentShare> activeGroupShares = groupDocumentShareRepository.findByDocumentAndStatus(document, "ACTIVE");

        List<DocumentShareResponse> directResponses = activeDirectShares.stream()
                .map(share -> mapToDirectResponse(share, true))
                .collect(Collectors.toList());

        List<GroupDocumentShareResponse> groupResponses = activeGroupShares.stream()
                .map(gds -> mapToGroupResponse(gds, true))
                .collect(Collectors.toList());

        return DocumentSharingInfoResponse.builder()
                .userShares(directResponses)
                .groupShares(groupResponses)
                .build();
    }

    @Override
    @Transactional
    public void revokeDirectShare(Integer shareId, String email) {
        User owner = getUser(email);
        DocumentShare share = documentShareRepository.findById(shareId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share record not found"));

        if (!"ACTIVE".equals(share.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Share record not found");
        }

        if (!share.getDocument().getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the document owner can revoke shares");
        }

        share.setStatus("REVOKED");
        documentShareRepository.save(share);
    }

    @Override
    @Transactional
    public GroupDocumentShareResponse shareDocumentToGroup(Integer documentId, GroupDocumentShareRequest request, String email) {
        User owner = getUser(email);
        Document document = getActiveDocument(documentId);

        if (!document.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
        com.demo.ai_study_hub.dto.TierLimits limitsGroup = tierPolicyService.getLimitsForUser(owner);
        long activeSharesGroup = usageService.countActiveShares(owner);
        if (activeSharesGroup >= limitsGroup.maxActiveShares()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Active share limit reached. Upgrade your plan to share more.");
        }

        StudyGroup group = studyGroupRepository.findById(request.getGroupId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        if (!"ACTIVE".equals(group.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }

        studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Group not found"));

        GroupDocumentShare existing = groupDocumentShareRepository
                .findByDocumentAndGroupAndStatus(document, group, "ACTIVE")
                .orElse(null);
        if (existing != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document is already shared in this group");
        }

        GroupDocumentShare share = groupDocumentShareRepository
                .findByDocumentAndGroupAndStatus(document, group, "REVOKED")
                .orElse(null);

        if (share != null) {
            share.setStatus("ACTIVE");
            share.setSharedBy(owner);
        } else {
            share = new GroupDocumentShare();
            share.setDocument(document);
            share.setGroup(group);
            share.setSharedBy(owner);
            share.setPermission("VIEW");
            share.setStatus("ACTIVE");
        }

        GroupDocumentShare saved = groupDocumentShareRepository.save(share);
        return mapToGroupResponse(saved, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupDocumentShareResponse> getGroupDocuments(Integer groupId, String email) {
        User user = getUser(email);
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        if (!"ACTIVE".equals(group.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }

        StudyGroupMember currentMembership = studyGroupMemberRepository
                .findByGroupAndUserAndStatus(group, user, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Group not found"));

        List<GroupDocumentShare> activeShares = groupDocumentShareRepository.findActiveSharesForGroup(group);

        return activeShares.stream()
                .map(s -> {
                    boolean canRevoke = s.getDocument().getOwner().getUserId().equals(user.getUserId())
                            || "OWNER".equals(currentMembership.getRole());
                    return mapToGroupResponse(s, canRevoke);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void revokeGroupShare(Integer shareId, String email) {
        User user = getUser(email);
        GroupDocumentShare share = groupDocumentShareRepository.findById(shareId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group share record not found"));

        if (!"ACTIVE".equals(share.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group share record not found");
        }

        StudyGroup group = share.getGroup();

        boolean isDocOwner = share.getDocument().getOwner().getUserId().equals(user.getUserId());
        boolean isGroupOwner = studyGroupMemberRepository
                .findByGroupAndUserAndStatus(group, user, "ACTIVE")
                .map(m -> "OWNER".equals(m.getRole()))
                .orElse(false);

        if (!isDocOwner && !isGroupOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You do not have permission to revoke this group document share");
        }

        share.setStatus("REVOKED");
        groupDocumentShareRepository.save(share);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Document getActiveDocument(Integer documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!"ACTIVE".equals(document.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found or in trash");
        }
        return document;
    }

    private DocumentShareResponse mapToDirectResponse(DocumentShare share, boolean isOwnerView) {
        return DocumentShareResponse.builder()
                .shareId(share.getShareId())
                .documentId(share.getDocument().getDocumentId())
                .title(share.getDocument().getTitle())
                .fileType(share.getDocument().getFileType())
                .fileSize(share.getDocument().getFileSize())
                .fileUrl(share.getDocument().getFileUrl())
                .sharedByName(share.getSharedBy().getFullName())
                .sharedWithName(share.getSharedWith().getFullName())
                .sharedByEmail(isOwnerView ? share.getSharedBy().getEmail() : null)
                .sharedWithEmail(isOwnerView ? share.getSharedWith().getEmail() : null)
                .permission(share.getPermission())
                .status(share.getStatus())
                .createdAt(share.getCreatedAt())
                .build();
    }

    private GroupDocumentShareResponse mapToGroupResponse(GroupDocumentShare share, boolean canRevoke) {
        return GroupDocumentShareResponse.builder()
                .shareId(share.getShareId())
                .documentId(share.getDocument().getDocumentId())
                .title(share.getDocument().getTitle())
                .fileType(share.getDocument().getFileType())
                .fileSize(share.getDocument().getFileSize())
                .fileUrl(share.getDocument().getFileUrl())
                .groupId(share.getGroup().getGroupId())
                .sharedByName(share.getSharedBy().getFullName())
                .sharedByEmail(null)
                .permission(share.getPermission())
                .status(share.getStatus())
                .createdAt(share.getCreatedAt())
                .canRevoke(canRevoke)
                .build();
    }
}
