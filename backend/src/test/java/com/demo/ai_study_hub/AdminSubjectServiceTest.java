package com.demo.ai_study_hub;

import com.demo.ai_study_hub.repository.DocumentRepository;
import com.demo.ai_study_hub.repository.SubjectRepository;
import com.demo.ai_study_hub.repository.SubjectRequestRepository;
import com.demo.ai_study_hub.service.AdminSubjectService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminSubjectServiceTest {

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private SubjectRequestRepository subjectRequestRepository;

    @InjectMocks
    private AdminSubjectService adminSubjectService;

    @Test
    void getSubjectStats_Success() {
        when(subjectRepository.countSystemSubjectsFiltered(null)).thenReturn(10L);
        when(subjectRepository.countSystemSubjectsFilteredByStatus("ACTIVE", null)).thenReturn(8L);
        when(subjectRepository.countSystemSubjectsFilteredByStatus("INACTIVE", null)).thenReturn(2L);
        when(subjectRequestRepository.countFilteredRequestsByStatus("PENDING", null)).thenReturn(3L);

        Map<String, Long> stats = adminSubjectService.getSubjectStats(null);

        assertEquals(10L, stats.get("total"));
        assertEquals(8L, stats.get("active"));
        assertEquals(2L, stats.get("inactive"));
        assertEquals(3L, stats.get("pendingRequests"));
    }
}
