-- Acelera a filtragem de registros por usuário
CREATE INDEX IF NOT EXISTS idx_registros_user_id ON registros (user_id);
