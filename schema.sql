-- ==========================================
-- ESQUEMA DE BASE DE DATOS - GRUPO EFECTIVO
-- ==========================================

-- 1. Tablas principales y de sucursales
CREATE TABLE sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    direccion VARCHAR(255),
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TYPE rol_usuario AS ENUM ('administrador', 'cajero', 'asesor');

CREATE TABLE perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES sucursales(id),
    nombre_completo VARCHAR(150) NOT NULL,
    celular VARCHAR(15),
    rol rol_usuario NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Gestión de Clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id) NOT NULL,
    dni VARCHAR(8) NOT NULL UNIQUE CHECK (length(dni) = 8),
    nombre_completo VARCHAR(150) NOT NULL,
    celular VARCHAR(15),
    direccion VARCHAR(255) NOT NULL,
    ubigeo VARCHAR(6) NOT NULL,
    latitud NUMERIC(10, 8),
    longitud NUMERIC(11, 8),
    tipo_negocio VARCHAR(100),
    ingresos_estimados NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Solicitudes y Créditos
CREATE TYPE estado_solicitud AS ENUM ('pendiente', 'aprobada', 'rechazada', 'desembolsada');
CREATE TYPE tipo_periodo AS ENUM ('diario', 'semanal', 'quincenal', 'mensual');

CREATE TABLE solicitudes_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) NOT NULL,
    asesor_id UUID REFERENCES perfiles(id) NOT NULL,
    sucursal_id UUID REFERENCES sucursales(id) NOT NULL,
    monto_solicitado NUMERIC(12, 2) NOT NULL CHECK (monto_solicitado > 0),
    tasa_interes_mensual NUMERIC(5, 2) NOT NULL,
    tipo_periodo tipo_periodo NOT NULL,
    numero_cuotas INT NOT NULL CHECK (numero_cuotas > 0),
    sustento_negocio TEXT,
    estado estado_solicitud DEFAULT 'pendiente' NOT NULL,
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fecha_evaluacion TIMESTAMP WITH TIME ZONE
);

CREATE TYPE estado_credito AS ENUM ('activo', 'cancelado', 'mora', 'refinanciado');

CREATE TABLE creditos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id UUID REFERENCES solicitudes_credito(id) NOT NULL UNIQUE,
    codigo_credito VARCHAR(20) NOT NULL UNIQUE,
    monto_desembolsado NUMERIC(12, 2) NOT NULL,
    fecha_desembolso TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    estado estado_credito DEFAULT 'activo' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TYPE estado_cuota AS ENUM ('pendiente', 'pagada', 'mora');

CREATE TABLE cuotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credito_id UUID REFERENCES creditos(id) ON DELETE CASCADE NOT NULL,
    numero_cuota INT NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    monto_capital NUMERIC(12, 2) NOT NULL,
    monto_interes NUMERIC(12, 2) NOT NULL,
    monto_total NUMERIC(12, 2) NOT NULL,
    monto_pagado NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    estado estado_cuota DEFAULT 'pendiente' NOT NULL,
    fecha_pago TIMESTAMP WITH TIME ZONE,
    UNIQUE (credito_id, numero_cuota)
);

-- 4. Bóveda y Caja
CREATE TYPE estado_caja AS ENUM ('abierta', 'cerrada');

CREATE TABLE cajas_operacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id) NOT NULL,
    usuario_id UUID REFERENCES perfiles(id) NOT NULL,
    saldo_inicial NUMERIC(12, 2) NOT NULL CHECK (saldo_inicial >= 0),
    saldo_final NUMERIC(12, 2),
    estado estado_caja DEFAULT 'abierta' NOT NULL,
    fecha_apertura TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fecha_cierre TIMESTAMP WITH TIME ZONE
);

CREATE TYPE tipo_movimiento AS ENUM ('ingreso', 'egreso');
CREATE TYPE categoria_movimiento AS ENUM ('desembolso', 'cobro_cuota', 'gasto_manual', 'ingreso_manual', 'apertura');

CREATE TABLE movimientos_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_operacion_id UUID REFERENCES cajas_operacion(id) NOT NULL,
    tipo_movimiento tipo_movimiento NOT NULL,
    categoria categoria_movimiento NOT NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    referencia_id UUID,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Asistencia
CREATE TABLE asistencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES perfiles(id) NOT NULL,
    sucursal_id UUID REFERENCES sucursales(id) NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    hora_entrada TIME DEFAULT CURRENT_TIME NOT NULL,
    hora_salida TIME,
    UNIQUE(usuario_id, fecha)
);

-- 6. Trigger para verificar caja abierta
CREATE OR REPLACE FUNCTION verificar_caja_abierta()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM cajas_operacion 
        WHERE id = NEW.caja_operacion_id AND estado = 'abierta'
    ) THEN
        RAISE EXCEPTION 'Operación denegada: La caja asignada no se encuentra abierta.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verificar_caja_abierta
BEFORE INSERT ON movimientos_caja
FOR EACH ROW EXECUTE FUNCTION verificar_caja_abierta();

-- 7. Datos iniciales (Sucursales Demo)
INSERT INTO sucursales (nombre, direccion) VALUES 
('La Merced', 'Av. 2 de Mayo 123, Chanchamayo'),
('Pichanaki', 'Av. Marginal 456, Pichanaqui')
ON CONFLICT DO NOTHING;
