-- Printynozzle footer social-media links migration
-- Run in phpMyAdmin for existing DBs (new installs get this via query.sql + self-heal).

INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
('social_facebook_url', '', 'string', 'facebook profile URL shown in the footer'),
('social_facebook_enabled', '0', 'boolean', 'Show facebook in the footer (1 = on)'),
('social_instagram_url', '', 'string', 'instagram profile URL shown in the footer'),
('social_instagram_enabled', '0', 'boolean', 'Show instagram in the footer (1 = on)'),
('social_youtube_url', '', 'string', 'youtube profile URL shown in the footer'),
('social_youtube_enabled', '0', 'boolean', 'Show youtube in the footer (1 = on)'),
('social_x_url', '', 'string', 'x profile URL shown in the footer'),
('social_x_enabled', '0', 'boolean', 'Show x in the footer (1 = on)'),
('social_linkedin_url', '', 'string', 'linkedin profile URL shown in the footer'),
('social_linkedin_enabled', '0', 'boolean', 'Show linkedin in the footer (1 = on)'),
('social_whatsapp_url', '', 'string', 'whatsapp profile URL shown in the footer'),
('social_whatsapp_enabled', '0', 'boolean', 'Show whatsapp in the footer (1 = on)')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
