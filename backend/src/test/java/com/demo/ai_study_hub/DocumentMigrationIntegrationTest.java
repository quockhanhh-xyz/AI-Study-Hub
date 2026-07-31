package com.demo.ai_study_hub;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.Subject;
import com.demo.ai_study_hub.entity.User;
import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class DocumentMigrationIntegrationTest {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    public void testMigratePersonalDocumentsToSystemSubject() {
        // Create user
        User owner = new User();
        owner.setEmail("migrator@test.com");
        owner.setFullName("Test Migrator");
        owner.setPasswordHash("hash");
        owner.setRole("USER");
        owner = userRepository.save(owner);

        // Create USER_CUSTOM subject
        Subject userCustomSubject = new Subject();
        userCustomSubject.setSubjectCode("WDU20C");
        userCustomSubject.setSubjectName("Design Pattern Personal");
        userCustomSubject.setScope("USER_CUSTOM");
        userCustomSubject.setOwner(owner);
        userCustomSubject.setStatus("ACTIVE");
        userCustomSubject = subjectRepository.save(userCustomSubject);

        // Create document using USER_CUSTOM subject
        Document doc = new Document();
        doc.setTitle("Design Patterns Notes");
        doc.setOwner(owner);
        doc.setSubject(userCustomSubject);
        doc.setStatus("ACTIVE");
        doc.setVisibility("PRIVATE");
        doc.setApprovalStatus("PENDING");
        doc.setOriginalFileName("notes.pdf");
        doc.setFileType("pdf");
        doc.setFileUrl("https://cloudinary.com/test.pdf");
        doc.setPublicId("test");
        doc.setFileSize(12345L);
        doc = documentRepository.save(doc);

        // Create SYSTEM subject with the same code
        Subject systemSubject = new Subject();
        systemSubject.setSubjectCode("WDU20C");
        systemSubject.setSubjectName("Design Pattern System");
        systemSubject.setScope("SYSTEM");
        systemSubject.setStatus("ACTIVE");
        systemSubject = subjectRepository.save(systemSubject);

        // Run migration query
        int updatedCount = documentRepository.migratePersonalDocumentsToSystemSubject(owner, "WDU20C", systemSubject);
        assertEquals(1, updatedCount);

        // Verify document now points to SYSTEM subject
        Document updatedDoc = documentRepository.findById(doc.getDocumentId()).orElseThrow();
        assertEquals(systemSubject.getSubjectId(), updatedDoc.getSubject().getSubjectId());
        assertEquals("SYSTEM", updatedDoc.getSubject().getScope());
    }
}
