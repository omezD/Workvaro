package com.ems.leave.service;

import com.ems.common.exception.ApiException;
import com.ems.leave.dto.HolidayDto;
import com.ems.leave.dto.HolidayRequest;
import com.ems.leave.entity.Holiday;
import com.ems.leave.mapper.LeaveMapper;
import com.ems.leave.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HolidayService {

    private static final String ENTITY = "Holiday";

    private final HolidayRepository repository;
    private final LeaveMapper mapper;
    private final AuditService audit;

    public List<HolidayDto> forYear(int year) {
        return between(LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
    }

    public List<HolidayDto> between(LocalDate from, LocalDate to) {
        return repository.findByDateBetweenOrderByDateAsc(from, to).stream().map(mapper::toDto).toList();
    }

    public Set<LocalDate> datesBetween(LocalDate from, LocalDate to) {
        return repository.findByDateBetweenOrderByDateAsc(from, to).stream()
                .map(Holiday::getDate).collect(Collectors.toSet());
    }

    @Transactional
    public HolidayDto create(HolidayRequest request) {
        if (repository.existsByDate(request.date())) {
            throw ApiException.conflict("A holiday already exists on " + request.date());
        }
        Holiday holiday = new Holiday();
        holiday.setDate(request.date());
        holiday.setName(request.name().trim());
        repository.save(holiday);
        audit.record("CREATE", ENTITY, holiday.getId(), holiday.getDate() + " " + holiday.getName());
        return mapper.toDto(holiday);
    }

    @Transactional
    public void delete(Long id) {
        Holiday holiday = repository.findById(id).orElseThrow(() -> ApiException.notFound(ENTITY, id));
        repository.delete(holiday);
        audit.record("DELETE", ENTITY, id, holiday.getDate() + " " + holiday.getName());
    }
}
