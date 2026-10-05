package com.ems.leave.service;

import com.ems.leave.dto.LeaveBalanceDto;
import com.ems.leave.entity.LeaveBalance;
import com.ems.leave.entity.LeaveType;
import com.ems.leave.repository.LeaveBalanceRepository;
import com.ems.leave.repository.LeaveRequestRepository;
import com.ems.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** Balances are created lazily, per user and year, the first time they are needed. */
@Service
@RequiredArgsConstructor
@Transactional
public class LeaveBalanceService {

    private final LeaveBalanceRepository balanceRepository;
    private final LeaveTypeRepository typeRepository;
    private final LeaveRequestRepository requestRepository;

    public List<LeaveBalanceDto> balancesFor(String userId, int year) {
        return ensureBalances(userId, year).stream()
                .filter(b -> b.getLeaveType().isActive() || b.getUsed() > 0)
                .sorted(Comparator.comparing(b -> b.getLeaveType().getName()))
                .map(b -> toDto(b, pendingDays(userId, b.getLeaveType().getId(), year)))
                .toList();
    }

    /** Balance row for one type, created on first use. */
    public LeaveBalance balanceFor(String userId, LeaveType type, int year) {
        return balanceRepository.findByEmployeeUserIdAndLeaveTypeIdAndYear(userId, type.getId(), year)
                .orElseGet(() -> balanceRepository.save(newBalance(userId, type, year)));
    }

    public int pendingDays(String userId, Long leaveTypeId, int year) {
        return (int) requestRepository.sumPendingDays(userId, leaveTypeId,
                LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
    }

    List<LeaveBalance> ensureBalances(String userId, int year) {
        List<LeaveBalance> balances = new ArrayList<>(balanceRepository.findByEmployeeUserIdAndYear(userId, year));
        Set<Long> existing = balances.stream().map(b -> b.getLeaveType().getId()).collect(Collectors.toSet());
        for (LeaveType type : typeRepository.findByActiveTrueOrderByNameAsc()) {
            if (!existing.contains(type.getId())) {
                balances.add(balanceRepository.save(newBalance(userId, type, year)));
            }
        }
        return balances;
    }

    private static LeaveBalance newBalance(String userId, LeaveType type, int year) {
        LeaveBalance b = new LeaveBalance();
        b.setEmployeeUserId(userId);
        b.setLeaveType(type);
        b.setYear(year);
        b.setAllocated(type.isUnlimited() ? 0 : type.getAnnualQuota());
        b.setUsed(0);
        return b;
    }

    private static LeaveBalanceDto toDto(LeaveBalance b, int pending) {
        LeaveType t = b.getLeaveType();
        int available = t.isUnlimited() ? 0 : Math.max(0, b.getAllocated() - b.getUsed() - pending);
        return new LeaveBalanceDto(t.getId(), t.getCode(), t.getName(), b.getYear(), b.getAllocated(), b.getUsed(),
                pending, available, t.isUnlimited());
    }
}
