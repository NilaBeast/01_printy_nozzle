-- Printynozzle material display order migration:
-- PLA, PLA+, PLA Matte, PETG, PETG HS, TPU 95A, ABS, ASA
-- Run in phpMyAdmin for existing DBs (new installs get this via query.sql + self-heal).

UPDATE printing_materials SET sort_order = CASE slug
  WHEN 'pla' THEN 1
  WHEN 'pla-plus' THEN 2
  WHEN 'pla-matte' THEN 3
  WHEN 'petg' THEN 4
  WHEN 'petg-hs' THEN 5
  WHEN 'tpu-95a' THEN 6
  WHEN 'abs' THEN 7
  WHEN 'asa' THEN 8
  ELSE sort_order
END;
