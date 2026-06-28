package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.SharingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SharingServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DocumentShareRepository documentShareRepository;
    @Mock
    private StudyGroupRepository studyGroupRepository;
    @Mock
    private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock
    private GroupDocumentShareRepository groupDocumentShareRepository;

    @InjectMocks
    private SharingServiceImpl sharingService;

    private User owner;
    private User recipient;
    private User external;
    private Document document;
    private StudyGroup group;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setUserId(1);
        owner.setEmail("owner@gmail.com");
        owner.setStatus("ACTIVE");

        recipient = new User();
        recipient.setUserId(2);
        recipient.setEmail("recipient@gmail.com");
        recipient.setStatus("ACTIVE");

        external = new User();
        external.setUserId(3);
        external.setEmail("external@gmail.com");
        external.setStatus("ACTIVE");

        document = new Document();
        document.setDocumentId(10);
        document.setTitle("Lecture Notes");
        document.setOwner(owner);
        document.setStatus("ACTIVE");

        group = new StudyGroup();
        group.setGroupId(5);
        group.setGroupName("Java Group");
        group.setOwner(owner);
        group.setStatus("ACTIVE");
    }

    @Test
    void shareDocumentDirect_Success() {
        DocumentShareRequest request = new DocumentShareRequest("recipient@gmail.com");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(document, recipient, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(document, recipient, "REVOKED"))
                .thenReturn(Optional.empty());

        DocumentShare savedShare = new DocumentShare();
        savedShare.setShareId(1);
        savedShare.setDocument(document);
        savedShare.setSharedBy(owner);
        savedShare.setSharedWith(recipient);
        savedShare.setStatus("ACTIVE");

        when(documentShareRepository.save(any(DocumentShare.class))).thenReturn(savedShare);

        DocumentShareResponse response = sharingService.shareDocumentDirect(10, request, "owner@gmail.com");

        assertNotNull(response);
        assertEquals(1, response.getShareId());
        assertEquals("recipient@gmail.com", response.getSharedWithEmail());
        assertEquals("ACTIVE", response.getStatus());
    }

    @Test
    void shareDocumentDirect_WhenNonOwnerShares_ShouldThrow404() {
        DocumentShareRequest request = new DocumentShareRequest("recipient@gmail.com");

        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            sharingService.shareDocumentDirect(10, request, "recipient@gmail.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Document not found", exception.getReason());
    }

    @Test
    void shareDocumentDirect_WhenSharingToSelf_ShouldThrow400() {
        DocumentShareRequest request = new DocumentShareRequest("owner@gmail.com");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            sharingService.shareDocumentDirect(10, request, "owner@gmail.com");
        });

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("You cannot share a document with yourself", exception.getReason());
    }

    @Test
    void shareDocumentDirect_WhenDuplicateShare_ShouldThrow409() {
        DocumentShareRequest request = new DocumentShareRequest("recipient@gmail.com");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));

        DocumentShare existing = new DocumentShare();
        existing.setStatus("ACTIVE");
        when(documentShareRepository.findByDocumentAndSharedWithAndStatus(document, recipient, "ACTIVE"))
                .thenReturn(Optional.of(existing));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            sharingService.shareDocumentDirect(10, request, "owner@gmail.com");
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals("Document is already shared with this user", exception.getReason());
    }

    @Test
    void revokeDirectShare_Success() {
        DocumentShare share = new DocumentShare();
        share.setShareId(1);
        share.setDocument(document);
        share.setSharedBy(owner);
        share.setSharedWith(recipient);
        share.setStatus("ACTIVE");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentShareRepository.findById(1)).thenReturn(Optional.of(share));

        sharingService.revokeDirectShare(1, "owner@gmail.com");

        assertEquals("REVOKED", share.getStatus());
        verify(documentShareRepository, times(1)).save(share);
    }

    @Test
    void revokeDirectShare_WhenNonOwnerRevokes_ShouldThrow403() {
        DocumentShare share = new DocumentShare();
        share.setShareId(1);
        share.setDocument(document);
        share.setSharedBy(owner);
        share.setSharedWith(recipient);
        share.setStatus("ACTIVE");

        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(documentShareRepository.findById(1)).thenReturn(Optional.of(share));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            sharingService.revokeDirectShare(1, "recipient@gmail.com");
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Only the document owner can revoke shares", exception.getReason());
    }

    @Test
    void shareDocumentToGroup_Success() {
        GroupDocumentShareRequest request = new GroupDocumentShareRequest(5);

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));
        when(studyGroupRepository.findById(5)).thenReturn(Optional.of(group));

        StudyGroupMember memberRecord = new StudyGroupMember();
        memberRecord.setRole("OWNER");
        memberRecord.setStatus("ACTIVE");
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE"))
                .thenReturn(Optional.of(memberRecord));

        when(groupDocumentShareRepository.findByDocumentAndGroupAndStatus(document, group, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupDocumentShareRepository.findByDocumentAndGroupAndStatus(document, group, "REVOKED"))
                .thenReturn(Optional.empty());

        GroupDocumentShare saved = new GroupDocumentShare();
        saved.setShareId(1);
        saved.setDocument(document);
        saved.setGroup(group);
        saved.setSharedBy(owner);
        saved.setStatus("ACTIVE");

        when(groupDocumentShareRepository.save(any(GroupDocumentShare.class))).thenReturn(saved);

        GroupDocumentShareResponse response = sharingService.shareDocumentToGroup(10, request, "owner@gmail.com");

        assertNotNull(response);
        assertEquals(1, response.getShareId());
        assertEquals("ACTIVE", response.getStatus());
        assertEquals(5, response.getGroupId());
    }

    @Test
    void shareDocumentToGroup_WhenUserNotGroupMember_ShouldThrow404() {
        GroupDocumentShareRequest request = new GroupDocumentShareRequest(5);

        when(userRepository.findByEmail("external@gmail.com")).thenReturn(Optional.of(external));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document)); // Owned by owner, but shared by external
        document.setOwner(external); // setup owner

        when(studyGroupRepository.findById(5)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, external, "ACTIVE"))
                .thenReturn(Optional.empty()); // not member

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            sharingService.shareDocumentToGroup(10, request, "external@gmail.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Group not found", exception.getReason());
    }

    @Test
    void getGroupDocuments_Success() {
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(studyGroupRepository.findById(5)).thenReturn(Optional.of(group));

        StudyGroupMember memberRecord = new StudyGroupMember();
        memberRecord.setRole("MEMBER");
        memberRecord.setStatus("ACTIVE");
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, recipient, "ACTIVE"))
                .thenReturn(Optional.of(memberRecord));

        GroupDocumentShare share = new GroupDocumentShare();
        share.setShareId(1);
        share.setDocument(document);
        share.setGroup(group);
        share.setSharedBy(owner);
        share.setStatus("ACTIVE");

        when(groupDocumentShareRepository.findActiveSharesForGroup(group)).thenReturn(List.of(share));

        List<GroupDocumentShareResponse> docs = sharingService.getGroupDocuments(5, "recipient@gmail.com");

        assertFalse(docs.isEmpty());
        assertEquals(1, docs.size());
        assertEquals("Lecture Notes", docs.get(0).getTitle());
    }

    @Test
    void revokeGroupShare_WhenGroupOwnerRevokes_Success() {
        GroupDocumentShare share = new GroupDocumentShare();
        share.setShareId(1);
        share.setDocument(document);
        share.setGroup(group);
        share.setStatus("ACTIVE");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(groupDocumentShareRepository.findById(1)).thenReturn(Optional.of(share));

        StudyGroupMember membership = new StudyGroupMember();
        membership.setRole("OWNER");
        membership.setStatus("ACTIVE");
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, owner, "ACTIVE"))
                .thenReturn(Optional.of(membership));

        sharingService.revokeGroupShare(1, "owner@gmail.com");

        assertEquals("REVOKED", share.getStatus());
        verify(groupDocumentShareRepository, times(1)).save(share);
    }

    @Test
    void revokeGroupShare_WhenMemberRevokesOthersShare_ShouldThrow403() {
        GroupDocumentShare share = new GroupDocumentShare();
        share.setShareId(1);
        share.setDocument(document); // owned by owner
        share.setGroup(group);
        share.setStatus("ACTIVE");

        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(groupDocumentShareRepository.findById(1)).thenReturn(Optional.of(share));

        // Recipient is active MEMBER of the group, not OWNER
        StudyGroupMember membership = new StudyGroupMember();
        membership.setRole("MEMBER");
        membership.setStatus("ACTIVE");
        when(studyGroupMemberRepository.findByGroupAndUserAndStatus(group, recipient, "ACTIVE"))
                .thenReturn(Optional.of(membership));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            sharingService.revokeGroupShare(1, "recipient@gmail.com");
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("You do not have permission to revoke this group document share", exception.getReason());
    }

    @Test
    void getDocumentShares_Success() {
        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));

        DocumentShare directShare = new DocumentShare();
        directShare.setShareId(1);
        directShare.setDocument(document);
        directShare.setSharedBy(owner);
        directShare.setSharedWith(recipient);
        directShare.setStatus("ACTIVE");

        GroupDocumentShare groupShare = new GroupDocumentShare();
        groupShare.setShareId(2);
        groupShare.setDocument(document);
        groupShare.setGroup(group);
        groupShare.setSharedBy(owner);
        groupShare.setStatus("ACTIVE");

        when(documentShareRepository.findByDocumentAndStatus(document, "ACTIVE")).thenReturn(List.of(directShare));
        when(groupDocumentShareRepository.findByDocumentAndStatus(document, "ACTIVE")).thenReturn(List.of(groupShare));

        DocumentSharingInfoResponse response = sharingService.getDocumentShares(10, "owner@gmail.com");

        assertNotNull(response);
        assertEquals(1, response.getUserShares().size());
        assertEquals("recipient@gmail.com", response.getUserShares().get(0).getSharedWithEmail());
        assertEquals(1, response.getGroupShares().size());
        assertEquals(5, response.getGroupShares().get(0).getGroupId());
        assertTrue(response.getGroupShares().get(0).getCanRevoke());
    }

    @Test
    void getDocumentShares_WhenNonOwnerAccesses_ShouldThrow404() {
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(documentRepository.findById(10)).thenReturn(Optional.of(document));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            sharingService.getDocumentShares(10, "recipient@gmail.com");
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Document not found", exception.getReason());
    }
}
