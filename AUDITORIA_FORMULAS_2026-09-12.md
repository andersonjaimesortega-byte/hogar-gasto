# Auditoría de fórmulas — PMO Tracker

Fecha: 2026-09-12. Alcance: Cronograma, Alertas, Equipos, Hitos, Presupuesto y Dashboard Global.

## Inventario verificado

| Dominio | Implementación | Resultado de la revisión |
|---|---|---|
| GAP de proyecto | `calculateGap`: real − programado | Conforme. |
| Estado GAP | `determineStatus` | Conforme con En Tiempo / Rezago Leve / Atrasado Crítico. |
| GAP de portafolio | `getPortfolioMetrics` | Pondera avance real y programado por CAPEX blended; GAP se calcula al final. Tiene fallback simple si no existe CAPEX. |
| CREG | `getCregRegulatoryRisk` | Usa Ven. CREG − FPO, omite proyectos conectados y no alerta si falta CREG/FPO. |
| EVM | `getProjectBudgetMetrics` | BAC, AC, EV, CPI, CV, EAC y margen siguen las fórmulas especificadas. |
| Totales EVM | `getPortfolioBudgetMetrics` | CPI sobre EV/AC sumados; conforme. |
| SPI | `getPortfolioPerformanceIndices` | EV/PV ponderado por CAPEX; conforme. |

## Hallazgos antes de corrección

1. **[Medio] `cpiAnterior` se sobrescribe durante cada edición de AC.**
   - Ubicación: `BudgetView.jsx`.
   - Actual: cada cambio de `acCOP` o `acUSD` guarda el CPI vigente como anterior.
   - Esperado: solo debe actualizarse al cerrar un corte quincenal; editar un valor parcial no debe destruir la comparación histórica.

2. **[Medio] TRM ausente descarta de forma silenciosa los componentes USD.**
   - Ubicación: `budgetCalculations.js`.
   - Actual: TRM 0 multiplica USD por 0; la UI muestra una advertencia genérica incluso si no hay USD.
   - Esperado: advertir únicamente cuando exista un componente USD sin TRM y no presentar una conversión incompleta como cálculo válido.

3. **[Menor] Orden en empates depende de estabilidad implícita del motor.**
   - Ubicación: `ProjectTable.jsx`.
   - Esperado: conservar de forma explícita el orden inicial para valores iguales.

4. **[Menor] Lógica de filtrado/ordenamiento duplicada.**
   - Ubicación: `useProjectFilter.js` y `ProjectTable.jsx`.
   - Impacto: riesgo de divergencia futura; no altera los resultados actuales porque la tabla usa su propia ruta.

## Riesgos no corregidos en esta pasada

- El almacenamiento actual es `localStorage`, no una API; ante datos dañados se registra el error y se cargan datos por defecto, sin aviso visual específico al usuario.
- El fallback de GAP a promedio simple cuando todos los CAPEX son 0 evita `NaN`, pero no equivale a una ponderación financiera. Debe configurarse CAPEX/TRM para una lectura financiera real.
