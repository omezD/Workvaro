package com.ems.employee.service;

import com.ems.common.exception.ApiException;
import com.ems.employee.dto.DepartmentDto;
import com.ems.employee.dto.DepartmentRequest;
import com.ems.employee.entity.Department;
import com.ems.employee.mapper.OrgMapper;
import com.ems.employee.repository.DepartmentRepository;
import com.ems.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DepartmentService {

    private static final String ENTITY = "Department";

    private final DepartmentRepository repository;
    private final EmployeeRepository employeeRepository;
    private final OrgMapper mapper;
    private final AuditService audit;

    public List<DepartmentDto> findAll() {
        return repository.findAll(Sort.by("name")).stream().map(mapper::toDto).toList();
    }

    public DepartmentDto findById(Long id) {
        return mapper.toDto(get(id));
    }

    @Transactional
    public DepartmentDto create(DepartmentRequest request) {
        if (repository.existsByCodeIgnoreCase(request.code()) || repository.existsByNameIgnoreCase(request.name())) {
            throw ApiException.conflict("A department with this code or name already exists");
        }
        Department department = new Department();
        mapper.update(department, request);
        department.setCode(request.code().toUpperCase());
        repository.save(department);
        audit.record("CREATE", ENTITY, department.getId(), department.getName());
        return mapper.toDto(department);
    }

    @Transactional
    public DepartmentDto update(Long id, DepartmentRequest request) {
        Department department = get(id);
        if (repository.existsByCodeIgnoreCaseAndIdNot(request.code(), id)
                || repository.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw ApiException.conflict("A department with this code or name already exists");
        }
        mapper.update(department, request);
        department.setCode(request.code().toUpperCase());
        audit.record("UPDATE", ENTITY, id, department.getName());
        return mapper.toDto(department);
    }

    @Transactional
    public void delete(Long id) {
        Department department = get(id);
        if (employeeRepository.existsByDepartmentId(id)) {
            throw ApiException.conflict("Department still has employees; move them first");
        }
        repository.delete(department);
        audit.record("DELETE", ENTITY, id, department.getName());
    }

    Department get(Long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound(ENTITY, id));
    }
}
