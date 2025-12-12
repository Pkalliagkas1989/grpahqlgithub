// docs/js/charts.js

(function () {
  function clearSvg(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function showEmptyState(svg, message) {
    clearSvg(svg);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "50");
    text.setAttribute("y", "30");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "chart__label");
    text.textContent = message;
    svg.appendChild(text);
  }

  function formatCompactNumber(value) {
    const n = Number(value) || 0;
    const abs = Math.abs(n);

    if (abs >= 1_000_000_000) {
      return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
    }
    if (abs >= 1_000_000) {
      return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (abs >= 1_000) {
      return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return n.toString();
  }

  // 1) XP over time (cumulative line)
  function renderXpOverTime(svg, xpRows) {
    if (!svg) return;

    if (!xpRows || xpRows.length === 0) {
      showEmptyState(svg, "No XP data yet");
      return;
    }

    clearSvg(svg);

    const rows = [...xpRows].reverse();
    const values = [];
    let cumulative = 0;

    for (const row of rows) {
      cumulative += Number(row.amount) || 0;
      values.push({ cumulative });
    }

    const maxValue = values.reduce((m, p) => Math.max(m, p.cumulative), 0);
    if (maxValue === 0) {
      showEmptyState(svg, "XP data is zero");
      return;
    }

    const width = 100;
    const height = 60;
    const marginLeft = 6;
    const marginRight = 3;
    const marginTop = 4;
    const marginBottom = 7;

    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    const n = values.length;
    const stepX = n > 1 ? innerWidth / (n - 1) : 0;

    const axisX = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axisX.setAttribute("x1", marginLeft);
    axisX.setAttribute("y1", height - marginBottom);
    axisX.setAttribute("x2", width - marginRight);
    axisX.setAttribute("y2", height - marginBottom);
    axisX.setAttribute("class", "chart__axis");
    svg.appendChild(axisX);

    const axisY = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axisY.setAttribute("x1", marginLeft);
    axisY.setAttribute("y1", marginTop);
    axisY.setAttribute("x2", marginLeft);
    axisY.setAttribute("y2", height - marginBottom);
    axisY.setAttribute("class", "chart__axis");
    svg.appendChild(axisY);

    [0, 0.5, 1].forEach((p) => {
      const y = marginTop + innerHeight - innerHeight * p;
      const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      gridLine.setAttribute("x1", marginLeft);
      gridLine.setAttribute("y1", y.toString());
      gridLine.setAttribute("x2", width - marginRight);
      gridLine.setAttribute("y2", y.toString());
      gridLine.setAttribute("class", "chart__grid");
      svg.appendChild(gridLine);
    });

    let dLine = "";
    let dArea = `M ${marginLeft} ${height - marginBottom}`;

    values.forEach((point, index) => {
      const x = marginLeft + stepX * index;
      const norm = point.cumulative / maxValue;
      const y = marginTop + (1 - norm) * innerHeight;

      dLine += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      dArea += ` L ${x} ${y}`;
    });

    dArea += ` L ${marginLeft + stepX * (values.length - 1)} ${height - marginBottom} Z`;

    const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    areaPath.setAttribute("d", dArea);
    areaPath.setAttribute("class", "chart__area");
    areaPath.setAttribute("fill", "#4f46e5");
    areaPath.setAttribute("fill-opacity", "0.2");
    svg.appendChild(areaPath);

    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    linePath.setAttribute("d", dLine);
    linePath.setAttribute("class", "chart__line");
    linePath.setAttribute("stroke", "#a5b4fc");
    svg.appendChild(linePath);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", width - marginRight);
    label.setAttribute("y", marginTop + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "chart__label");
    label.textContent = `Total: ${formatCompactNumber(maxValue)} XP`;
    svg.appendChild(label);
  }

  // 2) Pass/Fail ratio
  function renderPassFailRatio(svg, results) {
    if (!svg) return;

    if (!results || results.length === 0) {
      showEmptyState(svg, "No results yet");
      return;
    }

    clearSvg(svg);

    let passCount = 0;
    let failCount = 0;

    for (const row of results) {
      const grade = Number(row.grade) || 0;
      if (grade >= 1) passCount++;
      else failCount++;
    }

    const total = passCount + failCount;
    if (total === 0) {
      showEmptyState(svg, "No graded results");
      return;
    }

    const passRatio = passCount / total;
    const failRatio = failCount / total;

    const width = 100;
    const height = 60;
    const margin = 10;
    const innerWidth = width - margin * 2;
    const innerHeight = height - margin * 2;

    const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axis.setAttribute("x1", margin);
    axis.setAttribute("y1", height - margin);
    axis.setAttribute("x2", width - margin);
    axis.setAttribute("y2", height - margin);
    axis.setAttribute("class", "chart__axis");
    svg.appendChild(axis);

    const maxBarHeight = innerHeight - 10;

    const passHeight = maxBarHeight * passRatio;
    const failHeight = maxBarHeight * failRatio;

    const barWidth = innerWidth / 4;
    const passX = margin + innerWidth / 4 - barWidth / 2;
    const failX = margin + (3 * innerWidth) / 4 - barWidth / 2;
    const baseY = height - margin;

    const passBar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    passBar.setAttribute("x", passX.toString());
    passBar.setAttribute("y", (baseY - passHeight).toString());
    passBar.setAttribute("width", barWidth.toString());
    passBar.setAttribute("height", passHeight.toString());
    passBar.setAttribute("class", "chart__bar");
    passBar.setAttribute("fill", "#22c55e");
    svg.appendChild(passBar);

    const failBar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    failBar.setAttribute("x", failX.toString());
    failBar.setAttribute("y", (baseY - failHeight).toString());
    failBar.setAttribute("width", barWidth.toString());
    failBar.setAttribute("height", failHeight.toString());
    failBar.setAttribute("class", "chart__bar");
    failBar.setAttribute("fill", "#ef4444");
    svg.appendChild(failBar);

    const passLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    passLabel.setAttribute("x", (passX + barWidth / 2).toString());
    passLabel.setAttribute("y", (baseY + 4).toString());
    passLabel.setAttribute("text-anchor", "middle");
    passLabel.setAttribute("class", "chart__label");
    passLabel.textContent = "PASS";
    svg.appendChild(passLabel);

    const failLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    failLabel.setAttribute("x", (failX + barWidth / 2).toString());
    failLabel.setAttribute("y", (baseY + 4).toString());
    failLabel.setAttribute("text-anchor", "middle");
    failLabel.setAttribute("class", "chart__label");
    failLabel.textContent = "FAIL";
    svg.appendChild(failLabel);

    const passValueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    passValueLabel.setAttribute("x", (passX + barWidth / 2).toString());
    passValueLabel.setAttribute("y", (baseY - passHeight - 2).toString());
    passValueLabel.setAttribute("text-anchor", "middle");
    passValueLabel.setAttribute("class", "chart__label");
    passValueLabel.textContent = `${Math.round(passRatio * 100)}%`;
    svg.appendChild(passValueLabel);

    const failValueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    failValueLabel.setAttribute("x", (failX + barWidth / 2).toString());
    failValueLabel.setAttribute("y", (baseY - failHeight - 2).toString());
    failValueLabel.setAttribute("text-anchor", "middle");
    failValueLabel.setAttribute("class", "chart__label");
    failValueLabel.textContent = `${Math.round(failRatio * 100)}%`;
    svg.appendChild(failValueLabel);
  }

  // 3) Top XP projects
  function renderXpByProject(svg, xpRows) {
    if (!svg) return;

    if (!xpRows || xpRows.length === 0) {
      showEmptyState(svg, "No project XP yet");
      return;
    }

    clearSvg(svg);

    const map = new Map();
    for (const row of xpRows) {
      const name = row.object?.name || "Unknown";
      const amount = Number(row.amount) || 0;
      map.set(name, (map.get(name) || 0) + amount);
    }

    let projects = Array.from(map.entries()).map(([name, total]) => ({ name, total }));
    projects.sort((a, b) => b.total - a.total);
    projects = projects.slice(0, 5);

    const maxValue = projects.reduce((m, p) => Math.max(m, p.total), 0);

    const width = 100;
    const height = 60;
    const marginLeft = 30;
    const marginRight = 5;
    const marginTop = 5;
    const marginBottom = 5;

    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    const maxBarWidth = innerWidth * 0.9;
    const barGap = 3;
    const barHeight =
      projects.length > 0
        ? (innerHeight - barGap * (projects.length - 1)) / projects.length
        : 0;

    projects.forEach((p, idx) => {
      const y = marginTop + idx * (barHeight + barGap);
      const ratio = maxValue > 0 ? p.total / maxValue : 0;
      const barW = maxBarWidth * ratio;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", marginLeft.toString());
      rect.setAttribute("y", y.toString());
      rect.setAttribute("width", barW.toString());
      rect.setAttribute("height", barHeight.toString());
      rect.setAttribute("class", "chart__bar");
      rect.setAttribute("fill", "#6366f1");
      svg.appendChild(rect);

      const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      nameText.setAttribute("x", (marginLeft - 2).toString());
      nameText.setAttribute("y", (y + barHeight * 0.7).toString());
      nameText.setAttribute("text-anchor", "end");
      nameText.setAttribute("class", "chart__label");
      nameText.textContent = p.name.length > 16 ? p.name.slice(0, 15) + "…" : p.name;
      svg.appendChild(nameText);

      const valueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const compact = formatCompactNumber(p.total);

      if (barW > 8) {
        valueText.setAttribute("x", (marginLeft + barW - 1).toString());
        valueText.setAttribute("text-anchor", "end");
      } else {
        valueText.setAttribute("x", (marginLeft + barW + 1).toString());
        valueText.setAttribute("text-anchor", "start");
      }
      valueText.setAttribute("y", (y + barHeight * 0.7).toString());
      valueText.setAttribute("class", "chart__label");
      valueText.textContent = compact;
      svg.appendChild(valueText);
    });

    const titleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    titleText.setAttribute("x", (width - 4).toString());
    titleText.setAttribute("y", (marginTop + 4).toString());
    titleText.setAttribute("text-anchor", "end");
    titleText.setAttribute("class", "chart__label");
    titleText.textContent = `Top ${projects.length}`;
    svg.appendChild(titleText);
  }

  window.Charts = {
    renderXpOverTime,
    renderPassFailRatio,
    renderXpByProject,
  };
})();