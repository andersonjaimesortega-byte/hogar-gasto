# 📘 Manual de Usuario — Plataforma PMO Tracker

Bienvenido al **Manual Oficial de Usuario** de la plataforma **PMO Tracker**, el sistema integral de control, seguimiento y diagnóstico ejecutivo para proyectos de infraestructura, energía solar y obras de ingeniería.

---

## 📑 Tabla de Contenido
1. [Introducción y Objetivos](#1-introducción-y-objetivos)
2. [Arquitectura y Navegación General](#2-arquitectura-y-navegación-general)
3. [Gestión de Portafolios y Proyectos](#3-gestión-de-portafolios-y-proyectos)
4. [Módulos Principales del Portafolio](#4-módulos-principales-del-portafolio)
   - [4.1 Resumen Ejecutivo (Dashboard Overview)](#41-resumen-ejecutivo-dashboard-overview)
   - [4.2 Cronograma y Avances](#42-cronograma-y-avances)
   - [4.3 Alertas & Logística](#43-alertas--logística)
   - [4.4 Matriz de Equipos Principales](#44-matriz-de-equipos-principales)
   - [4.5 Hitos de Pago y Facturación](#45-hitos-de-pago-y-facturación)
   - [4.6 Presupuesto & EVM (Gestión del Valor Ganado)](#46-presupuesto--evm-gestión-del-valor-ganado)
   - [4.7 Novedades & Restricciones](#47-novedades--restricciones)
5. [Dashboard General — Vista Gerencial (Ander Dashboard)](#5-dashboard-general--vista-gerencial-ander-dashboard)
6. [Centro de Informes Ejecutivos & Exportación](#6-centro-de-informes-ejecutivos--exportación)
7. [Importación y Exportación en Excel](#7-importación-y-exportación-en-excel)
8. [Fórmulas y Criterios del Sistema](#8-fórmulas-y-criterios-del-sistema)

---

## 1. Introducción y Objetivos
**PMO Tracker** permite a gerentes de proyecto, directores de obra, coordinadores de ingeniería y la Oficina de Gestión de Proyectos (PMO):
- Monitorear el avance real versus la meta programada en tiempo real.
- Detectar tempranamente desvíos críticos (**GAP < -10%**) y riesgos regulatorios (**CREG ≤ 45 días**).
- Rastrear la cadena logística de suministro de equipos mediante fechas **EDT** (*Despacho*) y **ETA** (*Llegada*).
- Controlar el flujo de caja bimonetario (**COP y USD**) por hitos de facturación y estado de cobro.
- Medir la eficiencia presupuestal y desempeño mediante **EVM** (*Earned Value Management: CPI, SPI, EAC, Margen*).
- Emitir reportes instantáneos en texto para canales como WhatsApp/Teams y dossiers ejecutivos en PDF/PNG.

---

## 2. Arquitectura y Navegación General

La interfaz está dividida en 3 zonas principales:

```
┌─────────────────┬────────────────────────────────────────────────────────────────────────┐
│                 │  BARRA SUPERIOR (Navbar): Búsqueda, Filtro Semáforo, Botones de Acción │
│  BARRA LATERAL  ├────────────────────────────────────────────────────────────────────────┤
│    (Sidebar)    │  PANEL PRINCIPAL:                                                      │
│                 │  • Vista Gerencial Multicartera (Dashboard Ander)                      │
│ • Lista de      │  • Pestañas del Portafolio:                                            │
│   Portafolios   │    [Cronograma] [Alertas] [Equipos] [Facturación] [Presupuesto] [Novedades]
│ • Acciones Port │                                                                        │
│ • Estado Sync   │                                                                        │
└─────────────────┴────────────────────────────────────────────────────────────────────────┘
```

- **Barra Lateral (Sidebar):** Muestra todos los portafolios creados, permite alternar entre ellos o abrir el **Dashboard General**, además de añadir nuevos portafolios (`+ Nuevo Portafolio`), editarlos o eliminarlos.
- **Barra Superior (Navbar):**
  - **Buscador en tiempo real:** Filtra proyectos por nombre o código XM.
  - **Filtro de Semáforo:** Muestra proyectos por estado (`Todos`, `Atrasado`, `En riesgo`, `En tiempo`, `Adelantado`, `Completado`).
  - **Botón `+ Nuevo Proyecto`:** Crea un proyecto en blanco dentro del portafolio activo.
  - **Botón `📥 Importar Excel`:** Carga masiva de proyectos y datos.
  - **Botón `📊 Reportes`:** Abre el generador de informes ejecutivos imprimibles.
  - **Botón `📗 Exportar Excel`:** Descarga una copia completa en formato `.xlsx`.

---

## 3. Gestión de Portafolios y Proyectos

### 3.1 Crear un Portafolio
1. En la barra lateral, pulsa **`+ Nuevo Portafolio`**.
2. Ingresa el **Nombre**, **Código** (ej: `PORT-01`), **Responsable ATC** y una breve descripción.
3. Haz clic en **Guardar Portafolio**.

### 3.2 Crear y Editar Proyectos
- Para agregar un proyecto, presiona el botón **`+ Nuevo Proyecto`** en la barra superior.
- Cada nuevo proyecto se genera **completamente limpio** (sin datos ficticios predeterminados).
- Para editar sus datos generales (Nombre, Ingeniero de Proyecto, Residentes Civil y Eléctrico, Operador de Red, TRM del Proyecto, CAPEX y BAC), haz clic en el icono de **Lápiz / Editar** en la fila del proyecto o presiona **Detalle del Proyecto**.

---

## 4. Módulos Principales del Portafolio

Al seleccionar un portafolio en la barra lateral, dispones de 6 pestañas operativas y un panel superior de KPIs consolidados.

### 4.1 Resumen Ejecutivo (Dashboard Overview)
Ubicado en la parte superior de la vista del portafolio, resume:
1. **Avance & Desviación (GAP Global):** Avance real promedio, meta programada ponderada y badge de estado con semáforo.
2. **Facturación & Recaudo:** Total consolidado en COP y USD, monto recaudado, monto en trámite y **% Cobrado Ponderado**.
3. **Conexión a Red:** Cantidad de proyectos en Montaje, Energizados y Entregados.
4. **Próximos Hitos Críticos:** Línea temporal ordenada automáticamente con las fechas más próximas de FPO y COD.

---

### 4.2 Cronograma y Avances
Es la matriz central de control de ejecución física de los proyectos.

- **Avance Real (%) y Avance Programado (%):** Ingresa los porcentajes de avance del corte.
- **GAP Automático:** Se calcula como `Avance Real - Avance Programado`.
- **Semáforo del Proyecto:**
  - 🔴 **Atrasado Crítico:** GAP menor a -10.0%.
  - 🟡 **Rezago Leve:** GAP entre -10.0% y 0.0%.
  - 🟢 **En tiempo:** GAP entre 0.0% y +5.0%.
  - 🔵 **Adelantado:** GAP mayor a +5.0%.
  - 🟣 **Completado:** Avance Real ≥ 100% o proyecto entregado.
- **Tendencia respecto al corte anterior:** Compara el GAP actual con el `GAP Anterior` e indica automáticamente si el proyecto **Mejoró (▲)**, **Empeoró (▼)** o se mantiene **Estable (=)**.
- **Fechas Hito:** FPO (Puesta en Operación), COD (Operación Comercial) y Vencimiento CREG.
- **Estado de Conexión a Red:** Selector de etapa (`DD`, `Ingeniería`, `Montaje`, `Energizado`, `Entregado`).
- **Reporte Flash (Icono de Mensaje / Compartir):**
  - **Por Proyecto:** Genera y copia al portapapeles un resumen formateado para WhatsApp/Teams/Email con estado, GAP, hitos de conexión, apreciaciones y diagnóstico.
  - **Consolidado del Portafolio:** Descarga un archivo `.txt` con la comparativa de todos los proyectos del portafolio.

---

### 4.3 Alertas & Logística
Monitorea de forma preventiva 4 riesgos operativos en tarjetas colapsables:
1. **Riesgo FPO:** Proyectos con retraso crítico (**GAP < -10%** o **> 15%**) que amenazan la fecha de puesta en operación.
2. **Equipos & Suministros:** Alertas de equipos con orden de compra no emitida (`No pedido`), `Pendiente OC` o cuellos de botella donde la fecha ETA es posterior a la FPO.
3. **Alertas Regulatorias CREG:** Proyectos con plazo CREG vencido o que vencen en **≤ 45 días**.
4. **Facturación Estancada:** Hitos de pago radicados en estado `En trámite` o `Saldo Pendiente` con más de **15 días** sin desembolso.

---

### 4.4 Matriz de Equipos Principales
Rastreo detallado de los 5 componentes críticos de la planta:
- ☀️ **Paneles:** Módulos fotovoltaicos.
- 📐 **Trackers:** Seguidores solares / estructuras.
- 📦 **Shelter:** Centro de transformación / caseta MT.
- ⚡ **Inversores:** Inversores de potencia.
- 🔌 **Reconectador:** Celda MT / protección de reconexión.

#### Campos configurables por equipo:
1. **Estado:** Selector con código de colores (`No pedido`, `Pendiente OC`, `Fabricación`, `Buscando booking`, `Tránsito marítimo`, `En tránsito`, `Nacionalización`, `En despacho`, `En sitio`, `Instalado`, `Retrasado`).
2. **EDT (*Estimated Departure / Dispatch Time*):** Fecha estimada de salida de fábrica o despacho desde puerto origen.
3. **ETA (*Estimated Time of Arrival*):** Fecha estimada de arribo a la obra o puerto de destino.

---

### 4.5 Hitos de Pago y Facturación
Control bimonetario de cobranza y flujo financiero por proyecto.

- **Selección de Proyecto:** Escoge el proyecto en el selector superior.
- **Indicadores Financieros:** Total COP, Total USD, Monto Cobrado, Monto en Trámite, Monto por Cobrar y **% Cobrado** (calculado con la TRM específica del proyecto).
- **Tabla de Hitos:**
  - **Nombre del Hito:** Descripción editable (ej: *Anticipo, Llegada de equipos, Puesta en marcha*).
  - **% / Valor COP y % / Valor USD:** Se puede ingresar como porcentaje del CAPEX o como monto directo en dinero.
  - **Estado del Cobro:**
    - `Cobrado`: Hito desembolsado y recaudado al 100%.
    - `Por cobrar`: Hito aún no radicado.
    - `En trámite`: Radicado ante el cliente; activa un campo de **Fecha de Radicación** y contador de días transcurridos.
    - `Saldo Pendiente`: Hito con cobro parcial; habilita un recuadro para definir el saldo exacto que resta por cobrar.
  - **Botón `+ Agregar Hito de Pago`:** Agrega filas de cobro adicionales.

---

### 4.6 Presupuesto & EVM (Gestión del Valor Ganado)
Mide la eficiencia del gasto frente al avance físico:
- **BAC (*Budget at Completion*):** Presupuesto total base.
- **AC (*Actual Cost*):** Costo real ejecutado a la fecha.
- **EV (*Earned Value*):** Valor ganado (`BAC × % Avance Real`).
- **CPI (*Cost Performance Index*):** Eficiencia de costos (`EV / AC`).
  - `CPI ≥ 1.0`: Saludable (bajo presupuesto o en costo).
  - `0.95 ≤ CPI < 1.0`: En riesgo.
  - `CPI < 0.95`: 🔴 Sobrecosto.
- **SPI (*Schedule Performance Index*):** Eficiencia de cronograma (`% Real / % Programado`).
- **EAC (*Estimate at Completion*):** Pronóstico de costo final del proyecto.
- **Margen Proyectado:** Ganancia esperada (`CAPEX Venta - EAC`) y porcentaje de rentabilidad.

---

### 4.7 Novedades & Restricciones
Bitácora de seguimiento para destrabar cuellos de botella y gestionar compromisos entre áreas:
- **Cuadrícula de Indicadores (4 KPIs):**
  1. 🟢 **Novedades Activas**
  2. 🟡 **En Revisión**
  3. 🔴 **Pendientes**
  4. ⚪ **Completadas**
- **Categorías de Restricción:** *Suministro, Diseño, Logística, Calidad, OR/CREG, Financiera, Montaje, Legal, Social/Ambiental*.
- **Registro de Novedad:** Incluye responsable, descripción del obstáculo, preguntas de seguimiento y plan de acción de respuesta.
- **Exportación de Novedades:** Descarga en texto estructurado de restricciones abiertas por proyecto o del portafolio completo para minutas de reunión.

---

## 5. Dashboard General — Vista Gerencial (Ander Dashboard)

Diseñado para directores de PMO y la Gerencia General, accesible pulsando **`Dashboard General`** en la barra lateral:
- **Tarjetas Globales:** Total de portafolios, total de proyectos en ejecución, avance real vs programado ponderado, conexión global a la red, alertas CREG críticas y efectividad global de recaudación.
- **Matriz de Portafolios:** Muestra cada portafolio con su clasificación de salud (`Saludable`, `En Seguimiento`, `Atención Urgente`), cantidad de proyectos, SPI, CPI y porcentaje de proyectos conectados.
- **Generación de Reporte Global:** Permite abrir el informe ejecutivo con alcance consolidado de toda la compañía.

---

## 6. Centro de Informes Ejecutivos & Exportación

Al presionar el botón **`📊 Reportes`**, se abre el generador de reportes con 3 modalidades:

### 6.1 Modalidades de Reporte
1. **📊 Resumen General:** Vista consolidada del portafolio con indicadores clave, diagnósticos, tabla comparativa de cronogramas y firmas de aprobación PMO.
   - *Personalización Modular:* Puedes activar/desactivar qué bloques incluir (Tarjetas KPI, Diagnóstico, Tabla de Cronograma, Firmas).
2. **📄 Ficha Ejecutiva One-Pager / Dossier:** Ficha técnica de 1 página por proyecto con semáforo, curva de avance, hitos de conexión, equipos críticos, facturación y restricciones.
   - *Modo Dossier:* Permite imprimir en un solo documento continuo todas las fichas del portafolio (1 página por proyecto).
3. **📋 Matriz Comparativa:** Tabla ejecutiva integral con semáforos de todos los proyectos lado a lado.

### 6.2 Opciones de Descarga
- **Descargar PNG:** Genera una imagen en alta definición (2.5× pixel ratio) lista para incrustar en presentaciones ejecutivas.
- **Imprimir / Guardar como PDF:** Aplica estilos CSS `@media print` optimizados sin barras de navegación ni fondos innecesarios, compatible con orientación vertical u horizontal.

---

## 7. Importación y Exportación en Excel

### 7.1 Exportación (`.xlsx`)
Al presionar **`📗 Exportar`**, el sistema genera un libro Excel con 2 hojas:
1. **Cronograma:** Proyectos, avances, GAP, fechas FPO, COD, CREG, responsables y notas.
2. **Equipos:** Matriz de los 5 equipos con sus estados, fechas EDT, fechas ETA y marcas.

### 7.2 Importación
1. Presiona **`📥 Importar`** en la barra superior.
2. Arrastra tu archivo Excel o selecciónalo.
3. El motor inteligente detecta automáticamente los encabezados de columnas (incluso con nombres alternativos como *Obra, Proyecto, % Real, FPO, etc.*) y actualiza el portafolio.

---

## 8. Fórmulas y Criterios del Sistema

| Métrica / Concepto | Fórmula / Criterio | Interpretación |
| :--- | :--- | :--- |
| **GAP (% Desviación)** | $\text{Real \%} - \text{Programado \%}$ | Negativo = Atraso; Positivo = Adelanto |
| **Atrasado Crítico** | $\text{GAP} < -10.0\%$ | Requiere plan de choque inmediato |
| **Rezago Leve** | $-10.0\% \le \text{GAP} < 0.0\%$ | En monitoreo preventivo |
| **En Tiempo** | $0.0\% \le \text{GAP} \le +5.0\%$ | Alineado con el cronograma base |
| **Adelantado** | $\text{GAP} > +5.0\%$ | Ejecución por encima de la meta |
| **% Cobrado Ponderado** | $\frac{\text{Cobrado COP} + (\text{Cobrado USD} \times \text{TRM})}{\text{Total COP} + (\text{Total USD} \times \text{TRM})} \times 100$ | Porcentaje financiero real recaudado |
| **Alerta CREG** | $\text{Fecha CREG} - \text{Hoy} \le 45\text{ días}$ | Alerta amarilla/roja por vencimiento de resolución |
| **Earned Value (EV)** | $\text{BAC} \times (\text{Real \%} / 100)$ | Valor ganado en dinero del avance físico |
| **CPI (Costo)** | $\text{EV} / \text{AC}$ | $>1.0$ Ahorro; $<1.0$ Sobrecosto |
| **SPI (Cronograma)** | $\text{Real \%} / \text{Programado \%}$ | $>1.0$ Adelanto; $<1.0$ Retraso |
| **EAC (Pronóstico Final)** | $\text{BAC} / \text{CPI}$ | Costo total proyectado al cierre |

---

> 💡 **Soporte & Actualizaciones:** Esta plataforma se encuentra en constante evolución. Para sugerir nuevas funciones o reportar novedades, contacta a la Oficina PMO.
