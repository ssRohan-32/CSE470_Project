/**
 * public/js/charts.js
 * Chart.js wrapper for all dashboard charts
 */

// ─── Chart Defaults ───────────────────────────────────────────
Chart.defaults.color = '#8892b0';
Chart.defaults.borderColor = 'rgba(108, 99, 255, 0.1)';
Chart.defaults.font.family = 'Inter, sans-serif';

const COLORS = {
  primary:  '#6c63ff',
  secondary: '#00d4ff',
  success:  '#00e5a0',
  warning:  '#ffd166',
  danger:   '#ff6b6b',
  orange:   '#ff9f43',
  purple:   '#a29bfe',
  Octane: '#ff9f43',
  Diesel: '#a29bfe',
  Petrol: '#00e5a0',
  EV: '#00d4ff',
};

// ─── Line Chart (Spending Trend) ─────────────────────────────
function renderSpendingTrend(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !data.length) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Daily Spending (৳)',
        data: data.map(d => d.daily_spent),
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: COLORS.primary,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, beginAtZero: true }
      }
    }
  });
}

// ─── Doughnut Chart (Fuel Breakdown) ─────────────────────────
function renderFuelDoughnut(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = Object.keys(data);
  const values = labels.map(l => Object.values(data[l]).reduce((s, v) => s + v, 0));

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map(l => COLORS[l] || COLORS.primary),
        borderColor: '#10141f',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 }
        }
      }
    }
  });
}

// ─── Bar Chart (Revenue Trend) ────────────────────────────────
function renderRevenueTrend(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !data.length) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        label: 'Revenue (৳)',
        data: data.map(d => d.revenue),
        backgroundColor: 'rgba(108, 99, 255, 0.6)',
        borderColor: COLORS.primary,
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, beginAtZero: true }
      }
    }
  });
}

// ─── Polar Area (Demographics) ────────────────────────────────
function renderDemographicsChart(canvasId, carFuelMatrix) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const cars = Object.keys(carFuelMatrix);
  const totals = cars.map(c => Object.values(carFuelMatrix[c]).reduce((s, v) => s + v, 0));

  new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: cars,
      datasets: [{
        data: totals,
        backgroundColor: [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.danger].map(c => c + 'AA'),
        borderColor: '#10141f',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right' } }
    }
  });
}

// ─── Production Gauge (Radial Chart) ─────────────────────────
function renderProductionGauge(canvasId, pct) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [pct, 100 - pct],
        backgroundColor: [COLORS.success, 'rgba(255,255,255,0.05)'],
        borderColor: 'transparent',
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '78%',
      rotation: -90,
      circumference: 180,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}

// ─── Discrepancy Chart ────────────────────────────────────────
function renderDiscrepancyChart(canvasId, logs) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !logs.length) return;

  const colors = logs.map(l =>
    l.severity === 'CRITICAL' ? COLORS.danger :
    l.severity === 'WARNING'  ? COLORS.warning :
    l.severity === 'CAUTION'  ? COLORS.orange : COLORS.success
  );

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: logs.map(l => l.log_date),
      datasets: [
        {
          label: 'Invoiced',
          data: logs.map(l => l.invoiced_quantity),
          backgroundColor: 'rgba(0, 212, 255, 0.3)',
          borderColor: COLORS.secondary,
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Recorded Sales',
          data: logs.map(l => l.recorded_sales),
          backgroundColor: 'rgba(0, 229, 160, 0.4)',
          borderColor: COLORS.success,
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { grid: { display: false }, stacked: false },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, beginAtZero: true }
      }
    }
  });
}
