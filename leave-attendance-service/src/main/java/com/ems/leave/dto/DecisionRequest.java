package com.ems.leave.dto;

import jakarta.validation.constraints.Size;

/** Optional comment from the approver. The body itself may be omitted. */
public record DecisionRequest(@Size(max = 500) String comment) {
}
