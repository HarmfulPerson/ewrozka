WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM meeting_event WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM meeting_room WHERE appointment_id IN (SELECT id FROM appointment WHERE wrozka_id IN (SELECT id FROM t) OR client_id IN (SELECT id FROM t));
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM appointment WHERE wrozka_id IN (SELECT id FROM t) OR client_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM meeting_request WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM guest_booking WHERE wizard_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM advertisement WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM availability WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM stripe_connect_account WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM featured_wizard WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM transaction WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM wallet WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM withdrawal WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM user_follows WHERE follower_id IN (SELECT id FROM t) OR followee_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM comment WHERE author_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM article WHERE author_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM user_favorites WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM user_topic WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM user_role WHERE user_id IN (SELECT id FROM t);
WITH t AS (SELECT u.id FROM "user" u JOIN user_role ur ON ur.user_id=u.id JOIN role r ON r.id=ur.role_id WHERE r.name IN ('wizard','client'))
DELETE FROM "user" WHERE id IN (SELECT id FROM t);
