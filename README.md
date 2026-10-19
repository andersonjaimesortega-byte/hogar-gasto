# 📊 PMO Tracker - Gestor de Portafolios y Proyectos

Aplicación web interactiva para el seguimiento, control y análisis de **N Portafolios** con **N Proyectos**, diseñada con base en el estándar corporativo de control de proyectos (XM, FPO, COD, Avance Real, Avance Programado, GAP y Estado).

---

## 🚀 Características Principales

- **Gestión Multi-Portafolio (N Portafolios / N Proyectos)**: Crea, edita y organiza múltiples portafolios (ej. Transmisión, Solar, Eólico, etc.) o consulta la **Vista Consolidada Global**.
- **Tabla de Seguimiento Idéntica y Optimizada**:
  - **XM**: Soporte para documentos e informes en PDF con enlaces directos.
  - **Proyecto**: Nombre del proyecto y observaciones.
  - **FPO**: Fecha Prevista de Operación.
  - **COD**: Commercial Operation Date (Fecha de Operación Comercial).
  - **% Avance Real (%)**: Porcentaje ejecutado real.
  - **% Avance Programado (%)**: Porcentaje planificado según cronograma.
  - **GAP (%)**: Cálculo automático (`Avance Real - Avance Programado`) con semáforos de color.
  - **GAP anterior**: Indicador de tendencia (flechas que muestran si la desviación mejoró o empeoró respecto al corte anterior).
  - **Estado**: Clasificación visual rápida (Atrasado, En riesgo, En tiempo, Adelantado).
- **Dashboard Ejecutivo**: KPIs de avance promedio, conteo de proyectos críticos con retraso y barras comparativas.
- **Importación y Exportación Excel (.xlsx / .csv)**:
  - Carga masiva de proyectos desde hojas de cálculo existentes arrastrando el archivo.
  - Exportación con 1 clic de portafolios individuales o de todos los proyectos consolidados.
- **Persistencia Local y Respaldo JSON**: Todo se almacena localmente en tu navegador sin necesidad de servidores externos, con opción de copia de seguridad en JSON.
- **Listo para GitHub Pages**: Configuración con GitHub Actions para despliegue automatizado.

---

## 💻 Cómo ejecutarlo en tu equipo local

1. Abre la terminal en esta carpeta:
   ```bash
   cd "c:\Users\Windows 11\Desktop\PMO"
   ```

2. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```

3. Abre en tu navegador la dirección indicada (usualmente `http://localhost:5173`).

---

## 🌐 Cómo desplegarlo en GitHub Pages

1. Inicializa el repositorio Git (si aún no lo has hecho):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - PMO Tracker"
   ```

2. Crea un repositorio en tu cuenta de [GitHub](https://github.com/new).

3. Conecta y sube tu código:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```

4. En GitHub, ve a **Settings** > **Pages** > En **Source** selecciona **GitHub Actions**. El flujo `.github/workflows/deploy.yml` compilará y publicará la web automáticamente.
