package com.demo.ai_study_hub.repository;

import com.demo.ai_study_hub.entity.Folder;
import com.demo.ai_study_hub.entity.GroupFolderShare;
import com.demo.ai_study_hub.entity.StudyGroup;
import com.demo.ai_study_hub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupFolderShareRepository extends JpaRepository<GroupFolderShare, Integer> {

    Optional<GroupFolderShare> findByFolderAndGroup(Folder folder, StudyGroup group);

    List<GroupFolderShare> findByFolderAndStatus(Folder folder, String status);

    List<GroupFolderShare> findByGroupAndSharedByAndStatus(StudyGroup group, User sharedBy, String status);

    @Query("SELECT gfs FROM GroupFolderShare gfs WHERE gfs.group = :group AND gfs.status = 'ACTIVE' AND gfs.folder.status = 'ACTIVE' AND gfs.group.status = 'ACTIVE'")
    List<GroupFolderShare> findActiveSharesForGroup(@Param("group") StudyGroup group);

    @Query("SELECT gfs FROM GroupFolderShare gfs WHERE gfs.folder = :folder AND gfs.status = 'ACTIVE' AND gfs.group.status = 'ACTIVE'")
    List<GroupFolderShare> findActiveSharesForFolder(@Param("folder") Folder folder);

    @Query("SELECT COUNT(gfs) > 0 FROM GroupFolderShare gfs " +
           "JOIN StudyGroupMember sgm ON gfs.group = sgm.group " +
           "WHERE gfs.folder.folderId = :folderId " +
           "AND gfs.status = 'ACTIVE' " +
           "AND sgm.user.userId = :userId " +
           "AND sgm.status = 'ACTIVE' " +
           "AND gfs.group.status = 'ACTIVE'")
    boolean hasActiveGroupShareForUser(@Param("folderId") Integer folderId, @Param("userId") Integer userId);

    @Query("SELECT gfs.group.groupId AS groupId, COUNT(gfs) AS cnt FROM GroupFolderShare gfs " +
           "WHERE gfs.group.groupId IN :groupIds AND gfs.status = 'ACTIVE' AND gfs.folder.status = 'ACTIVE' " +
           "GROUP BY gfs.group.groupId")
    List<Object[]> countActiveSharesByGroupIds(@Param("groupIds") List<Integer> groupIds);

    void deleteByFolder(Folder folder);

    long countBySharedByAndStatus(User sharedBy, String status);
}
