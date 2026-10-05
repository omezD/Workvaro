package com.ems.employee.mapper;

import com.ems.employee.dto.EmployeeDetailDto;
import com.ems.employee.dto.EmployeeSummaryDto;
import com.ems.employee.dto.InternalEmployeeDto;
import com.ems.employee.entity.Employee;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface EmployeeMapper {

    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    @Mapping(target = "designationId", source = "designation.id")
    @Mapping(target = "designationTitle", source = "designation.title")
    EmployeeSummaryDto toSummary(Employee employee);

    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    @Mapping(target = "designationId", source = "designation.id")
    @Mapping(target = "designationTitle", source = "designation.title")
    @Mapping(target = "managerId", source = "manager.id")
    @Mapping(target = "managerName", source = "manager.fullName")
    @Mapping(target = "bankAccountMasked", constant = "false")
    EmployeeDetailDto toDetail(Employee employee);

    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    @Mapping(target = "managerId", source = "manager.id")
    @Mapping(target = "managerKeycloakUserId", source = "manager.keycloakUserId")
    InternalEmployeeDto toInternal(Employee employee);
}
