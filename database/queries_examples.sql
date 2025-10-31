-- ============================================
-- CONSULTAS DE EJEMPLO - IA-Calls Backend
-- Queries útiles para análisis y reportes
-- ============================================

-- ============================================
-- 1. ESTADÍSTICAS GENERALES
-- ============================================

-- Dashboard principal
SELECT 
  (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS usuarios_activos,
  (SELECT COUNT(*) FROM clients WHERE is_active = TRUE) AS clientes_totales,
  (SELECT COUNT(*) FROM groups WHERE is_active = TRUE) AS grupos_activos,
  (SELECT COUNT(*) FROM batch_calls WHERE status = 'completed') AS batch_calls_completados,
  (SELECT COUNT(*) FROM call_records WHERE status = 'completed') AS llamadas_completadas,
  (SELECT SUM(call_duration_secs) FROM call_records WHERE status = 'completed') / 60 AS minutos_totales,
  (SELECT COUNT(*) FROM whatsapp_conversations WHERE status IN ('sent', 'delivered')) AS mensajes_whatsapp;

-- ============================================
-- 2. ANÁLISIS DE GRUPOS
-- ============================================

-- Grupos con mejor tasa de éxito
SELECT 
  g.name,
  g.batch_total_recipients AS total_destinatarios,
  g.batch_completed_calls AS llamadas_exitosas,
  g.batch_failed_calls AS llamadas_fallidas,
  ROUND(
    CASE 
      WHEN g.batch_total_recipients > 0 
      THEN (g.batch_completed_calls::DECIMAL / g.batch_total_recipients) * 100
      ELSE 0
    END, 
    2
  ) AS tasa_exito_porcentaje,
  g.batch_started_at,
  g.batch_completed_at
FROM groups g
WHERE g.batch_id IS NOT NULL
ORDER BY tasa_exito_porcentaje DESC;

-- Clientes por grupo
SELECT 
  g.name AS grupo,
  g.color,
  COUNT(cg.client_id) AS total_clientes,
  g.batch_status AS estado_batch,
  g.created_at AS fecha_creacion,
  u.username AS creado_por
FROM groups g
LEFT JOIN client_groups cg ON g.id = cg.group_id
LEFT JOIN users u ON g.created_by = u.id
WHERE g.is_active = TRUE
GROUP BY g.id, g.name, g.color, g.batch_status, g.created_at, u.username
ORDER BY total_clientes DESC;

-- ============================================
-- 3. ANÁLISIS DE LLAMADAS
-- ============================================

-- Llamadas del día
SELECT 
  c.name AS cliente,
  cr.phone_number,
  cr.status,
  cr.call_duration_secs,
  ROUND(cr.call_duration_secs / 60.0, 2) AS duracion_minutos,
  cr.call_started_at,
  bc.call_name AS campana,
  g.name AS grupo
FROM call_records cr
LEFT JOIN clients c ON cr.client_id = c.id
LEFT JOIN batch_calls bc ON cr.batch_call_id = bc.id
LEFT JOIN groups g ON bc.group_id = g.id
WHERE DATE(cr.call_started_at) = CURRENT_DATE
ORDER BY cr.call_started_at DESC;

-- Llamadas más largas
SELECT 
  c.name AS cliente,
  cr.phone_number,
  ROUND(cr.call_duration_secs / 60.0, 2) AS duracion_minutos,
  cr.transcript_summary,
  cr.call_started_at,
  g.name AS grupo
FROM call_records cr
JOIN clients c ON cr.client_id = c.id
JOIN batch_calls bc ON cr.batch_call_id = bc.id
JOIN groups g ON bc.group_id = g.id
WHERE cr.call_duration_secs IS NOT NULL
ORDER BY cr.call_duration_secs DESC
LIMIT 20;

-- Distribución de estados de llamadas
SELECT 
  status,
  COUNT(*) AS cantidad,
  ROUND(COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM call_records) * 100, 2) AS porcentaje
