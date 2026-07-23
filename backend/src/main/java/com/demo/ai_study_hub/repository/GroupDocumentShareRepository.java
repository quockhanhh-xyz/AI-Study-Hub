package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.GroupDocumentShare;
import com.demo.ai_study_hub.entity.StudyGroup;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupDocumentShareRepository extends JpaRepository<GroupDocumentShare, Integer> {

    Optional<GroupDocumentShare> findByDocumentAndGroupAndStatus(Document document, StudyGroup group, String status);

    List<GroupDocumentShare> findByDocumentAndStatus(Document document, String status);

    List<GroupDocumentShare> findByGroupAndSharedByAndStatus(StudyGroup group, User sharedBy, String status);

    @Query("SELECT gds FROM GroupDocumentShare gds WHERE gds.group = :group AND gds.status = 'ACTIVE' AND gds.document.status = 'ACTIVE' AND gds.group.status = 'ACTIVE' AND gds.document.owner.status = 'ACTIVE'")
    List<GroupDocumentShare> findActiveSharesForGroup(@Param("group") StudyGroup group);

    @Query("SELECT gds.group.groupId AS groupId, COUNT(gds) AS cnt FROM GroupDocumentShare gds " +
           "WHERE gds.group.groupId IN :groupIds AND gds.status = 'ACTIVE' AND gds.document.status = 'ACTIVE' AND gds.document.owner.status = 'ACTIVE' " +
           "GROUP BY gds.group.groupId")
    List<Object[]> countActiveSharesByGroupIds(@Param("groupIds") List<Integer> groupIds);

    void deleteByDocument(Document document);

    long countBySharedByAndStatus(User sharedBy, String status);
}
