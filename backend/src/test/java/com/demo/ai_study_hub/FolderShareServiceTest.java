package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.*;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import com.demo.ai_study_hub.service.FolderShareServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FolderShareServiceTest {

    @Mock
    private FolderShareRepository folderShareRepository;
    @Mock
    private FolderRepository folderRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private GroupFolderShareRepository groupFolderShareRepository;
    @Mock
    private StudyGroupRepository studyGroupRepository;
    @Mock
    private StudyGroupMemberRepository studyGroupMemberRepository;
    @Mock
    private DocumentContentRepository documentContentRepository;

    @InjectMocks
    private FolderShareServiceImpl folderShareService;

    private User owner;
    private User recipient;
    private User external;
    private Folder folder;
    private Folder subfolder;
    private StudyGroup group;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setUserId(1);
        owner.setEmail("owner@gmail.com");
        owner.setFullName("Folder Owner");
        owner.setStatus("ACTIVE");

        recipient = new User();
        recipient.setUserId(2);
        recipient.setEmail("recipient@gmail.com");
        recipient.setFullName("Recipient User");
        recipient.setStatus("ACTIVE");

        external = new User();
        external.setUserId(3);
        external.setEmail("external@gmail.com");
        external.setFullName("External User");
        external.setStatus("ACTIVE");

        folder = new Folder();
        folder.setFolderId(10);
        folder.setName("Root Folder");
        folder.setOwner(owner);
        folder.setStatus("ACTIVE");

        subfolder = new Folder();
        subfolder.setFolderId(20);
        subfolder.setName("Sub Folder");
        subfolder.setOwner(owner);
        subfolder.setParentFolder(folder);
        subfolder.setStatus("ACTIVE");

        group = new StudyGroup();
        group.setGroupId(50);
        group.setGroupName("Study Group");
        group.setOwner(owner);
        group.setStatus("ACTIVE");
    }

    // =========================================================================
    // Direct Sharing Tests
    // =========================================================================

    @Test
    void shareFolderToUser_Success() {
        ShareFolderRequest req = new ShareFolderRequest();
        req.setEmail("recipient@gmail.com");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(folderRepository.findById(10)).thenReturn(Optional.of(folder));
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(folderShareRepository.findByFolderAndSharedWithUser(folder, recipient)).thenReturn(Optional.empty());

        FolderShare saved = new FolderShare();
        saved.setShareId(100);
        saved.setFolder(folder);
        saved.setSharedBy(owner);
        saved.setSharedWithUser(recipient);
        saved.setPermission("VIEW");
        saved.setStatus("ACTIVE");

        when(folderShareRepository.save(any(FolderShare.class))).thenReturn(saved);

        FolderShareResponse res = folderShareService.shareFolderToUser(10, req, "owner@gmail.com");

        assertNotNull(res);
        assertEquals(100, res.getShareId());
        assertEquals("recipient@gmail.com", res.getSharedWithEmail());
        verify(folderShareRepository, times(1)).save(any(FolderShare.class));
    }

    @Test
    void shareFolderToUser_SelfSharing_ThrowsBadRequest() {
        ShareFolderRequest req = new ShareFolderRequest();
        req.setEmail("owner@gmail.com");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(folderRepository.findById(10)).thenReturn(Optional.of(folder));
        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderShareService.shareFolderToUser(10, req, "owner@gmail.com");
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void shareFolderToUser_DuplicateActive_ThrowsConflict() {
        ShareFolderRequest req = new ShareFolderRequest();
        req.setEmail("recipient@gmail.com");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(folderRepository.findById(10)).thenReturn(Optional.of(folder));
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));

        FolderShare existing = new FolderShare();
        existing.setStatus("ACTIVE");
        when(folderShareRepository.findByFolderAndSharedWithUser(folder, recipient)).thenReturn(Optional.of(existing));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderShareService.shareFolderToUser(10, req, "owner@gmail.com");
        });
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void shareFolderToUser_ReactivateRevoked() {
        ShareFolderRequest req = new ShareFolderRequest();
        req.setEmail("recipient@gmail.com");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(folderRepository.findById(10)).thenReturn(Optional.of(folder));
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));

        FolderShare existing = new FolderShare();
        existing.setFolder(folder);
        existing.setSharedBy(owner);
        existing.setSharedWithUser(recipient);
        existing.setStatus("REVOKED");
        when(folderShareRepository.findByFolderAndSharedWithUser(folder, recipient)).thenReturn(Optional.of(existing));
        when(folderShareRepository.save(existing)).thenReturn(existing);

        FolderShareResponse res = folderShareService.shareFolderToUser(10, req, "owner@gmail.com");

        assertNotNull(res);
        assertEquals("ACTIVE", res.getStatus());
        verify(folderShareRepository, times(1)).save(existing);
    }

    // =========================================================================
    // Group Sharing Tests
    // =========================================================================

    @Test
    void shareFolderToGroup_Success() {
        GroupFolderShareRequest req = new GroupFolderShareRequest(50);

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(folderRepository.findById(10)).thenReturn(Optional.of(folder));
        when(studyGroupRepository.findById(50)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, owner, "ACTIVE")).thenReturn(true);
        when(groupFolderShareRepository.findByFolderAndGroup(folder, group)).thenReturn(Optional.empty());

        GroupFolderShare saved = new GroupFolderShare();
        saved.setShareId(200);
        saved.setFolder(folder);
        saved.setGroup(group);
        saved.setSharedBy(owner);
        saved.setStatus("ACTIVE");
        when(groupFolderShareRepository.save(any(GroupFolderShare.class))).thenReturn(saved);

        FolderShareResponse res = folderShareService.shareFolderToGroup(10, req, "owner@gmail.com");

        assertNotNull(res);
        assertEquals(200, res.getShareId());
        assertEquals(50, res.getGroupId());
        assertEquals("ACTIVE", res.getStatus());
    }

    @Test
    void shareFolderToGroup_NonMember_ThrowsNotFound() {
        GroupFolderShareRequest req = new GroupFolderShareRequest(50);

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(folderRepository.findById(10)).thenReturn(Optional.of(folder));
        when(studyGroupRepository.findById(50)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, owner, "ACTIVE")).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderShareService.shareFolderToGroup(10, req, "owner@gmail.com");
        });
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("Group not found", ex.getReason());
    }

    @Test
    void shareFolderToGroup_DuplicateActive_ThrowsConflict() {
        GroupFolderShareRequest req = new GroupFolderShareRequest(50);

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(folderRepository.findById(10)).thenReturn(Optional.of(folder));
        when(studyGroupRepository.findById(50)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, owner, "ACTIVE")).thenReturn(true);

        GroupFolderShare existing = new GroupFolderShare();
        existing.setStatus("ACTIVE");
        when(groupFolderShareRepository.findByFolderAndGroup(folder, group)).thenReturn(Optional.of(existing));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderShareService.shareFolderToGroup(10, req, "owner@gmail.com");
        });
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void shareFolderToGroup_ReactivateRevoked() {
        GroupFolderShareRequest req = new GroupFolderShareRequest(50);

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(folderRepository.findById(10)).thenReturn(Optional.of(folder));
        when(studyGroupRepository.findById(50)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, owner, "ACTIVE")).thenReturn(true);

        GroupFolderShare existing = new GroupFolderShare();
        existing.setFolder(folder);
        existing.setGroup(group);
        existing.setSharedBy(owner);
        existing.setStatus("REVOKED");
        when(groupFolderShareRepository.findByFolderAndGroup(folder, group)).thenReturn(Optional.of(existing));
        when(groupFolderShareRepository.save(existing)).thenReturn(existing);

        FolderShareResponse res = folderShareService.shareFolderToGroup(10, req, "owner@gmail.com");

        assertNotNull(res);
        assertEquals("ACTIVE", res.getStatus());
        verify(groupFolderShareRepository, times(1)).save(existing);
    }

    @Test
    void getGroupFolders_Success() {
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(studyGroupRepository.findById(50)).thenReturn(Optional.of(group));
        when(studyGroupMemberRepository.existsByGroupAndUserAndStatus(group, recipient, "ACTIVE")).thenReturn(true);

        GroupFolderShare gfs = new GroupFolderShare();
        gfs.setShareId(300);
        gfs.setFolder(folder);
        gfs.setGroup(group);
        gfs.setSharedBy(owner);
        gfs.setStatus("ACTIVE");

        when(groupFolderShareRepository.findActiveSharesForGroup(group)).thenReturn(Collections.singletonList(gfs));

        List<FolderShareResponse> list = folderShareService.getGroupFolders(50, "recipient@gmail.com");

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals(300, list.get(0).getShareId());
    }

    @Test
    void revokeGroupFolderShare_ByFolderOwner_Success() {
        GroupFolderShare gfs = new GroupFolderShare();
        gfs.setShareId(300);
        gfs.setFolder(folder);
        gfs.setGroup(group);
        gfs.setSharedBy(owner);
        gfs.setStatus("ACTIVE");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(groupFolderShareRepository.findById(300)).thenReturn(Optional.of(gfs));

        folderShareService.revokeGroupFolderShare(300, "owner@gmail.com");

        assertEquals("REVOKED", gfs.getStatus());
        verify(groupFolderShareRepository, times(1)).save(gfs);
    }

    @Test
    void revokeGroupFolderShare_ByGroupOwner_Success() {
        folder.setOwner(external);

        GroupFolderShare gfs = new GroupFolderShare();
        gfs.setShareId(300);
        gfs.setFolder(folder);
        gfs.setGroup(group);
        gfs.setSharedBy(external);
        gfs.setStatus("ACTIVE");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(groupFolderShareRepository.findById(300)).thenReturn(Optional.of(gfs));

        folderShareService.revokeGroupFolderShare(300, "owner@gmail.com");

        assertEquals("REVOKED", gfs.getStatus());
        verify(groupFolderShareRepository, times(1)).save(gfs);
    }

    @Test
    void revokeGroupFolderShare_ByOtherMember_ThrowsForbidden() {
        GroupFolderShare gfs = new GroupFolderShare();
        gfs.setShareId(300);
        gfs.setFolder(folder);
        gfs.setGroup(group);
        gfs.setSharedBy(owner);
        gfs.setStatus("ACTIVE");

        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(groupFolderShareRepository.findById(300)).thenReturn(Optional.of(gfs));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderShareService.revokeGroupFolderShare(300, "recipient@gmail.com");
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(groupFolderShareRepository, never()).save(any());
    }

    // =========================================================================
    // Recursive Hierarchy Check Tests
    // =========================================================================

    @Test
    void hasAccessToFolder_DirectShareSuccess() {
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(folderRepository.findById(20)).thenReturn(Optional.of(subfolder));

        when(folderShareRepository.findByFolderAndSharedWithUserAndStatus(subfolder, recipient, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupFolderShareRepository.hasActiveGroupShareForUser(20, 2)).thenReturn(false);

        when(folderShareRepository.findByFolderAndSharedWithUserAndStatus(folder, recipient, "ACTIVE"))
                .thenReturn(Optional.of(new FolderShare()));

        boolean hasAccess = folderShareService.hasAccessToFolder(20, "recipient@gmail.com");

        assertTrue(hasAccess);
    }

    @Test
    void hasAccessToFolder_GroupShareSuccess() {
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(folderRepository.findById(20)).thenReturn(Optional.of(subfolder));

        when(folderShareRepository.findByFolderAndSharedWithUserAndStatus(subfolder, recipient, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupFolderShareRepository.hasActiveGroupShareForUser(20, 2)).thenReturn(false);

        when(folderShareRepository.findByFolderAndSharedWithUserAndStatus(folder, recipient, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupFolderShareRepository.hasActiveGroupShareForUser(10, 2)).thenReturn(true);

        boolean hasAccess = folderShareService.hasAccessToFolder(20, "recipient@gmail.com");

        assertTrue(hasAccess);
    }

    @Test
    void hasAccessToFolder_NoShare_ReturnsFalse() {
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(folderRepository.findById(20)).thenReturn(Optional.of(subfolder));

        when(folderShareRepository.findByFolderAndSharedWithUserAndStatus(subfolder, recipient, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupFolderShareRepository.hasActiveGroupShareForUser(20, 2)).thenReturn(false);

        when(folderShareRepository.findByFolderAndSharedWithUserAndStatus(folder, recipient, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(groupFolderShareRepository.hasActiveGroupShareForUser(10, 2)).thenReturn(false);

        boolean hasAccess = folderShareService.hasAccessToFolder(20, "recipient@gmail.com");

        assertFalse(hasAccess);
    }

    @Test
    void revokeFolderShare_AlreadyRevoked_ThrowsNotFound() {
        FolderShare share = new FolderShare();
        share.setShareId(15);
        share.setStatus("REVOKED");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(folderShareRepository.findById(15)).thenReturn(Optional.of(share));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderShareService.revokeFolderShare(15, "owner@gmail.com");
        });
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void revokeGroupFolderShare_AlreadyRevoked_ThrowsNotFound() {
        GroupFolderShare gfs = new GroupFolderShare();
        gfs.setShareId(300);
        gfs.setStatus("REVOKED");

        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(groupFolderShareRepository.findById(300)).thenReturn(Optional.of(gfs));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            folderShareService.revokeGroupFolderShare(300, "owner@gmail.com");
        });
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void getSharedContent_OwnerPermission_Success() {
        when(userRepository.findByEmail("owner@gmail.com")).thenReturn(Optional.of(owner));
        when(folderRepository.findById(10)).thenReturn(Optional.of(folder));
        when(folderRepository.findByOwnerAndStatusAndParentFolder(owner, "ACTIVE", folder))
                .thenReturn(Collections.emptyList());
        when(documentRepository.findByFolder(folder))
                .thenReturn(Collections.emptyList());

        SharedFolderContentResponse res = folderShareService.getSharedContent(10, "owner@gmail.com");

        assertNotNull(res);
        assertEquals("OWNER", res.getPermission());
        assertFalse(res.getIsSharedView());
        assertTrue(res.getCanUpload());
        assertTrue(res.getCanEdit());
        assertTrue(res.getCanDelete());
        assertTrue(res.getCanMove());
    }

    @Test
    void getSharedFoldersWithMe_AsRecipient_ShouldHideEmails() {
        FolderShare share = new FolderShare();
        share.setShareId(1);
        share.setFolder(folder);
        share.setSharedBy(owner);
        share.setSharedWithUser(recipient);
        share.setStatus("ACTIVE");

        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(folderShareRepository.findBySharedWithUserAndStatus(recipient, "ACTIVE"))
                .thenReturn(List.of(share));

        List<FolderShareResponse> responses = folderShareService.getSharedWithMe("recipient@gmail.com");

        assertNotNull(responses);
        assertEquals(1, responses.size());
        assertNull(responses.get(0).getOwnerEmail());
        assertNull(responses.get(0).getSharedByEmail());
        assertNull(responses.get(0).getSharedWithEmail());
        assertEquals("Folder Owner", responses.get(0).getOwnerName());
        assertEquals("Folder Owner", responses.get(0).getSharedByName());
        assertEquals("Recipient User", responses.get(0).getSharedWithName());
    }

    @Test
    void getSharedContent_RecipientPermission_Success() {
        when(userRepository.findByEmail("recipient@gmail.com")).thenReturn(Optional.of(recipient));
        when(folderRepository.findById(10)).thenReturn(Optional.of(folder));

        FolderShare share = new FolderShare();
        share.setShareId(1);
        share.setFolder(folder);
        share.setSharedBy(owner);
        share.setSharedWithUser(recipient);
        share.setStatus("ACTIVE");

        when(folderShareRepository.findByFolderAndSharedWithUserAndStatus(folder, recipient, "ACTIVE"))
                .thenReturn(Optional.of(share));
        when(folderRepository.findByOwnerAndStatusAndParentFolder(owner, "ACTIVE", folder))
                .thenReturn(Collections.emptyList());

        com.demo.ai_study_hub.entity.Document doc = new com.demo.ai_study_hub.entity.Document();
        doc.setDocumentId(100);
        doc.setTitle("Shared Document");
        doc.setOwner(owner);
        doc.setStatus("ACTIVE");

        when(documentRepository.findByFolder(folder))
                .thenReturn(List.of(doc));
        when(documentContentRepository.findStatusesByDocumentIds(anyList()))
                .thenReturn(Collections.emptyList());

        SharedFolderContentResponse res = folderShareService.getSharedContent(10, "recipient@gmail.com");

        assertNotNull(res);
        assertEquals("VIEW", res.getPermission());
        assertTrue(res.getIsSharedView());
        assertFalse(res.getCanUpload());
        assertFalse(res.getCanEdit());
        assertFalse(res.getCanDelete());
        assertFalse(res.getCanMove());

        assertNull(res.getCurrentFolder().getOwnerEmail());
        assertEquals("Folder Owner", res.getCurrentFolder().getOwnerName());

        assertEquals(1, res.getDocuments().size());
        assertNull(res.getDocuments().get(0).getUploadedBy());
        assertEquals("Folder Owner", res.getDocuments().get(0).getUploadedByName());
    }
}
