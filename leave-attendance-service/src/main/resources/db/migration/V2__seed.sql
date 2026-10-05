INSERT INTO leave_type (code, name, annual_quota, paid, unlimited) VALUES
    ('CL', 'Casual Leave', 12, TRUE, FALSE),
    ('SL', 'Sick Leave', 8, TRUE, FALSE),
    ('EL', 'Earned Leave', 15, TRUE, FALSE),
    ('UL', 'Unpaid Leave', 0, FALSE, TRUE);

-- Sample public holidays; HR maintains the real list through /api/holidays.
INSERT INTO holiday (date, name) VALUES
    ('2026-01-26', 'Republic Day'),
    ('2026-03-04', 'Holi'),
    ('2026-08-15', 'Independence Day'),
    ('2026-10-02', 'Gandhi Jayanti'),
    ('2026-10-20', 'Dussehra'),
    ('2026-11-08', 'Diwali'),
    ('2026-12-25', 'Christmas'),
    ('2027-01-26', 'Republic Day');
