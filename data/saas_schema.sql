-- ============================================================
-- KESEF SaaS Schema
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Planes disponibles
CREATE TABLE IF NOT EXISTS planes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  precio_usd  NUMERIC DEFAULT 0,
  precio_ars  NUMERIC DEFAULT 0,  -- precio real en MP (actualizable desde admin)
  max_usuarios INT DEFAULT 1,      -- -1 = ilimitado
  max_obras    INT DEFAULT 1,      -- -1 = ilimitado
  descripcion TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Organizaciones (cuentas / tenants)
CREATE TABLE IF NOT EXISTS organizaciones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  email_owner  TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organizacion_id  UUID REFERENCES organizaciones(id),
  nombre           TEXT,
  email            TEXT,
  rol              TEXT DEFAULT 'owner',  -- 'owner' | 'admin' | 'miembro'
  activo           BOOLEAN DEFAULT TRUE,
  ultimo_acceso    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Suscripciones (una por organización)
CREATE TABLE IF NOT EXISTS suscripciones (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id      UUID REFERENCES organizaciones(id) UNIQUE,
  plan_id              UUID REFERENCES planes(id),
  estado               TEXT DEFAULT 'trial',
  -- estados: 'trial' | 'activa' | 'advertencia' | 'suspendida' | 'cancelada'
  fecha_inicio         TIMESTAMPTZ DEFAULT NOW(),
  fecha_fin_trial      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 days'),
  fecha_proximo_cobro  TIMESTAMPTZ,
  fecha_advertencia    TIMESTAMPTZ,  -- inicio del período de gracia de 10 días
  precio_final_usd     NUMERIC,      -- precio con descuento aplicado
  descuento_pct        NUMERIC DEFAULT 0,
  notas_admin          TEXT,
  mp_preapproval_id    TEXT,         -- ID en MercadoPago
  mp_plan_id           TEXT,         -- ID del plan en MP
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de pagos
CREATE TABLE IF NOT EXISTS pagos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suscripcion_id   UUID REFERENCES suscripciones(id),
  monto_usd        NUMERIC,
  monto_ars        NUMERIC,
  estado           TEXT DEFAULT 'pendiente',
  -- estados: 'pendiente' | 'aprobado' | 'rechazado' | 'reembolsado'
  mp_payment_id    TEXT,
  periodo          TEXT,   -- 'YYYY-MM'
  fecha            TIMESTAMPTZ DEFAULT NOW(),
  descripcion      TEXT
);

-- Whitelist: emails que nunca se bloquean
CREATE TABLE IF NOT EXISTS whitelist_admin (
  email       TEXT PRIMARY KEY,
  descripcion TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Invitaciones a la organización
CREATE TABLE IF NOT EXISTS invitaciones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id  UUID REFERENCES organizaciones(id),
  email            TEXT NOT NULL,
  rol              TEXT DEFAULT 'miembro',
  token            TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  usado            BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- ============================================================
-- Datos iniciales
-- ============================================================

INSERT INTO planes (nombre, precio_usd, precio_ars, max_usuarios, max_obras, descripcion) VALUES
  ('Trial',   0,   0,      1,   1,  '10 días de prueba gratuita'),
  ('Starter', 58,  0,      5,   3,  '3 obras · 5 usuarios · soporte por email'),
  ('Pro',     118, 0,      15,  10, '10 obras · 15 usuarios · soporte prioritario'),
  ('Premium', 198, 0,      -1,  -1, 'Obras y usuarios ilimitados · soporte dedicado')
ON CONFLICT DO NOTHING;

INSERT INTO whitelist_admin (email, descripcion) VALUES
  ('leandroisrael@gmail.com', 'Owner'),
  ('pablo@israelteper.com',   'Equipo'),
  ('admin@israelteper.com',   'Equipo')
ON CONFLICT DO NOTHING;

-- RLS: deshabilitar en tablas admin para acceso desde service role
ALTER TABLE planes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist_admin  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitaciones     ENABLE ROW LEVEL SECURITY;

-- Políticas: el service role siempre tiene acceso completo (bypass RLS)
-- Usuarios autenticados pueden leer su propio perfil
CREATE POLICY "user can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "user can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Usuarios pueden leer la suscripción de su org
CREATE POLICY "user can read own org subscription"
  ON suscripciones FOR SELECT
  USING (
    organizacion_id IN (
      SELECT organizacion_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Planes son públicos (lectura)
CREATE POLICY "planes are public"
  ON planes FOR SELECT USING (TRUE);