FROM call_records
GROUP BY status
ORDER BY cantidad DESC;

-- Promedio de duración por grupo
SELECT 
  g.name AS grupo,
  COUNT(cr.id) AS total_llamadas,
  ROUND(AVG(cr.call_duration_secs), 0) AS duracion_promedio_segundos,
  ROUND(AVG(cr.call_duration_secs) / 60, 2) AS duracion_promedio_minutos,
  MIN(cr.call_duration_secs) AS duracion_min,
  MAX(cr.call_duration_secs) AS duracion_max
FROM groups g
JOIN batch_calls bc ON g.id = bc.group_id
JOIN call_records cr ON bc.id = cr.batch_call_id
WHERE cr.call_duration_secs IS NOT NULL
GROUP BY g.id, g.name
ORDER BY total_llamadas DESC;

-- ============================================
-- 4. ANÁLISIS DE CLIENTES
-- ============================================

-- Clientes más llamados
SELECT 
  c.name,
  c.phone,
  c.email,
  c.category,
  COUNT(cr.id) AS total_llamadas,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) AS llamadas_exitosas,
  MAX(cr.call_ended_at) AS ultima_llamada
FROM clients c
LEFT JOIN call_records cr ON c.id = cr.client_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.phone, c.email, c.category
ORDER BY total_llamadas DESC
LIMIT 20;

-- Clientes sin llamar
SELECT 
  c.id,
  c.name,
  c.phone,
  c.email,
  c.created_at,
  COUNT(cg.group_id) AS grupos_asignados
FROM clients c
LEFT JOIN call_records cr ON c.id = cr.client_id
LEFT JOIN client_groups cg ON c.id = cg.client_id
WHERE c.is_active = TRUE
  AND cr.id IS NULL
GROUP BY c.id, c.name, c.phone, c.email, c.created_at
ORDER BY c.created_at DESC;

-- Clientes por categoría
SELECT 
  category,
  COUNT(*) AS total_clientes,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completados,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pendientes
FROM clients
WHERE is_active = TRUE
GROUP BY category
ORDER BY total_clientes DESC;

-- ============================================
-- 5. ANÁLISIS DE BATCH CALLS
-- ============================================

-- Batch calls recientes
SELECT 
  bc.call_name,
  bc.status,
  bc.total_recipients,
  bc.completed_calls,
  bc.failed_calls,
  ROUND(
    CASE 
      WHEN bc.total_recipients > 0 
      THEN (bc.completed_calls::DECIMAL / bc.total_recipients) * 100
      ELSE 0
    END, 
    2
  ) AS tasa_completitud,
  EXTRACT(EPOCH FROM (bc.completed_at - bc.started_at)) / 60 AS duracion_minutos,
  bc.started_at,
  g.name AS grupo,
  u.username AS iniciado_por
FROM batch_calls bc
LEFT JOIN groups g ON bc.group_id = g.id
LEFT JOIN users u ON bc.user_id = u.id
ORDER BY bc.started_at DESC
LIMIT 20;

-- Performance de batch calls por día
SELECT 
  DATE(started_at) AS fecha,
  COUNT(*) AS total_batch_calls,
  SUM(total_recipients) AS total_destinatarios,
  SUM(completed_calls) AS total_completadas,
  SUM(failed_calls) AS total_fallidas,
  ROUND(
    CASE 
      WHEN SUM(total_recipients) > 0 
      THEN (SUM(completed_calls)::DECIMAL / SUM(total_recipients)) * 100
      ELSE 0
    END, 
    2
  ) AS tasa_exito
FROM batch_calls
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY fecha DESC;

-- ============================================
-- 6. ANÁLISIS DE WHATSAPP
-- ============================================

-- Conversaciones de WhatsApp recientes
SELECT 
  phone_number,
  client_name,
  status,
  LEFT(conversation_summary, 100) AS resumen,
  sent_at,
  received_at,
  CASE 
    WHEN received_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (received_at - sent_at)) / 60
    ELSE NULL
  END AS tiempo_respuesta_minutos
