package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.CreateCustomSubjectRequest;
import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.SubjectMyLibraryResponse;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import com.demo.ai_study_hub.service.DocumentService;
import com.demo.ai_study_hub.service.SubjectService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubjectServiceMyLibraryTest {

    @Mock
    private SubjectRepository subjectRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private DocumentService documentService;

    @InjectMocks
    private SubjectService subjectService;

    private User user;
    private Subject systemSubject;
    private Subject customSubject;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUserId(1);
        user.setEmail("user@test.com");

        systemSubject = new Subject();
        systemSubject.setSubjectId(10);
        systemSubject.setSubjectCode("SYS101");
        systemSubject.setSubjectName("System Subject");
        systemSubject.setScope("SYSTEM");
        systemSubject.setStatus("ACTIVE");

        customSubject = new Subject();
        customSubject.setSubjectId(20);
        customSubject.setSubjectCode("CUST201");
        customSubject.setSubjectName("Custom Subject");
        customSubject.setScope("USER_CUSTOM");
        customSubject.setStatus("ACTIVE");
        customSubject.setOwner(user);
    }

    @Test
    void getMyLibrarySubjects_Success() {
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(subjectRepository.findVisibleSubjects(user)).thenReturn(Arrays.asList(systemSubject, customSubject));
        when(documentRepository.countBySubjectAndOwnerAndStatus(systemSubject, user, "ACTIVE")).thenReturn(2L);
        when(documentRepository.countBySubjectAndOwnerAndStatus(customSubject, user, "ACTIVE")).thenReturn(5L);
        when(documentRepository.countBySubjectAndStatus(customSubject, "ACTIVE")).thenReturn(5L);

        List<SubjectMyLibraryResponse> responses = subjectService.getMyLibrarySubjects(user.getEmail());

        assertEquals(2, responses.size());
        
        SubjectMyLibraryResponse sysRes = responses.get(0);
        assertEquals(10, sysRes.getSubjectId());
        assertEquals("SYSTEM", sysRes.getSourceType());
        assertEquals(2L, sysRes.getDocumentCount());
        assertFalse(sysRes.getCanEdit());
        assertFalse(sysRes.getCanDelete());

        SubjectMyLibraryResponse custRes = responses.get(1);
        assertEquals(20, custRes.getSubjectId());
        assertEquals("PERSONAL", custRes.getSourceType());
        assertEquals(5L, custRes.getDocumentCount());
        assertTrue(custRes.getCanEdit());
        assertFalse(custRes.getCanDelete()); // In use, canDelete should be false
    }

    @Test
    void getSubjectDocuments_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Document doc = new Document();
        doc.setDocumentId(100);
        doc.setTitle("Test Doc");

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(subjectRepository.findById(customSubject.getSubjectId())).thenReturn(Optional.of(customSubject));
        
        Page<Document> page = new PageImpl<>(Arrays.asList(doc), pageable, 1);
        when(documentRepository.findBySubjectAndOwnerAndStatus(customSubject, user, "ACTIVE", pageable)).thenReturn(page);
        
        DocumentResponse docRes = DocumentResponse.builder().documentId(100).title("Test Doc").build();
        when(documentService.mapToResponse(doc, user)).thenReturn(docRes);

        Page<DocumentResponse> result = subjectService.getSubjectDocuments(customSubject.getSubjectId(), user.getEmail(), pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(100, result.getContent().get(0).getDocumentId());
    }

    @Test
    void getSubjectDocuments_Forbidden_SubjectInactive() {
        customSubject.setStatus("DISABLED");
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(subjectRepository.findById(customSubject.getSubjectId())).thenReturn(Optional.of(customSubject));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            subjectService.getSubjectDocuments(customSubject.getSubjectId(), user.getEmail(), PageRequest.of(0, 10));
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Subject is inactive", ex.getReason());
    }

    @Test
    void updateCustomSubject_Success() {
        CreateCustomSubjectRequest req = new CreateCustomSubjectRequest();
        req.setSubjectCode(" NEWCODE ");
        req.setSubjectName("New Name");
        req.setDescription("New Desc");

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(subjectRepository.findById(customSubject.getSubjectId())).thenReturn(Optional.of(customSubject));
        when(subjectRepository.existsDuplicateCodeForUpdate("NEWCODE", user, customSubject.getSubjectId())).thenReturn(false);
        when(subjectRepository.save(any(Subject.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SubjectMyLibraryResponse result = subjectService.updateCustomSubject(customSubject.getSubjectId(), req, user.getEmail());

        assertNotNull(result);
        assertEquals("NEWCODE", result.getCode());
        assertEquals("New Name", result.getName());
        assertEquals("New Desc", result.getDescription());
    }

    @Test
    void updateCustomSubject_DuplicateCode_ThrowsConflict() {
        CreateCustomSubjectRequest req = new CreateCustomSubjectRequest();
        req.setSubjectCode("SYS101");
        req.setSubjectName("New Name");

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(subjectRepository.findById(customSubject.getSubjectId())).thenReturn(Optional.of(customSubject));
        when(subjectRepository.existsDuplicateCodeForUpdate("SYS101", user, customSubject.getSubjectId())).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            subjectService.updateCustomSubject(customSubject.getSubjectId(), req, user.getEmail());
        });
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void deleteCustomSubject_Success() {
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(subjectRepository.findById(customSubject.getSubjectId())).thenReturn(Optional.of(customSubject));
        when(documentRepository.countBySubjectAndStatus(customSubject, "ACTIVE")).thenReturn(0L);

        subjectService.deleteCustomSubject(customSubject.getSubjectId(), user.getEmail());

        assertEquals("DISABLED", customSubject.getStatus());
        verify(subjectRepository, times(1)).save(customSubject);
    }

    @Test
    void deleteCustomSubject_InUse_ThrowsBadRequest() {
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(subjectRepository.findById(customSubject.getSubjectId())).thenReturn(Optional.of(customSubject));
        when(documentRepository.countBySubjectAndStatus(customSubject, "ACTIVE")).thenReturn(3L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            subjectService.deleteCustomSubject(customSubject.getSubjectId(), user.getEmail());
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("SUBJECT_IN_USE", ex.getReason());
    }
}
