-- ==========================================
-- RELAJAR RESTRICCIONES PARA DESARROLLO LOCAL
-- ==========================================
-- Esto permite registrar solicitudes de crédito y asistencia usando usuarios mock
-- (como CROJAS) sin requerir que estén registrados en la autenticación real de Supabase.

ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_id_fkey;
ALTER TABLE solicitudes_credito ALTER COLUMN asesor_id DROP NOT NULL;
ALTER TABLE solicitudes_credito DROP CONSTRAINT IF EXISTS solicitudes_credito_asesor_id_fkey;
ALTER TABLE asistencia ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE asistencia DROP CONSTRAINT IF EXISTS asistencia_usuario_id_fkey;

-- Insertamos un perfil demo para que el sistema tenga un asesor registrado en la base de datos
INSERT INTO perfiles (id, nombre_completo, celular, rol, activo) VALUES 
('00000000-0000-0000-0000-000000000000', 'Carlos Rojas (Asesor)', '987654321', 'asesor', true)
ON CONFLICT DO NOTHING;