FROM whatsapp_conversations
ORDER BY created_at DESC
LIMIT 20;

-- Tasa de respuesta de WhatsApp
SELECT 
  status,
  COUNT(*) AS cantidad,
  ROUND(COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM whatsapp_conversations) * 100, 2) AS porcentaje
FROM whatsapp_conversations
GROUP BY status
ORDER BY cantidad DESC;

-- Clientes que respondieron por WhatsApp
SELECT 
  wc.phone_number,
  wc.client_name,
  wc.sent_at,
  wc.received_at,
  wc.status,
  cr.call_duration_secs AS duracion_llamada_previa,
  cr.transcript_summary AS resumen_llamada
FROM whatsapp_conversations wc
LEFT JOIN call_records cr ON wc.phone_number = cr.phone_number
WHERE wc.status IN ('replied', 'read')
ORDER BY wc.received_at DESC;

-- ============================================
-- 7. ANÁLISIS DE USUARIOS
-- ============================================

-- Actividad por usuario
SELECT 
  u.username,
  u.email,
  u.role,
  COUNT(DISTINCT g.id) AS grupos_creados,
  COUNT(DISTINCT bc.id) AS batch_calls_iniciados,
  MAX(bc.started_at) AS ultima_actividad
FROM users u
LEFT JOIN groups g ON u.id = g.created_by
LEFT JOIN batch_calls bc ON u.id = bc.user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.username, u.email, u.role
ORDER BY ultima_actividad DESC NULLS LAST;

-- Usuarios próximos a expirar
SELECT 
  username,
  email,
  time AS fecha_expiracion,
  EXTRACT(DAY FROM (time - NOW())) AS dias_restantes,
  agent_id
FROM users
WHERE time IS NOT NULL
  AND time > NOW()
  AND time <= NOW() + INTERVAL '7 days'
  AND is_active = TRUE
ORDER BY time ASC;

-- ============================================
-- 8. ANÁLISIS DE ARCHIVOS
-- ============================================

-- Archivos subidos recientemente
SELECT 
  uf.original_name,
  uf.file_size,
  pg_size_pretty(uf.file_size::BIGINT) AS tamaño_legible,
  uf.content_type,
  uf.created_at,
  u.username AS subido_por,
  g.name AS grupo
FROM uploaded_files uf
LEFT JOIN users u ON uf.uploaded_by = u.id
LEFT JOIN groups g ON uf.group_id = g.id
WHERE uf.is_active = TRUE
ORDER BY uf.created_at DESC
LIMIT 20;

-- Uso de almacenamiento por grupo
SELECT 
  g.name AS grupo,
  COUNT(uf.id) AS total_archivos,
  SUM(uf.file_size) AS bytes_totales,
  pg_size_pretty(SUM(uf.file_size)::BIGINT) AS tamaño_total
FROM groups g
LEFT JOIN uploaded_files uf ON g.id = uf.group_id
WHERE uf.is_active = TRUE
GROUP BY g.id, g.name
ORDER BY bytes_totales DESC NULLS LAST;

-- ============================================
-- 9. REPORTES AVANZADOS
-- ============================================

-- Funnel de conversión (Llamada → WhatsApp → Respuesta)
WITH call_stats AS (
  SELECT 
    COUNT(*) AS total_llamadas,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS llamadas_completadas
  FROM call_records
),
whatsapp_stats AS (
  SELECT 
    COUNT(*) AS mensajes_enviados,
    COUNT(CASE WHEN status IN ('replied', 'read') THEN 1 END) AS mensajes_respondidos
  FROM whatsapp_conversations
)
SELECT 
  cs.total_llamadas,
  cs.llamadas_completadas,
  ws.mensajes_enviados,
  ws.mensajes_respondidos,
  ROUND((cs.llamadas_completadas::DECIMAL / cs.total_llamadas) * 100, 2) AS tasa_llamadas_exitosas,
  ROUND((ws.mensajes_enviados::DECIMAL / cs.llamadas_completadas) * 100, 2) AS tasa_whatsapp_enviados,
  ROUND((ws.mensajes_respondidos::DECIMAL / ws.mensajes_enviados) * 100, 2) AS tasa_respuesta_whatsapp
