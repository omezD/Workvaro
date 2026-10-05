-- Reference data + one employee per Keycloak seed user (ids match infra/keycloak/realm-ems.json).
INSERT INTO department (code, name, description) VALUES
    ('ADM', 'Administration', 'Company administration'),
    ('HR',  'Human Resources', 'People operations'),
    ('ENG', 'Engineering', 'Product and software engineering'),
    ('FIN', 'Finance', 'Accounts and payroll'),
    ('OPS', 'Operations', 'Day-to-day operations');

INSERT INTO designation (title, level, description) VALUES
    ('System Administrator', 3, NULL),
    ('HR Manager', 4, NULL),
    ('Engineering Manager', 5, NULL),
    ('Software Engineer', 2, NULL),
    ('Senior Software Engineer', 3, NULL),
    ('Accountant', 2, NULL);

INSERT INTO employee (keycloak_user_id, emp_code, first_name, last_name, email, phone, date_of_birth, join_date,
                      department_id, designation_id, manager_id, status)
VALUES
    ('11111111-1111-4111-8111-111111111111', 'EMP0001', 'Asha', 'Admin', 'admin@ems.local', '+910000000001',
     '1988-02-14', '2022-01-10',
     (SELECT id FROM department WHERE code = 'ADM'),
     (SELECT id FROM designation WHERE title = 'System Administrator'), NULL, 'ACTIVE'),
    ('22222222-2222-4222-8222-222222222222', 'EMP0002', 'Harini', 'Rao', 'hr@ems.local', '+910000000002',
     '1990-07-21', '2022-03-01',
     (SELECT id FROM department WHERE code = 'HR'),
     (SELECT id FROM designation WHERE title = 'HR Manager'), NULL, 'ACTIVE'),
    ('33333333-3333-4333-8333-333333333333', 'EMP0003', 'Manoj', 'Kumar', 'manager@ems.local', '+910000000003',
     '1985-11-05', '2021-06-15',
     (SELECT id FROM department WHERE code = 'ENG'),
     (SELECT id FROM designation WHERE title = 'Engineering Manager'), NULL, 'ACTIVE');

INSERT INTO employee (keycloak_user_id, emp_code, first_name, last_name, email, phone, date_of_birth, join_date,
                      department_id, designation_id, manager_id, status)
VALUES
    ('44444444-4444-4444-8444-444444444444', 'EMP0004', 'Esha', 'Patel', 'employee@ems.local', '+910000000004',
     '1996-04-30', '2024-08-01',
     (SELECT id FROM department WHERE code = 'ENG'),
     (SELECT id FROM designation WHERE title = 'Software Engineer'),
     (SELECT id FROM employee WHERE emp_code = 'EMP0003'), 'ACTIVE');

-- Admin and HR report to nobody; the manager reports to the admin for a complete org chart.
UPDATE employee SET manager_id = (SELECT id FROM employee WHERE emp_code = 'EMP0001') WHERE emp_code IN ('EMP0002', 'EMP0003');
