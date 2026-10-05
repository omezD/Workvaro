package com.ems.common.security;

/** Keycloak realm role names, without the {@code ROLE_} prefix. */
public final class Roles {

    public static final String ADMIN = "ADMIN";
    public static final String HR = "HR";
    public static final String MANAGER = "MANAGER";
    public static final String EMPLOYEE = "EMPLOYEE";

    /** SpEL snippets for {@code @PreAuthorize}. */
    public static final String ADMIN_OR_HR = "hasAnyRole('ADMIN','HR')";
    public static final String HR_OR_MANAGER = "hasAnyRole('ADMIN','HR','MANAGER')";

    private Roles() {
    }
}
