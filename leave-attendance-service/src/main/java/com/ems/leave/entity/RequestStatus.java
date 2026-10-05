package com.ems.leave.entity;

/** Lifecycle shared by leave requests and attendance corrections. */
public enum RequestStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED
}
