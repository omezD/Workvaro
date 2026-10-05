CREATE TABLE department (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version     BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE designation (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(100) NOT NULL UNIQUE,
    level       INT          NOT NULL DEFAULT 1,
    description VARCHAR(500),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version     BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE employee (
    id                      BIGSERIAL PRIMARY KEY,
    keycloak_user_id        VARCHAR(64)  UNIQUE,
    emp_code                VARCHAR(20)  NOT NULL UNIQUE,
    first_name              VARCHAR(60)  NOT NULL,
    last_name               VARCHAR(60)  NOT NULL,
    email                   VARCHAR(150) NOT NULL UNIQUE,
    phone                   VARCHAR(20),
    date_of_birth           DATE,
    join_date               DATE         NOT NULL,
    department_id           BIGINT REFERENCES department (id),
    designation_id          BIGINT REFERENCES designation (id),
    manager_id              BIGINT REFERENCES employee (id),
    status                  VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    bank_account            VARCHAR(255), -- AES-GCM encrypted by the application
    address                 VARCHAR(500),
    emergency_contact_name  VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version                 BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_employee_status CHECK (status IN ('ACTIVE', 'ON_NOTICE', 'RESIGNED', 'TERMINATED')),
    CONSTRAINT chk_employee_not_own_manager CHECK (manager_id IS NULL OR manager_id <> id)
);

CREATE INDEX idx_employee_department ON employee (department_id);
CREATE INDEX idx_employee_manager ON employee (manager_id);
CREATE INDEX idx_employee_status ON employee (status);

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
