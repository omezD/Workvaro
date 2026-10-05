package com.ems.employee.dto;

final class ValidationPatterns {

    static final String PHONE = "^\\+?[0-9 ()-]{7,20}$";
    static final String BANK_ACCOUNT = "^[0-9]{6,20}$";

    private ValidationPatterns() {
    }
}
