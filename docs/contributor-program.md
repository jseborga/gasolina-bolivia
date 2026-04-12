# Programa de Registradores y Recompensas

## Objetivo

Crear una red de colaboradores que carguen informacion util para:

- estado de combustible en estaciones
- incidentes viales
- denuncias de lugares mal cargados
- disponibilidad de parqueos

El incentivo inicial se basa en `creditos`, no en pago inmediato. Los creditos se convierten en
dinero solo despues de una validacion operativa.

## Flujo operativo

1. El admin crea un `app_profile` con rol `trusted_reporter`, `reviewer` o `parking_manager`.
2. El perfil recibe un token operativo.
3. El colaborador activa el modo registrador en la app publica pegando ese token.
4. Cada aporte crea una fila en `community_contributions`.
5. El equipo revisa el aporte y lo marca como `approved`, `rejected` o `auto_flagged`.
6. Si se aprueba, se acredita saldo en `credit_ledger` y se actualiza `app_profiles.credit_balance`.

## Puntaje sugerido

- `fuel_report`: 2 puntos
- `parking_update`: 3 puntos
- `place_report`: 4 puntos
- `traffic_incident`: 5 puntos

El revisor puede subir o bajar esos puntos por caso.

## Controles antifraude

### 1. Deduplicacion tecnica

Cada aporte guarda una `duplicate_signature` por tipo de evento:

- combustible: estacion + combustible + estado + fila
- denuncia: tipo de lugar + id + motivo
- incidente: tipo + bucket de coordenadas + radio
- parqueo: sitio + estado + cupos + precio

Si aparecen repeticiones en una ventana corta, el sistema marca flags:

- `possible_duplicate`
- `same_profile_repeat`
- `same_ip_cluster`

Con dos o mas flags, el aporte entra como `auto_flagged`.

### 2. Enfriamiento antes de pagar

No pagar el mismo dia. Lo recomendable es:

- revisar diariamente
- pagar semanal o quincenalmente
- exigir minimo de creditos antes de liquidar

Esto reduce fraude oportunista y da tiempo para detectar reclamos, duplicados o errores.

### 3. Confiabilidad

La confiabilidad del perfil sube con aprobaciones y baja con rechazos.

Uso recomendado:

- mas de 80: prioridad alta y menos revision manual
- entre 50 y 80: revision normal
- menos de 50: retencion de pagos y auditoria adicional

### 4. Confirmacion cruzada

No usar un solo criterio. Un incidente o un reporte valioso deberia validarse con al menos una de
estas señales:

- otro colaborador cercano
- consistencia geografica con la ubicacion
- llamada o WhatsApp al sitio
- verificacion visual del equipo
- repeticion coherente de usuarios distintos

### 5. Penalizaciones

Cuando haya abuso:

- rechazar el aporte
- descontar creditos con `credit_ledger`
- bajar confiabilidad
- desactivar el perfil

## Como pagan otras empresas o redes

Patrones comunes:

- no pagan por publicar, pagan por dato validado
- separan `evento reportado` de `evento pagado`
- usan reputacion historica para priorizar revision
- hacen pagos por lote, no por evento
- guardan auditoria completa del saldo y del motivo del pago

## Propuesta de pagos QR

### Etapa 1: creditos internos

El sistema solo acredita puntos y saldo interno.

### Etapa 2: lote de pago

Cada semana:

1. listar perfiles con saldo minimo
2. revisar aportes aprobados del periodo
3. consolidar monto a pagar
4. registrar referencia del pago QR en el ledger

### Etapa 3: payout auditable

Agregar mas adelante:

- `payout_batches`
- `payout_batch_items`
- referencia QR
- estado del pago
- fecha de liquidacion

## Recomendacion comercial

No abrir pagos QR a cualquier anonimo. Empezar con un programa cerrado:

- 10 a 30 registradores confiables por ciudad
- perfiles con telefono y WhatsApp validados
- pagos solo a cuentas previamente registradas
- auditoria semanal del top de aportes y rechazos

Ese modelo es mucho mas controlable que pagar a cualquier visitante de la app.
