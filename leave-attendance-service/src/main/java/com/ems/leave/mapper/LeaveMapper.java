package com.ems.leave.mapper;

import com.ems.leave.dto.AttendanceDto;
import com.ems.leave.dto.CorrectionDto;
import com.ems.leave.dto.HolidayDto;
import com.ems.leave.dto.LeaveRequestDto;
import com.ems.leave.dto.LeaveTypeDto;
import com.ems.leave.dto.LeaveTypeRequest;
import com.ems.leave.dto.TeamCalendarEntryDto;
import com.ems.leave.entity.Attendance;
import com.ems.leave.entity.AttendanceCorrection;
import com.ems.leave.entity.Holiday;
import com.ems.leave.entity.LeaveRequest;
import com.ems.leave.entity.LeaveType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.time.Duration;

@Mapper
public interface LeaveMapper {

    LeaveTypeDto toDto(LeaveType type);

    void update(@MappingTarget LeaveType type, LeaveTypeRequest request);

    @Mapping(target = "leaveTypeId", source = "leaveType.id")
    @Mapping(target = "leaveTypeCode", source = "leaveType.code")
    @Mapping(target = "leaveTypeName", source = "leaveType.name")
    LeaveRequestDto toDto(LeaveRequest request);

    @Mapping(target = "requestId", source = "id")
    @Mapping(target = "leaveTypeCode", source = "leaveType.code")
    TeamCalendarEntryDto toCalendarEntry(LeaveRequest request);

    HolidayDto toDto(Holiday holiday);

    CorrectionDto toDto(AttendanceCorrection correction);

    default AttendanceDto toDto(Attendance a) {
        if (a == null) {
            return null;
        }
        Long minutes = a.getCheckOut() == null ? null : Duration.between(a.getCheckIn(), a.getCheckOut()).toMinutes();
        return new AttendanceDto(a.getId(), a.getWorkDate(), a.getCheckIn(), a.getCheckOut(), minutes, a.isCorrected());
    }
}
