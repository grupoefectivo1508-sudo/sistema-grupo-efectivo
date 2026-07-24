-- SCRIPT PARA CREAR FUNCIONES RPC EN SUPABASE
-- Copia todo este código y pégalo en el "SQL Editor" de tu panel de Supabase y ejecútalo.

-- ==============================================================================
-- 1. Función RPC para DESEMBOLSAR CRÉDITO de forma transaccional
-- ==============================================================================
CREATE OR REPLACE FUNCTION rpc_desembolsar_credito(
  p_solicitud_id UUID,
  p_caja_operacion_id UUID,
  p_monto_desembolsado NUMERIC,
  p_cliente_nombre TEXT
) RETURNS JSONB AS $$
DECLARE
  v_codigo_credito TEXT;
  v_credito_id UUID;
  v_estado_solicitud TEXT;
BEGIN
  -- 1. Verificar que la solicitud existe y está aprobada
  SELECT estado INTO v_estado_solicitud FROM solicitudes_credito WHERE id = p_solicitud_id;
  
  IF v_estado_solicitud IS NULL THEN
    RAISE EXCEPTION 'La solicitud de crédito no existe.';
  END IF;
  
  IF v_estado_solicitud != 'aprobada' THEN
    RAISE EXCEPTION 'La solicitud no está en estado "aprobada" (Estado actual: %).', v_estado_solicitud;
  END IF;

  -- 2. Generar un código secuencial para el crédito usando una secuencia (o aleatorio seguro temporal)
  -- Para evitar colisiones temporales en este MVP usaremos un gen_random_uuid modificado o número aleatorio a nivel DB
  v_codigo_credito := 'LM-' || floor(random() * 9000 + 1000)::text;

  -- 3. Insertar el Crédito
  INSERT INTO creditos (solicitud_id, codigo_credito, monto_desembolsado, estado)
  VALUES (p_solicitud_id, v_codigo_credito, p_monto_desembolsado, 'activo')
  RETURNING id INTO v_credito_id;

  -- 4. Registrar el movimiento en caja (Egreso)
  INSERT INTO movimientos_caja (caja_operacion_id, tipo_movimiento, categoria, monto, referencia_id, descripcion)
  VALUES (
    p_caja_operacion_id, 
    'egreso', 
    'desembolso', 
    p_monto_desembolsado, 
    p_solicitud_id, 
    'Desembolso préstamo ' || v_codigo_credito || ' — ' || p_cliente_nombre
  );

  -- 5. Actualizar el estado de la solicitud a "desembolsada"
  UPDATE solicitudes_credito 
  SET estado = 'desembolsada', updated_at = NOW()
  WHERE id = p_solicitud_id;

  -- Retornar éxito con los datos creados
  RETURN jsonb_build_object(
    'success', true, 
    'credito_id', v_credito_id, 
    'codigo_credito', v_codigo_credito
  );

EXCEPTION WHEN OTHERS THEN
  -- Cualquier error hará un ROLLBACK automático de toda la transacción
  RAISE EXCEPTION 'Error al desembolsar: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 2. Función RPC para COBRAR CUOTA de forma transaccional
-- ==============================================================================
CREATE OR REPLACE FUNCTION rpc_cobrar_cuota(
  p_cuota_id UUID,
  p_caja_operacion_id UUID,
  p_monto_a_cobrar NUMERIC,
  p_descripcion_movimiento TEXT
) RETURNS JSONB AS $$
DECLARE
  v_monto_total NUMERIC;
  v_monto_pagado_actual NUMERIC;
  v_nuevo_monto_pagado NUMERIC;
  v_nuevo_estado TEXT;
BEGIN
  -- 1. Obtener la cuota y bloquear la fila para lectura (prevenir doble cobro concurrente)
  SELECT monto_total, monto_pagado INTO v_monto_total, v_monto_pagado_actual 
  FROM cuotas 
  WHERE id = p_cuota_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuota no encontrada.';
  END IF;

  -- 2. Calcular saldos
  v_nuevo_monto_pagado := v_monto_pagado_actual + p_monto_a_cobrar;
  
  IF v_nuevo_monto_pagado >= v_monto_total - 0.01 THEN -- tolerancia por redondeo
    v_nuevo_estado := 'pagada';
  ELSE
    v_nuevo_estado := 'pendiente';
  END IF;

  -- 3. Registrar el ingreso en caja
  INSERT INTO movimientos_caja (caja_operacion_id, tipo_movimiento, categoria, monto, descripcion)
  VALUES (p_caja_operacion_id, 'ingreso', 'cobro_cuota', p_monto_a_cobrar, p_descripcion_movimiento);

  -- 4. Actualizar el saldo y estado de la cuota
  UPDATE cuotas
  SET 
    monto_pagado = v_nuevo_monto_pagado,
    estado = v_nuevo_estado,
    fecha_pago = CASE WHEN v_nuevo_estado = 'pagada' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_cuota_id;

  -- Retornar éxito
  RETURN jsonb_build_object(
    'success', true,
    'estado_cuota', v_nuevo_estado,
    'monto_pagado_total', v_nuevo_monto_pagado
  );

EXCEPTION WHEN OTHERS THEN
  -- Cualquier error hará un ROLLBACK automático de toda la transacción
  RAISE EXCEPTION 'Error al cobrar cuota: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
