// Responsive SVG Chart Generator for Dashboard Reports
import { formatNumber } from '../utils.js';

export function renderLineChart(container, dataPoints, labelKey, valueKey, prefix = '$') {
    if (!container) return;

    if (!dataPoints || dataPoints.length === 0) {
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 14px;">
                No historical trend data available yet
            </div>
        `;
        return;
    }

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 260;

    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const values = dataPoints.map(d => Number(d[valueKey]) || 0);
    const labels = dataPoints.map(d => String(d[labelKey]));

    const maxVal = Math.max(...values, 100) * 1.15; // 15% buffer
    const minVal = 0;
    const valRange = maxVal - minVal;

    // Calculate coordinates
    const coords = dataPoints.map((dp, i) => {
        const x = paddingLeft + (i / Math.max(dataPoints.length - 1, 1)) * chartWidth;
        const val = Number(dp[valueKey]) || 0;
        const y = paddingTop + chartHeight - ((val - minVal) / valRange) * chartHeight;
        return { x, y, label: labels[i], val };
    });

    // Draw SVG
    let svgContent = `
        <svg class="chart-svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--primary-color)" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="var(--primary-color)" stop-opacity="0.00"/>
                </linearGradient>
            </defs>
    `;

    // Grid Lines & Y-Axis Labels (4 divisions)
    for (let i = 0; i <= 4; i++) {
        const ratio = i / 4;
        const y = paddingTop + chartHeight - ratio * chartHeight;
        const val = minVal + ratio * valRange;

        svgContent += `
            <line class="chart-gridline" x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" />
            <text class="chart-text" x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end">${prefix}${Math.round(val)}</text>
        `;
    }

    // Generate Path descriptions
    if (coords.length > 0) {
        let linePath = `M ${coords[0].x} ${coords[0].y}`;
        let fillPath = `M ${coords[0].x} ${coords[0].y}`;

        for (let i = 1; i < coords.length; i++) {
            linePath += ` L ${coords[i].x} ${coords[i].y}`;
            fillPath += ` L ${coords[i].x} ${coords[i].y}`;
        }

        fillPath += ` L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} L ${coords[0].x} ${paddingTop + chartHeight} Z`;

        // Render Fill Area & Line
        svgContent += `
            <path class="chart-line-gradient" d="${fillPath}" />
            <path class="chart-line" d="${linePath}" />
        `;
    }

    // Dots, Tooltips and X-Axis Labels
    coords.forEach((c, i) => {
        // Show X label for every point, or alternate if there are too many
        const showLabel = coords.length < 8 || i % Math.ceil(coords.length / 8) === 0;

        if (showLabel) {
            svgContent += `
                <text class="chart-text" x="${c.x}" y="${height - 15}" text-anchor="middle">${c.label}</text>
            `;
        }

        svgContent += `
            <circle class="chart-dot" cx="${c.x}" cy="${c.y}" r="5">
                <title>${c.label}: ${prefix}${formatNumber(c.val, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</title>
            </circle>
        `;
    });

    // X-Axis line
    svgContent += `
        <line class="chart-axis" x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${width - paddingRight}" y2="${paddingTop + chartHeight}" />
        </svg>
    `;

    container.innerHTML = svgContent;
}

export function renderBarChart(container, dataPoints, labelKey, valueKey, prefix = '') {
    if (!container) return;

    if (!dataPoints || dataPoints.length === 0) {
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 14px;">
                No stats volume logs recorded yet
            </div>
        `;
        return;
    }

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 260;

    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const values = dataPoints.map(d => Number(d[valueKey]) || 0);
    const labels = dataPoints.map(d => String(d[labelKey]));

    const maxVal = Math.max(...values, 10) * 1.15;
    const minVal = 0;
    const valRange = maxVal - minVal;

    let svgContent = `
        <svg class="chart-svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    `;

    // Y-Axis Grid & labels
    for (let i = 0; i <= 4; i++) {
        const ratio = i / 4;
        const y = paddingTop + chartHeight - ratio * chartHeight;
        const val = minVal + ratio * valRange;

        svgContent += `
            <line class="chart-gridline" x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" />
            <text class="chart-text" x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end">${prefix}${Math.round(val)}</text>
        `;
    }

    const barCount = dataPoints.length;
    const spacing = 0.3; // 30% gap
    const totalBarWidth = chartWidth / barCount;
    const barWidth = totalBarWidth * (1 - spacing);

    dataPoints.forEach((dp, i) => {
        const val = Number(dp[valueKey]) || 0;
        const barH = ((val - minVal) / valRange) * chartHeight;

        const x = paddingLeft + i * totalBarWidth + (totalBarWidth * spacing) / 2;
        const y = paddingTop + chartHeight - barH;

        svgContent += `
            <rect class="chart-bar" x="${x}" y="${y}" width="${barWidth}" height="${Math.max(barH, 2)}" rx="4">
                <title>${labels[i]}: ${prefix}${formatNumber(val)}</title>
            </rect>
            <text class="chart-text" x="${x + barWidth / 2}" y="${height - 15}" text-anchor="middle">${labels[i]}</text>
        `;
    });

    svgContent += `
        <line class="chart-axis" x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${width - paddingRight}" y2="${paddingTop + chartHeight}" />
        </svg>
    `;

    container.innerHTML = svgContent;
}