package com.ems.employee.mapper;

import com.ems.employee.dto.DepartmentDto;
import com.ems.employee.dto.DepartmentRequest;
import com.ems.employee.dto.DesignationDto;
import com.ems.employee.dto.DesignationRequest;
import com.ems.employee.entity.Department;
import com.ems.employee.entity.Designation;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper
public interface OrgMapper {

    DepartmentDto toDto(Department department);

    void update(@MappingTarget Department department, DepartmentRequest request);

    DesignationDto toDto(Designation designation);

    void update(@MappingTarget Designation designation, DesignationRequest request);
}
