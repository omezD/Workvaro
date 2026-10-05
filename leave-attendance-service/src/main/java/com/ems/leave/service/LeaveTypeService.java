package com.ems.leave.service;

import com.ems.common.exception.ApiException;
import com.ems.leave.dto.LeaveTypeDto;
import com.ems.leave.dto.LeaveTypeRequest;
import com.ems.leave.entity.LeaveType;
import com.ems.leave.mapper.LeaveMapper;
import com.ems.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Quota changes apply to balances created afterwards (i.e. next year, or employees who have not
 * opened their balance yet); existing balance rows are not rewritten.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaveTypeService {

    private static final String ENTITY = "LeaveType";

    private final LeaveTypeRepository repository;
    private final LeaveMapper mapper;
    private final AuditService audit;

    public List<LeaveTypeDto> findAll(boolean activeOnly) {
        List<LeaveType> types = activeOnly ? repository.findByActiveTrueOrderByNameAsc()
                : repository.findAllByOrderByNameAsc();
        return types.stream().map(mapper::toDto).toList();
    }

    @Transactional
    public LeaveTypeDto create(LeaveTypeRequest request) {
        if (repository.existsByCodeIgnoreCaseOrNameIgnoreCase(request.code(), request.name())) {
            throw ApiException.conflict("A leave type with this code or name already exists");
        }
        LeaveType type = new LeaveType();
        apply(type, request);
        repository.save(type);
        audit.record("CREATE", ENTITY, type.getId(), type.getCode() + " quota=" + type.getAnnualQuota());
        return mapper.toDto(type);
    }

    @Transactional
    public LeaveTypeDto update(Long id, LeaveTypeRequest request) {
        LeaveType type = get(id);
        if (repository.existsByCodeIgnoreCaseAndIdNot(request.code(), id)
                || repository.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw ApiException.conflict("A leave type with this code or name already exists");
        }
        apply(type, request);
        audit.record("UPDATE", ENTITY, id, type.getCode() + " quota=" + type.getAnnualQuota()
                + " active=" + type.isActive());
        return mapper.toDto(type);
    }

    public LeaveType get(Long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Leave type", id));
    }

    private void apply(LeaveType type, LeaveTypeRequest request) {
        mapper.update(type, request);
        type.setCode(request.code().toUpperCase());
        if (request.unlimited()) {
            type.setAnnualQuota(0);
        }
    }
}