FROM call_stats cs, whatsapp_stats ws;

-- ROI por grupo (asumiendo costo por minuto)
WITH group_costs AS (
  SELECT 
    g.id,
    g.name,
    COUNT(cr.id) AS total_llamadas,
    SUM(cr.call_duration_secs) / 60.0 AS minutos_totales,
    (SUM(cr.call_duration_secs) / 60.0) * 0.10 AS costo_estimado_usd,
    COUNT(CASE WHEN wc.status IN ('replied', 'read') THEN 1 END) AS respuestas_whatsapp
  FROM groups g
  LEFT JOIN batch_calls bc ON g.id = bc.group_id
  LEFT JOIN call_records cr ON bc.id = cr.batch_call_id AND cr.status = 'completed'
  LEFT JOIN whatsapp_conversations wc ON cr.phone_number = wc.phone_number
  GROUP BY g.id, g.name
)
SELECT 
  name AS grupo,
  total_llamadas,
  ROUND(minutos_totales, 2) AS minutos_totales,
  ROUND(costo_estimado_usd, 2) AS costo_usd,
  respuestas_whatsapp,
  CASE 
    WHEN total_llamadas > 0 
    THEN ROUND(costo_estimado_usd / total_llamadas, 4)
    ELSE 0
  END AS costo_por_llamada,
  CASE 
    WHEN respuestas_whatsapp > 0 
    THEN ROUND(costo_estimado_usd / respuestas_whatsapp, 2)
    ELSE 0
  END AS costo_por_conversion
FROM group_costs
WHERE total_llamadas > 0
ORDER BY total_llamadas DESC;

-- Timeline de actividad (últimas 24 horas)
SELECT 
  EXTRACT(HOUR FROM created_at) AS hora,
  'Llamadas' AS tipo,
  COUNT(*) AS cantidad
FROM call_records
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hora

UNION ALL

SELECT 
  EXTRACT(HOUR FROM sent_at) AS hora,
  'WhatsApp' AS tipo,
  COUNT(*) AS cantidad
FROM whatsapp_conversations
WHERE sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY hora

ORDER BY hora, tipo;

-- ============================================
-- 10. QUERIES DE MANTENIMIENTO
-- ============================================

-- Detectar duplicados en clientes por teléfono
SELECT 
  phone,
  COUNT(*) AS duplicados,
  STRING_AGG(name, ', ') AS nombres
FROM clients
WHERE is_active = TRUE
  AND phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY duplicados DESC;

-- Llamadas sin cliente asociado
SELECT 
  cr.phone_number,
  cr.status,
  cr.call_started_at,
  bc.call_name
FROM call_records cr
LEFT JOIN batch_calls bc ON cr.batch_call_id = bc.id
WHERE cr.client_id IS NULL
ORDER BY cr.call_started_at DESC;

-- Grupos sin clientes asignados
SELECT 
  g.id,
  g.name,
  g.created_at,
  u.username AS creado_por
FROM groups g
LEFT JOIN client_groups cg ON g.id = cg.group_id
LEFT JOIN users u ON g.created_by = u.id
WHERE g.is_active = TRUE
  AND cg.id IS NULL
ORDER BY g.created_at DESC;

-- Batch calls huérfanos (sin grupo)
SELECT 
  bc.batch_id,
  bc.call_name,
  bc.status,
  bc.started_at
FROM batch_calls bc
WHERE bc.group_id IS NULL
ORDER BY bc.started_at DESC;

-- ============================================
-- FIN DE QUERIES DE EJEMPLO
-- ============================================

