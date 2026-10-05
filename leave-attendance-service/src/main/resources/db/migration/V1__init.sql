-- Users are referenced by their Keycloak user id (employee_user_id); employee details live in employee-service.

CREATE TABLE leave_type (
    id           BIGSERIAL PRIMARY KEY,
    code         VARCHAR(10)  NOT NULL UNIQUE,
    name         VARCHAR(60)  NOT NULL UNIQUE,
    annual_quota INT          NOT NULL DEFAULT 0 CHECK (annual_quota BETWEEN 0 AND 365),
    paid         BOOLEAN      NOT NULL DEFAULT TRUE,
    unlimited    BOOLEAN      NOT NULL DEFAULT FALSE,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version      BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE leave_balance (
    id               BIGSERIAL PRIMARY KEY,
    employee_user_id VARCHAR(64) NOT NULL,
    leave_type_id    BIGINT      NOT NULL REFERENCES leave_type (id),
    year             INT         NOT NULL,
    allocated        INT         NOT NULL DEFAULT 0 CHECK (allocated >= 0),
    used             INT         NOT NULL DEFAULT 0 CHECK (used >= 0),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    version          BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT uq_leave_balance UNIQUE (employee_user_id, leave_type_id, year)
);

CREATE TABLE leave_request (
    id               BIGSERIAL PRIMARY KEY,
    employee_user_id VARCHAR(64)  NOT NULL,
    employee_id      BIGINT       NOT NULL,
    employee_name    VARCHAR(130) NOT NULL,
    leave_type_id    BIGINT       NOT NULL REFERENCES leave_type (id),
    start_date       DATE         NOT NULL,
    end_date         DATE         NOT NULL,
    days             INT          NOT NULL CHECK (days > 0),
    reason           VARCHAR(500),
    status           VARCHAR(20)  NOT NULL,
    decided_by_user_id VARCHAR(64),
    decided_by_name  VARCHAR(150),
    decision_comment VARCHAR(500),
    decided_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_leave_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
);

CREATE INDEX idx_leave_request_user ON leave_request (employee_user_id, status);
CREATE INDEX idx_leave_request_dates ON leave_request (start_date, end_date);
CREATE INDEX idx_leave_request_status ON leave_request (status);

CREATE TABLE holiday (
    id         BIGSERIAL PRIMARY KEY,
    date       DATE        NOT NULL UNIQUE,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version    BIGINT      NOT NULL DEFAULT 0
);

CREATE TABLE attendance (
    id               BIGSERIAL PRIMARY KEY,
    employee_user_id VARCHAR(64)  NOT NULL,
    employee_name    VARCHAR(130) NOT NULL,
    work_date        DATE         NOT NULL,
    check_in         TIMESTAMPTZ  NOT NULL,
    check_out        TIMESTAMPTZ,
    corrected        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT uq_attendance_day UNIQUE (employee_user_id, work_date),
    CONSTRAINT chk_attendance_times CHECK (check_out IS NULL OR check_out > check_in)
);

CREATE INDEX idx_attendance_date ON attendance (work_date);

CREATE TABLE attendance_correction (
    id                  BIGSERIAL PRIMARY KEY,
    employee_user_id    VARCHAR(64)  NOT NULL,
    employee_name       VARCHAR(130) NOT NULL,
    work_date           DATE         NOT NULL,
    requested_check_in  TIMESTAMPTZ  NOT NULL,
    requested_check_out TIMESTAMPTZ  NOT NULL,
    reason              VARCHAR(500) NOT NULL,
    status              VARCHAR(20)  NOT NULL,
    decided_by_user_id  VARCHAR(64),
    decided_by_name     VARCHAR(150),
    decision_comment    VARCHAR(500),
    decided_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version             BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_correction_times CHECK (requested_check_out > requested_check_in),
    CONSTRAINT chk_correction_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
);

CREATE INDEX idx_correction_user ON attendance_correction (employee_user_id, status);

CREATE TABLE audit_log (
    id            BIGSERIAL PRIMARY KEY,
    actor_user_id VARCHAR(64)  NOT NULL,
    actor_name    VARCHAR(150),
    action        VARCHAR(50)  NOT NULL,
    entity_type   VARCHAR(50)  NOT NULL,
    entity_id     VARCHAR(64),
    details       VARCHAR(2000),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log (created_at);
