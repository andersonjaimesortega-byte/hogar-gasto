// Dibujar/Actualizar gráfico circular interactivo
function updateCategoryChart(ctx, filteredExpenses, currentChartInstance, legendContainer) {
    const categoriesSum = {};
    
    // Inicializar categorías en 0
    Object.keys(categoryColors).forEach(cat => {
        categoriesSum[cat] = 0;
    });
    
    // Sumar gastos/ingresos por categoría
    filteredExpenses.forEach(exp => {
        const cat = exp.category || 'Otros';
        if (categoriesSum[cat] !== undefined) {
            categoriesSum[cat] += Number(exp.amount);
        } else {
            categoriesSum['Otros'] += Number(exp.amount);
        }
    });
    
    // Filtrar categorías que tienen un valor mayor a cero
    const activeCategories = Object.keys(categoriesSum).filter(cat => categoriesSum[cat] > 0);
    const dataValues = activeCategories.map(cat => categoriesSum[cat]);
    const backgroundColors = activeCategories.map(cat => categoryColors[cat]);
    
    // Actualizar leyenda personalizada debajo del gráfico
    legendContainer.innerHTML = '';
    
    activeCategories.forEach((cat, index) => {
        const total = dataValues[index];
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${categoryColors[cat]};"></div>
            <span>${categoryEmojis[cat] || '⚙️'} ${cat}: <strong>${formatCOP.format(total)}</strong></span>
        `;
        legendContainer.appendChild(legendItem);
    });

    // Si ya existe una instancia de gráfico, destruirla para redibujar
    if (currentChartInstance) {
        currentChartInstance.destroy();
    }
    
    if (activeCategories.length === 0) {
        // Limpiar lienzo si no hay datos
        ctx.clearRect(0, 0, 200, 200);
        legendContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem; text-align: center; width: 100%;">Registra transacciones para ver la distribución.</span>';
        return null;
    }
    
    // Crear el gráfico usando Chart.js
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: activeCategories,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Usamos nuestra leyenda HTML
                },
                tooltip: {
                    backgroundColor: 'rgba(8, 12, 20, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#f3f4f6',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return ` ${label}: ${formatCOP.format(value)} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}
