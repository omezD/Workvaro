package com.ems.employee.repository;

import com.ems.employee.entity.Employee;
import com.ems.employee.entity.EmployeeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {

    @Override
    @EntityGraph(attributePaths = {"department", "designation"})
    Page<Employee> findAll(Specification<Employee> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"department", "designation", "manager"})
    Optional<Employee> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"department", "designation", "manager"})
    Optional<Employee> findByKeycloakUserId(String keycloakUserId);

    Optional<Employee> findByEmailIgnoreCaseAndKeycloakUserIdIsNull(String email);

    @EntityGraph(attributePaths = {"department", "designation", "manager"})
    List<Employee> findByManagerKeycloakUserIdAndStatusInOrderByFirstNameAsc(String managerKeycloakUserId,
                                                                              Collection<EmployeeStatus> statuses);

    @EntityGraph(attributePaths = {"department", "designation", "manager"})
    List<Employee> findByStatusInOrderByFirstNameAsc(Collection<EmployeeStatus> statuses);

    boolean existsByEmpCodeIgnoreCase(String empCode);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    boolean existsByKeycloakUserId(String keycloakUserId);

    boolean existsByDepartmentId(Long departmentId);

    boolean existsByDesignationId(Long designationId);

    long countByStatusIn(Collection<EmployeeStatus> statuses);

    @Query("""
            select d.id as departmentId, d.name as departmentName, count(e) as headcount
            from Employee e left join e.department d
            where e.status in :statuses
            group by d.id, d.name
            order by count(e) desc
            """)
    List<DepartmentHeadcount> headcountByDepartment(Collection<EmployeeStatus> statuses);

    @Query("select e.status as status, count(e) as total from Employee e group by e.status")
    List<StatusCount> countByStatus();

    interface DepartmentHeadcount {
        Long getDepartmentId();

        String getDepartmentName();

        long getHeadcount();
    }

    interface StatusCount {
        EmployeeStatus getStatus();

        long getTotal();
    }
}
