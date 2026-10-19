# 🏛️ Guía Metodológica de Gestión — PMO Tracker
## Marco de Gobernanza, Rutinas de Control y Protocolos de Decisión para la Dirección de Proyectos

---

## 📑 Tabla de Contenido
1. [Propósito y Marco de Gestión](#1-propósito-y-marco-de-gestión)
2. [Matriz de Roles y Responsabilidades (RACI)](#2-matriz-de-roles-y-responsabilidades-raci)
3. [Cadencia Operativa y Ciclo de Control (Rituales PMO)](#3-cadencia-operativa-y-ciclo-de-control-rituales-pmo)
   - [3.1 Inicio de Semana (Lunes): Auditoría de Avances y GAP](#31-inicio-de-semana-lunes-auditoría-de-avances-y-gap)
   - [3.2 Mitad de Semana (Miércoles): Comité de Logística y Restricciones](#32-mitad-de-semana-miércoles-comité-de-logística-y-restricciones)
   - [3.3 Jueves: Comité Financiero y Control Presupuestal EVM](#33-jueves-comité-financiero-y-control-presupuestal-evm)
   - [3.4 Cierre de Corte (Viernes): Emisión de Informes Ejecutivos y Dossiers](#34-cierre-de-corte-viernes-emisión-de-informes-ejecutivos-y-dossiers)
4. [Playbooks y Protocolos de Acción por Escenario](#4-playbooks-y-protocolos-de-acción-por-escenario)
   - [4.1 Protocolo ante Atraso Crítico (GAP < -10%)](#41-protocolo-ante-atraso-crítico-gap---10)
   - [4.2 Protocolo de Alerta Regulatoria CREG / OR (≤ 45 días)](#42-protocolo-de-alerta-regulatoria-creg--or--45-días)
   - [4.3 Protocolo de Cuellos de Botella en Suministros (EDT/ETA)](#43-protocolo-de-cuellos-de-botella-en-suministros-edteta)
   - [4.4 Protocolo de Facturación y Aceleración de Recaudo](#44-protocolo-de-facturación-y-aceleración-de-recaudo)
5. [Estandarización de Reportes y Canales de Comunicación](#5-estandarización-de-reportes-y-canales-de-comunicación)
6. [Decálogo de Buenas Prácticas PMO](#6-decálogo-de-buenas-prácticas-pmo)

---

## 1. Propósito y Marco de Gestión
La plataforma **PMO Tracker** no es solo un repositorio de datos; es el **motor de gobierno y toma de decisiones** de la organización. Esta metodología define los procesos estándar, responsabilidades y tiempos de respuesta para asegurar que los proyectos cumplan sus metas de plazo, costo, calidad y rentabilidad.

---

## 2. Matriz de Roles y Responsabilidades (RACI)

| Rol | Responsabilidad Principal | Módulos a su Cargo |
| :--- | :--- | :--- |
| **Ingeniero de Proyecto (PM)** | Responsable directo del cumplimiento del cronograma, relación con el cliente y gestión de restricciones. | Cronograma, Novedades, Detalle Proyecto |
| **Residente de Obra (Civil/Eléctrico)** | Reporta el avance real de campo y el estado físico de instalación de equipos. | Cronograma (Avance Real), Equipos (En sitio/Instalado) |
| **Coordinador Logístico / Compras** | Actualiza estados de compra, fechas de despacho (EDT) y arribo a obra (ETA). | Equipos Principales, Alertas de Suministro |
| **Control Financiero / Facturación** | Gestiona la radicación de facturas, fechas de trámite y cobro de hitos. | Hitos de Pago, Presupuesto EVM |
| **Oficina PMO** | Audita coherencia de datos, analiza tendencias de GAP, emite diagnósticos y genera reportes ejecutivos. | Dashboard General, Centro de Informes, EVM |
| **Gerencia General / Dirección** | Revisa indicadores consolidados, aprueba planes de choque y toma decisiones estratégicas. | Dashboard Ander, Resumen Ejecutivo |

---

## 3. Cadencia Operativa y Ciclo de Control (Rituales PMO)

Para maximizar el impacto de la herramienta, se establece la siguiente rutina semanal:

```
┌─────────────────┬──────────────────┬──────────────────┬─────────────────┐
│     LUNES       │    MIÉRCOLES     │      JUEVES      │     VIERNES     │
│  Actualización  │    Comité de     │      Comité      │   Cierre PMO    │
│  de Cronogramas │  Restricciones   │    Financiero    │    Emisión de   │
│     y GAP       │   y Suministros  │     y EVM        │    Reportes     │
└─────────────────┴──────────────────┴──────────────────┴─────────────────┘
```

### 3.1 Inicio de Semana (Lunes): Auditoría de Avances y GAP
- **Objetivo:** Actualizar el estado real de los proyectos al corte del fin de semana.
- **Acciones en la Plataforma:**
  1. En la pestaña **Cronograma y Avances**, ingresar el `% Real` alcanzado.
  2. Verificar la columna **Tendencia**: validar si el GAP mejoró, empeoró o se mantuvo.
  3. Revisar el semáforo automático. Todo proyecto en 🔴 **Atrasado Crítico (< -10%)** debe actualizar su apreciación/nota explicativa.

### 3.2 Mitad de Semana (Miércoles): Comité de Logística y Restricciones
- **Objetivo:** Destrabar obstáculos que impactan la ruta crítica.
- **Acciones en la Plataforma:**
  1. Entrar a la pestaña **Equipos Principales** y validar fechas **EDT** (*Despacho*) y **ETA** (*Llegada*).
  2. Comprobar la coherencia: *¿La fecha ETA de paneles o inversores es anterior a la FPO?* Si no, registrar alerta.
  3. En la pestaña **Novedades**, revisar la matriz de 4 cuadrículas (Activas, En Revisión, Pendientes, Completadas).
  4. Asignar responsables directos y compromisos con fechas de cierre.

### 3.3 Jueves: Comité Financiero y Control Presupuestal EVM
- **Objetivo:** Monitorear liquidez, cartera y eficiencia de costos.
- **Acciones en la Plataforma:**
  1. En **Hitos de Pago**, verificar los hitos `En trámite`: todo hito con más de 15 días debe gestionarse con el cliente.
  2. Validar que la **TRM del Proyecto** esté actualizada para evitar distorsiones en el `% Cobrado`.
  3. En la pestaña **Presupuesto**, analizar el índice **CPI**. Si `CPI < 0.95`, convocar sesión de control de costos para revisar el sobrecosto frente al BAC.

### 3.4 Cierre de Corte (Viernes): Emisión de Informes Ejecutivos y Dossiers
- **Objetivo:** Rendición de cuentas y comunicación ejecutiva a la Dirección y Grupos de Interés.
- **Acciones en la Plataforma:**
  1. Abrir el **Centro de Informes Ejecutivos (`📊 Reportes`)**.
  2. Generar el **Resumen General** o **Dossier Completo** (1 página por proyecto).
  3. Exportar en **PNG de alta resolución** para la presentación gerencial o descargar en **PDF** para archivo formal.
  4. Usar el botón de **Reporte Flash** en la tabla de cronograma para enviar resúmenes ejecutivos vía WhatsApp o Teams.

---

## 4. Playbooks y Protocolos de Acción por Escenario

### 4.1 Protocolo ante Atraso Crítico (GAP < -10%)
1. **Identificación Inmediata:** La plataforma resalta la fila en rojo 🔴.
2. **Análisis de Causa Raíz:** En la pestaña *Novedades*, registrar la restricción causante (Suministro, Clima, OR, Contratista).
3. **Plan de Choque:** El PM debe estructurar en un plazo no mayor a 48 horas:
   - Incremento de frentes de trabajo o turnos extendidos.
   - Ajuste de cuadrillas de montaje electromecánico.
4. **Compromiso en Plataforma:** Registrar en la casilla de *Notas del Proyecto* el compromiso de recuperación para medirlo en el corte siguiente.

### 4.2 Protocolo de Alerta Regulatoria CREG / OR (≤ 45 días)
1. **Detección Preventiva:** En la pestaña *Alertas*, revisar los proyectos con plazo CREG en amarillo/rojo.
2. **Acción Operativa:**
   - Si faltan ≤ 45 días: Confirmar si el punto de conexión y las pruebas con el Operador de Red están agendadas.
   - Si existe riesgo de no cumplir la fecha CREG: Iniciar inmediatamente la solicitud de prórroga regulatoria fundamentada con los soportes de obra.

### 4.3 Protocolo de Cuellos de Botella en Suministros (EDT/ETA)
1. **Regla de Oro:** `ETA del Equipo + Tiempo de Montaje ≤ Fecha FPO`.
2. Si el proveedor reprograma la fecha **EDT** (*Salida de fábrica*), actualizar el campo inmediatamente en la matriz de equipos.
3. Si la nueva fecha **ETA** choca con la FPO, la plataforma generará automáticamente la alerta en la pestaña *Alertas & Logística*.

### 4.4 Protocolo de Facturación y Aceleración de Recaudo
1. Al cumplir un hito de obra (ej: *Llegada de trackers*), cambiar el estado a `En trámite` e ingresar la **Fecha de Radicación**.
2. La plataforma calculará automáticamente los días en trámite.
3. Si se realiza un pago parcial, pasar el estado a `Saldo Pendiente` e ingresar el monto restante en cobro para mantener la exactitud del flujo de caja.

---

## 5. Estandarización de Reportes y Canales de Comunicación

| Canal de Comunicación | Tipo de Reporte Recomendado | Frecuencia |
| :--- | :--- | :--- |
| **Grupos Operativos de WhatsApp / Teams** | **Reporte Flash en Texto:** Copiado desde el icono de mensaje de cada proyecto. | Diario / Semanal |
| **Comité de Dirección / Gerencia** | **Snapshot PNG (2.5x):** Generado desde el Centro de Informes para presentaciones de diapositivas. | Quincenal / Mensual |
| **Junta Directiva / Entidades Financieras** | **Dossier Ejecutivo en PDF:** Reporte formal encuadernado de 1 página por proyecto. | Mensual / Fin de Etapa |
| **Auditoría & Análisis de Datos** | **Libro Excel Multilibro (`.xlsx`):** Descarga íntegra de Cronogramas, Equipos y Presupuestos. | Por Demanda |

---

## 6. Decálogo de Buenas Prácticas PMO

1. **Datos al Día:** Un cronograma sin actualizar en 7 días pierde su valor predictivo.
2. **Cero Proyectos con Datos Falsos:** Cada proyecto nuevo debe iniciar limpio y con valores reales.
3. **TRM Siempre Asignada:** Verifica que cada proyecto con componentes en USD tenga su TRM real para garantizar la exactitud de cobranza y presupuesto.
4. **Fechas EDT y ETA Obligatorias:** Nunca dejar en blanco las fechas de equipos críticos una vez emitida la Orden de Compra.
5. **Comentarios SMART:** En la pestaña de Novedades, registra acciones concretas con responsable y fecha, evitando descripciones vagas.
6. **Alertas son Oportunidades:** Revisa la pestaña de Alertas semanalmente; anticiparse a un vencimiento CREG ahorra multas millonarias.
7. **Consistencia de Conexión:** Si un proyecto pasa a `Energizado`, valida que la fecha COD esté definida.
8. **Control de Saldo Parcial:** Usa el estado `Saldo Pendiente` para cobros fraccionados y no perder visibilidad de la cartera.
9. **Medición de Tendencia:** Premia los proyectos que mejoran su GAP entre cortes (+0.5% o más) y apoya a los que empeoran.
10. **Decisiones Basadas en Datos:** Usa el *Dashboard Ander* y los *Índices EVM* como la única fuente de verdad en las reuniones de gerencia.
