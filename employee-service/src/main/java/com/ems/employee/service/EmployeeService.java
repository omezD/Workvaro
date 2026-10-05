package com.ems.employee.service;

import com.ems.common.crypto.Masking;
import com.ems.common.dto.PageResponse;
import com.ems.common.exception.ApiException;
import com.ems.common.security.CurrentUser;
import com.ems.employee.dto.EmployeeCreateRequest;
import com.ems.employee.dto.EmployeeDetailDto;
import com.ems.employee.dto.EmployeeStatsDto;
import com.ems.employee.dto.EmployeeStatsDto.DepartmentHeadcountDto;
import com.ems.employee.dto.EmployeeStatusRequest;
import com.ems.employee.dto.EmployeeSummaryDto;
import com.ems.employee.dto.EmployeeUpdateRequest;
import com.ems.employee.dto.InternalEmployeeDto;
import com.ems.employee.dto.MyProfileUpdateRequest;
import com.ems.employee.entity.Employee;
import com.ems.employee.entity.EmployeeStatus;
import com.ems.employee.mapper.EmployeeMapper;
import com.ems.employee.repository.EmployeeRepository;
import com.ems.employee.repository.EmployeeSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EmployeeService {

    private static final String ENTITY = "Employee";
    private static final int MAX_MANAGER_CHAIN = 50;

    private final EmployeeRepository repository;
    private final DepartmentService departmentService;
    private final DesignationService designationService;
    private final EmployeeMapper mapper;
    private final AuditService audit;
    private final CurrentUser currentUser;

    // ---------- directory & profile reads ----------

    public PageResponse<EmployeeSummaryDto> directory(String search, Long departmentId, EmployeeStatus status,
                                                      Pageable pageable) {
        Set<EmployeeStatus> statuses = status != null && currentUser.isHrOrAdmin()
                ? EnumSet.of(status)
                : EmployeeStatus.CURRENT;
        Specification<Employee> spec = Specification.allOf(
                EmployeeSpecifications.statusIn(statuses),
                EmployeeSpecifications.search(search),
                EmployeeSpecifications.inDepartment(departmentId));
        return PageResponse.from(repository.findAll(spec, pageable), mapper::toSummary);
    }

    /**
     * Ownership rule: HR/Admin and the employee themself get the full profile; the employee's direct
     * manager gets it with the bank account masked; everyone else gets 403 and should use the directory.
     */
    public EmployeeDetailDto findById(Long id) {
        Employee employee = getWithDetails(id);
        String me = currentUser.id();
        if (currentUser.isHrOrAdmin() || me.equals(employee.getKeycloakUserId())) {
            return mapper.toDetail(employee);
        }
        if (employee.getManager() != null && me.equals(employee.getManager().getKeycloakUserId())) {
            return masked(employee);
        }
        throw ApiException.forbidden("You can only view your own profile or your direct reports");
    }

    @Transactional
    public EmployeeDetailDto me() {
        return mapper.toDetail(findOrLinkCurrent());
    }

    public List<EmployeeSummaryDto> myTeam() {
        return repository.findByManagerKeycloakUserIdAndStatusInOrderByFirstNameAsc(currentUser.id(),
                        EmployeeStatus.CURRENT)
                .stream().map(mapper::toSummary).toList();
    }

    public EmployeeStatsDto stats() {
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (EmployeeStatus s : EmployeeStatus.values()) {
            byStatus.put(s.name(), 0L);
        }
        repository.countByStatus().forEach(c -> byStatus.put(c.getStatus().name(), c.getTotal()));
        List<DepartmentHeadcountDto> byDepartment = repository.headcountByDepartment(EmployeeStatus.CURRENT).stream()
                .map(h -> new DepartmentHeadcountDto(h.getDepartmentId(),
                        h.getDepartmentName() == null ? "Unassigned" : h.getDepartmentName(), h.getHeadcount()))
                .toList();
        return new EmployeeStatsDto(repository.countByStatusIn(EmployeeStatus.CURRENT), byStatus, byDepartment);
    }

    // ---------- HR writes ----------

    @Transactional
    public EmployeeDetailDto create(EmployeeCreateRequest req) {
        if (repository.existsByEmpCodeIgnoreCase(req.empCode())) {
            throw ApiException.conflict("Employee code already exists");
        }
        if (repository.existsByEmailIgnoreCase(req.email())) {
            throw ApiException.conflict("Email already belongs to another employee");
        }
        String keycloakUserId = blankToNull(req.keycloakUserId());
        if (keycloakUserId != null && repository.existsByKeycloakUserId(keycloakUserId)) {
            throw ApiException.conflict("This login is already linked to another employee");
        }
        Employee e = new Employee();
        e.setKeycloakUserId(keycloakUserId);
        e.setEmpCode(req.empCode().toUpperCase());
        e.setFirstName(req.firstName().trim());
        e.setLastName(req.lastName().trim());
        e.setEmail(req.email().trim().toLowerCase());
        e.setPhone(req.phone());
        e.setDateOfBirth(req.dateOfBirth());
        e.setJoinDate(req.joinDate());
        e.setDepartment(req.departmentId() == null ? null : departmentService.get(req.departmentId()));
        e.setDesignation(req.designationId() == null ? null : designationService.get(req.designationId()));
        e.setBankAccount(req.bankAccount());
        e.setAddress(req.address());
        e.setEmergencyContactName(req.emergencyContactName());
        e.setEmergencyContactPhone(req.emergencyContactPhone());
        e.setStatus(EmployeeStatus.ACTIVE);
        repository.save(e);
        e.setManager(resolveManager(e, req.managerId()));
        audit.record("CREATE", ENTITY, e.getId(), "Created " + e.getEmpCode() + " " + e.getFullName());
        return mapper.toDetail(e);
    }

    @Transactional
    public EmployeeDetailDto update(Long id, EmployeeUpdateRequest req) {
        Employee e = getWithDetails(id);
        if (repository.existsByEmailIgnoreCaseAndIdNot(req.email(), id)) {
            throw ApiException.conflict("Email already belongs to another employee");
        }
        String keycloakUserId = blankToNull(req.keycloakUserId());
        if (keycloakUserId != null && !keycloakUserId.equals(e.getKeycloakUserId())
                && repository.existsByKeycloakUserId(keycloakUserId)) {
            throw ApiException.conflict("This login is already linked to another employee");
        }
        List<String> changed = new ArrayList<>();
        track(changed, "keycloakUserId", e.getKeycloakUserId(), keycloakUserId);
        track(changed, "email", e.getEmail(), req.email().trim().toLowerCase());
        track(changed, "departmentId", idOf(e.getDepartment()), req.departmentId());
        track(changed, "designationId", idOf(e.getDesignation()), req.designationId());
        track(changed, "managerId", e.getManager() == null ? null : e.getManager().getId(), req.managerId());

        e.setKeycloakUserId(keycloakUserId);
        e.setFirstName(req.firstName().trim());
        e.setLastName(req.lastName().trim());
        e.setEmail(req.email().trim().toLowerCase());
        e.setPhone(req.phone());
        e.setDateOfBirth(req.dateOfBirth());
        e.setJoinDate(req.joinDate());
        e.setDepartment(req.departmentId() == null ? null : departmentService.get(req.departmentId()));
        e.setDesignation(req.designationId() == null ? null : designationService.get(req.designationId()));
        e.setManager(resolveManager(e, req.managerId()));
        if (req.bankAccount() != null) {
            e.setBankAccount(req.bankAccount());
            changed.add("bankAccount");
        }
        e.setAddress(req.address());
        e.setEmergencyContactName(req.emergencyContactName());
        e.setEmergencyContactPhone(req.emergencyContactPhone());
        audit.record("UPDATE", ENTITY, id, changed.isEmpty() ? "Profile fields updated" : "Changed: " + changed);
        return mapper.toDetail(e);
    }

    @Transactional
    public EmployeeDetailDto changeStatus(Long id, EmployeeStatusRequest req) {
        Employee e = getWithDetails(id);
        if (e.getStatus() == req.status()) {
            return mapper.toDetail(e);
        }
        if (Objects.equals(currentUser.id(), e.getKeycloakUserId())) {
            throw ApiException.forbidden("You cannot change your own employment status");
        }
        String details = e.getStatus() + " -> " + req.status() + (req.reason() == null ? "" : " (" + req.reason() + ")");
        e.setStatus(req.status());
        audit.record("STATUS_CHANGE", ENTITY, id, details);
        return mapper.toDetail(e);
    }

    @Transactional
    public EmployeeDetailDto updateMe(MyProfileUpdateRequest req) {
        Employee e = findOrLinkCurrent();
        e.setPhone(req.phone());
        e.setAddress(req.address());
        e.setEmergencyContactName(req.emergencyContactName());
        e.setEmergencyContactPhone(req.emergencyContactPhone());
        audit.record("SELF_UPDATE", ENTITY, e.getId(), "Contact details updated by the employee");
        return mapper.toDetail(e);
    }

    // ---------- internal (service-to-service) ----------

    @Transactional
    public InternalEmployeeDto internalByUser(String keycloakUserId) {
        if (keycloakUserId.equals(currentUser.id())) {
            return mapper.toInternal(findOrLinkCurrent());
        }
        return repository.findByKeycloakUserId(keycloakUserId)
                .map(mapper::toInternal)
                .orElseThrow(() -> ApiException.notFound("No employee linked to user " + keycloakUserId));
    }

    public List<InternalEmployeeDto> internalTeam(String managerKeycloakUserId) {
        return repository.findByManagerKeycloakUserIdAndStatusInOrderByFirstNameAsc(managerKeycloakUserId,
                EmployeeStatus.CURRENT).stream().map(mapper::toInternal).toList();
    }

    public List<InternalEmployeeDto> internalActive() {
        return repository.findByStatusInOrderByFirstNameAsc(EmployeeStatus.CURRENT).stream()
                .map(mapper::toInternal).toList();
    }

    // ---------- helpers ----------

    /**
     * Finds the caller's employee record. On first sign-in an HR-created record with the same email
     * (and no login yet) is linked to the Keycloak account automatically.
     */
    Employee findOrLinkCurrent() {
        return repository.findByKeycloakUserId(currentUser.id()).orElseGet(() -> {
            String email = currentUser.email();
            Employee e = email == null ? null
                    : repository.findByEmailIgnoreCaseAndKeycloakUserIdIsNull(email).orElse(null);
            if (e == null) {
                throw ApiException.notFound("No employee profile is linked to your account. Please contact HR.");
            }
            e.setKeycloakUserId(currentUser.id());
            audit.record("LINK_ACCOUNT", ENTITY, e.getId(), "Linked to login " + currentUser.username());
            return e;
        });
    }

    private Employee getWithDetails(Long id) {
        return repository.findWithDetailsById(id).orElseThrow(() -> ApiException.notFound(ENTITY, id));
    }

    private Employee resolveManager(Employee employee, Long managerId) {
        if (managerId == null) {
            return null;
        }
        if (managerId.equals(employee.getId())) {
            throw ApiException.badRequest("An employee cannot be their own manager");
        }
        Employee manager = repository.findById(managerId)
                .orElseThrow(() -> ApiException.badRequest("Manager " + managerId + " does not exist"));
        if (!EmployeeStatus.CURRENT.contains(manager.getStatus())) {
            throw ApiException.badRequest("Manager is no longer an active employee");
        }
        Employee cursor = manager;
        for (int i = 0; cursor != null && i < MAX_MANAGER_CHAIN; i++) {
            if (cursor.getId().equals(employee.getId())) {
                throw ApiException.badRequest("This manager assignment would create a reporting cycle");
            }
            cursor = cursor.getManager();
        }
        return manager;
    }

    private EmployeeDetailDto masked(Employee employee) {
        return mapper.toDetail(employee).withMaskedBankAccount(Masking.maskAllButLast4(employee.getBankAccount()));
    }

    private static Long idOf(com.ems.employee.entity.BaseEntity entity) {
        return entity == null ? null : entity.getId();
    }

    private static void track(List<String> changed, String field, Object before, Object after) {
        if (!Objects.equals(before, after)) {
            changed.add(field);
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
