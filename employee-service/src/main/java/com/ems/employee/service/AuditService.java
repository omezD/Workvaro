package com.ems.employee.service;

import com.ems.common.security.CurrentUser;
import com.ems.employee.entity.AuditLog;
import com.ems.employee.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Writes audit rows in the caller's transaction, so a rolled-back change leaves no audit entry. */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;
    private final CurrentUser currentUser;

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String action, String entityType, Object entityId, String details) {
        AuditLog log = new AuditLog();
        log.setActorUserId(currentUser.id());
        log.setActorName(currentUser.username());
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId == null ? null : entityId.toString());
        log.setDetails(details == null || details.length() <= 2000 ? details : details.substring(0, 2000));
        repository.save(log);
    }
}
