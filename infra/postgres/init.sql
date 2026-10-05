-- Runs once, on the first start of an empty Postgres volume.
-- One database per service (database-per-service pattern); Flyway creates the tables.
CREATE DATABASE employee_db;
CREATE DATABASE leave_db;
CREATE DATABASE keycloak_db;
