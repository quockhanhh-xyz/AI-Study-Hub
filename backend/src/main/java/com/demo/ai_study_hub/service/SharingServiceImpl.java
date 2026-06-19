package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentShareRequest;
import com.demo.ai_study_hub.dto.DocumentShareResponse;
import com.demo.ai_study_hub.dto.GroupDocumentShareRequest;
import com.demo.ai_study_hub.dto.GroupDocumentShareResponse;
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

    @Override
    @Transactional
    public DocumentShareResponse shareDocumentDirect(Integer documentId, DocumentShareRequest request, String email) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient email is required");
        }

        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if (!"ACTIVE".equals(document.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found or in trash");
        }

        // Only document owner can share
        if (!document.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the document owner can share this document");
        }

        User recipient = userRepository.findByEmail(request.getEmail().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipient user not found"));

        if (!"ACTIVE".equals(recipient.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient account is inactive");
        }

        if (recipient.getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot share a document with yourself");
        }

        // Check if duplicate active share exists
        boolean alreadyShared = documentShareRepository.existsByDocumentAndSharedWithAndStatus(document, recipient, "ACTIVE");
        if (alreadyShared) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document is already shared with this user");
        }

        // Find if there's a revoked share record that can be reactivated
        List<DocumentShare> existingShares = documentShareRepository.findByDocumentAndStatus(document, "REVOKED");
        DocumentShare shareRecord = existingShares.stream()
                .filter(ds -> ds.getSharedWith().getUserId().equals(recipient.getUserId()))
                .findFirst()
                .orElse(null);

        if (shareRecord != null) {
            shareRecord.setStatus("ACTIVE");
            documentShareRepository.save(shareRecord);
        } else {
            shareRecord = DocumentShare.builder()
                    .document(document)
                    .sharedBy(owner)
                    .sharedWith(recipient)
                    .permission("VIEW")
                    .status("ACTIVE")
                    .build();
            documentShareRepository.save(shareRecord);
        }

        return mapToDirectResponse(shareRecord);
    }

    @Override
    public List<DocumentShareResponse> getSharedWithMe(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<DocumentShare> shares = documentShareRepository.findActiveSharesWithMe(user);

        return shares.stream()
                .map(this::mapToDirectResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<DocumentShareResponse> getDocumentShares(Integer documentId, String email) {
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if (!"ACTIVE".equals(document.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found or in trash");
        }

        // Only document owner can view direct share info list
        if (!document.getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the document owner can view sharing information");
        }

        List<DocumentShare> shares = documentShareRepository.findByDocumentAndStatus(document, "ACTIVE");

        return shares.stream()
                .map(this::mapToDirectResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void revokeDirectShare(Integer shareId, String email) {
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        DocumentShare share = documentShareRepository.findByShareIdAndStatus(shareId, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Active share record not found"));

        // Only document owner can revoke the direct share
        if (!share.getDocument().getOwner().getUserId().equals(owner.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the document owner can revoke shares");
        }

        share.setStatus("REVOKED");
        documentShareRepository.save(share);
    }

    @Override
    @Transactional
    public GroupDocumentShareResponse shareDocumentToGroup(Integer documentId, GroupDocumentShareRequest request, String email) {
        if (request.getGroupId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group ID is required");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if (!"ACTIVE".equals(document.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found or in trash");
        }

        // Only document owner can share
        if (!document.getOwner().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the document owner can share this document");
        }

        StudyGroup group = studyGroupRepository.findByGroupIdAndStatus(request.getGroupId(), "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found or deleted"));

        // User must be an active member of the group
        studyGroupMemberRepository.findByGroupAndUserAndStatus(group, user, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "You must be an active member of the group to share to it"));

        // Check if duplicate group share exists
        boolean alreadyShared = groupDocumentShareRepository.existsByDocumentAndGroupAndStatus(document, group, "ACTIVE");
        if (alreadyShared) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document is already shared in this group");
        }

        // Check for revoked group shares to reactivate
        GroupDocumentShare shareRecord = groupDocumentShareRepository.findByShareIdAndStatus(documentId, "REVOKED") // wait, searching by share id isn't right for document+group, let's find any revoked matching document + group
                .orElse(null); // actually let's just query or create new. It's safer to query if a revoked one exists. Let's do that cleanly.
        
        // Let's implement check for reactivating GroupDocumentShare
        List<GroupDocumentShare> revokedShares = groupDocumentShareRepository.findAll().stream()
                .filter(gds -> "REVOKED".equals(gds.getStatus()) && gds.getDocument().getDocumentId().equals(documentId) && gds.getGroup().getGroupId().equals(group.getGroupId()))
                .collect(Collectors.toList());

        if (!revokedShares.isEmpty()) {
            shareRecord = revokedShares.get(0);
            shareRecord.setStatus("ACTIVE");
            shareRecord.setSharedBy(user);
            groupDocumentShareRepository.save(shareRecord);
        } else {
            shareRecord = GroupDocumentShare.builder()
                    .document(document)
                    .group(group)
                    .sharedBy(user)
                    .permission("VIEW")
                    .status("ACTIVE")
                    .build();
            groupDocumentShareRepository.save(shareRecord);
        }

        return mapToGroupResponse(shareRecord);
    }

    @Override
    public List<GroupDocumentShareResponse> getGroupDocuments(Integer groupId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        StudyGroup group = studyGroupRepository.findByGroupIdAndStatus(groupId, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found or deleted"));

        // User must be an active member of the group to view documents
        studyGroupMemberRepository.findByGroupAndUserAndStatus(group, user, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "You must be an active member of this group to view group documents"));

        List<GroupDocumentShare> shares = groupDocumentShareRepository.findActiveSharesForGroup(group);

        return shares.stream()
                .map(this::mapToGroupResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void revokeGroupShare(Integer shareId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        GroupDocumentShare share = groupDocumentShareRepository.findByShareIdAndStatus(shareId, "ACTIVE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Active group share record not found"));

        // Retrieve group details
        StudyGroup group = share.getGroup();

        // Permissions rule: Document owner OR Group Owner can revoke.
        boolean isDocumentOwner = share.getDocument().getOwner().getUserId().equals(user.getUserId());
        boolean isGroupOwner = group.getOwner().getUserId().equals(user.getUserId());

        if (!isDocumentOwner && !isGroupOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to revoke this group document share");
        }

        share.setStatus("REVOKED");
        groupDocumentShareRepository.save(share);
    }

    private DocumentShareResponse mapToDirectResponse(DocumentShare ds) {
        return DocumentShareResponse.builder()
                .shareId(ds.getShareId())
                .documentId(ds.getDocument().getDocumentId())
                .title(ds.getDocument().getTitle())
                .fileType(ds.getDocument().getFileType())
                .fileSize(ds.getDocument().getFileSize())
                .fileUrl(ds.getDocument().getFileUrl())
                .sharedByEmail(ds.getSharedBy().getEmail())
                .sharedWithEmail(ds.getSharedWith().getEmail())
                .permission(ds.getPermission())
                .status(ds.getStatus())
                .createdAt(ds.getCreatedAt())
                .build();
    }

    private GroupDocumentShareResponse mapToGroupResponse(GroupDocumentShare gds) {
        return GroupDocumentShareResponse.builder()
                .shareId(gds.getShareId())
                .documentId(gds.getDocument().getDocumentId())
                .title(gds.getDocument().getTitle())
                .fileType(gds.getDocument().getFileType())
                .fileSize(gds.getDocument().getFileSize())
                .fileUrl(gds.getDocument().getFileUrl())
                .groupId(gds.getGroup().getGroupId())
                .sharedByEmail(gds.getSharedBy().getEmail())
                .permission(gds.getPermission())
                .status(gds.getStatus())
                .createdAt(gds.getCreatedAt())
                .build();
    }
}
