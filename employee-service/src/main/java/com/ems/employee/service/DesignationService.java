package com.ems.employee.service;

import com.ems.common.exception.ApiException;
import com.ems.employee.dto.DesignationDto;
import com.ems.employee.dto.DesignationRequest;
import com.ems.employee.entity.Designation;
import com.ems.employee.mapper.OrgMapper;
import com.ems.employee.repository.DesignationRepository;
import com.ems.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DesignationService {

    private static final String ENTITY = "Designation";

    private final DesignationRepository repository;
    private final EmployeeRepository employeeRepository;
    private final OrgMapper mapper;
    private final AuditService audit;

    public List<DesignationDto> findAll() {
        return repository.findAll(Sort.by("level", "title")).stream().map(mapper::toDto).toList();
    }

    public DesignationDto findById(Long id) {
        return mapper.toDto(get(id));
    }

    @Transactional
    public DesignationDto create(DesignationRequest request) {
        if (repository.existsByTitleIgnoreCase(request.title())) {
            throw ApiException.conflict("A designation with this title already exists");
        }
        Designation designation = new Designation();
        mapper.update(designation, request);
        repository.save(designation);
        audit.record("CREATE", ENTITY, designation.getId(), designation.getTitle());
        return mapper.toDto(designation);
    }

    @Transactional
    public DesignationDto update(Long id, DesignationRequest request) {
        Designation designation = get(id);
        if (repository.existsByTitleIgnoreCaseAndIdNot(request.title(), id)) {
            throw ApiException.conflict("A designation with this title already exists");
        }
        mapper.update(designation, request);
        audit.record("UPDATE", ENTITY, id, designation.getTitle());
        return mapper.toDto(designation);
    }

    @Transactional
    public void delete(Long id) {
        Designation designation = get(id);
        if (employeeRepository.existsByDesignationId(id)) {
            throw ApiException.conflict("Designation is still assigned to employees");
        }
        repository.delete(designation);
        audit.record("DELETE", ENTITY, id, designation.getTitle());
    }

    Designation get(Long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound(ENTITY, id));
    }
}
