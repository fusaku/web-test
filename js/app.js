/**
 * 日本住宅ローン計算器 (Japan Mortgage Simulator)
 * 独立项目核心驱动逻辑 - app.js
 * 
 * 核心特性：
 * 1. 自动读取 config.js 配置文件中的参数，支持放款起始年月 (借入開始)
 * 2. 支持【精确到月份】的未来加息时间节点配置（完美适配三菱UFJ等银行每年4月/10月见直、7月/1月调息节奏）
 * 3. 严谨模拟日本浮动利率 (変動金利) 下的 “5年规则 (5年ルール)” 与 “125%规则 (125%ルール)”
 * 4. 真实复现利息倒挂时的 “未付利息 (未払利息)” 挂账与第40年末一次性结清 (一括返済) 风险测算
 * 5. 独立主题引擎 (深色/浅色自适应)、Chart.js 数据可视化与包含日历年月的 UTF-8 BOM CSV 导出
 */

(function () {
  'use strict';

  // --- 读取用户配置文件 (config.js) ---
  const cfg = window.MORTGAGE_CONFIG || {};
  const loanCfg = cfg.defaultLoan || {};
  const chipsCfg = cfg.quickChips || {};
  const sceneCfg = cfg.scenarios || {};

  // --- 本地存储主题管理 (独立于其他项目) ---
  const THEME_STORAGE_KEY = 'japan_mortgage_theme';

  function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
  }

  // --- 状态中心 (从 config.js 初始化) ---
  const state = {
    principalMan: loanCfg.principalMan ?? 3190,
    termYears: loanCfg.termYears ?? 40,
    initialRate: loanCfg.initialRate ?? 1.195,
    startYear: loanCfg.startYear ?? 2026,
    startMonth: loanCfg.startMonth ?? 11,
    repayMethod: loanCfg.repayMethod ?? 'equal_payment',
    enable5YearRule: loanCfg.enable5YearRule ?? true,
    enable125Rule: loanCfg.enable125Rule ?? true,
    currentScenario: sceneCfg.defaultScenario ?? 'mild',
    customMilestones: sceneCfg.customMilestones ? JSON.parse(JSON.stringify(sceneCfg.customMilestones)) : [
      { year: 1, month: 3, rate: 1.345 },
      { year: 1, month: 9, rate: 1.495 },
      { year: 2, month: 3, rate: 1.645 },
      { year: 6, month: 1, rate: 1.950 }
    ],
    activeChartTab: 'payment',
    isTableExpanded: false
  };

  let paymentChart = null;
  let balanceChart = null;

  // --- 格式化工具 ---
  const formatYen = (val) => '¥' + Math.round(val).toLocaleString('ja-JP');
  const formatManYen = (yen) => `${Math.round(yen / 10000).toLocaleString('ja-JP')} 万円`;
  const formatRate = (rate) => (Math.round(rate * 1000) / 1000).toString() + '%';

  // --- 日历年月精准推算 ---
  function getCalendarDate(monthIndex) {
    const total = (state.startYear * 12 + (state.startMonth - 1)) + (monthIndex - 1);
    const calYear = Math.floor(total / 12);
    const calMonth = (total % 12) + 1;
    const moStr = calMonth < 10 ? '0' + calMonth : calMonth.toString();
    return {
      year: calYear,
      month: calMonth,
      label: `${calYear}年${calMonth}月`,
      shortLabel: `${calYear}.${moStr}`
    };
  }

  // --- 金融公式：等额本息标准月供 ---
  const calcPMT = (principal, monthlyRate, months) => {
    if (principal <= 0 || months <= 0) return 0;
    if (monthlyRate === 0) return principal / months;
    const factor = Math.pow(1 + monthlyRate, months);
    return principal * (monthlyRate * factor) / (factor - 1);
  };

  // --- 利率获取逻辑（支持精确到月） ---
  function getRateForMonth(month, totalYears) {
    const year = Math.ceil(month / 12);
    const base = state.initialRate;

    switch (state.currentScenario) {
      case 'flat':
        return base;

      case 'mild':
        // 温和加息：每5年周期递增
        const step = sceneCfg.mildIncreaseStepPer5Years ?? 0.25;
        const periodIdx = Math.floor((month - 1) / 60);
        return +(base + periodIdx * step).toFixed(3);

      case 'steep':
        // 阶梯较快加息
        if (year <= 5) return base;
        if (year <= 10) return +(base + 0.60).toFixed(3);
        if (year <= 15) return +(base + 1.20).toFixed(3);
        if (year <= 20) return +(base + 1.70).toFixed(3);
        if (year <= 25) return +(base + 2.20).toFixed(3);
        return +(base + 2.60).toFixed(3);

      case 'extreme':
        // 极端暴涨测试
        if (year <= 5) return base;
        if (year <= 10) return 3.00;
        if (year <= 15) return 4.50;
        return 4.50;

      case 'custom':
        // 自定义加息时间轴：精确匹配月度节点
        let r = base;
        const sorted = [...state.customMilestones].sort((a, b) => {
          const ma = ((a.year - 1) * 12) + (a.month || 1);
          const mb = ((b.year - 1) * 12) + (b.month || 1);
          return ma - mb;
        });
        for (const item of sorted) {
          const itemMonth = ((item.year - 1) * 12) + (item.month || 1);
          if (month >= itemMonth) {
            r = item.rate;
          }
        }
        return r;

      default:
        return base;
    }
  }

  // --- 核心还款推演引擎 ---
  function runSimulation(options = {}) {
    const principal = options.principal ?? (state.principalMan * 10000);
    const termYears = options.termYears ?? state.termYears;
    const repayMethod = options.repayMethod ?? state.repayMethod;
    const enable5YearRule = options.enable5YearRule ?? state.enable5YearRule;
    const enable125Rule = options.enable125Rule ?? state.enable125Rule;

    const totalMonths = termYears * 12;
    let balance = principal;
    let accumulatedUnpaidInterest = 0;

    let currentPayment = 0;
    let prev5YearPayment = 0;

    const monthlyRecords = [];
    let is125EverTriggered = false;
    let isUnpaidEverTriggered = false;
    let maxPayment = 0;
    let maxPaymentYear = 1;

    for (let m = 1; m <= totalMonths; m++) {
      const year = Math.ceil(m / 12);
      const remMonths = totalMonths - m + 1;
      const rate = getRateForMonth(m, termYears);
      const monthlyRate = (rate / 100) / 12;

      let rule125TriggeredThisMonth = false;

      // 1. 确定本月应扣还款额
      if (repayMethod === 'equal_payment') {
        if (m === 1) {
          currentPayment = Math.round(calcPMT(balance, monthlyRate, remMonths));
          prev5YearPayment = currentPayment;
        } else if (enable5YearRule) {
          // 5年规则重评节点 (第61月、121月、181月、241月、301月、361月、421月...)
          if ((m - 1) % 60 === 0) {
            const unconstrained = Math.round(calcPMT(balance, monthlyRate, remMonths));

            if (enable125Rule) {
              const cap = Math.round(prev5YearPayment * 1.25);
              if (unconstrained > cap) {
                currentPayment = cap;
                rule125TriggeredThisMonth = true;
                is125EverTriggered = true;
              } else {
                currentPayment = unconstrained;
              }
            } else {
              currentPayment = unconstrained;
            }
            prev5YearPayment = currentPayment;
          }
          // 在5年周期内月供保持固定不变
        } else {
          // 无5年规则（如索尼银行模式）：每当利率变化时即时重算月供
          const prevRate = getRateForMonth(m - 1, termYears);
          if (rate !== prevRate || m === 1) {
            currentPayment = Math.round(calcPMT(balance, monthlyRate, remMonths));
          }
        }
      } else {
        // 元金均等返済 (5年/125%规则不适用)
        const principalMonthly = Math.round(principal / totalMonths);
        const interestMonthly = Math.round(balance * monthlyRate);
        currentPayment = principalMonthly + interestMonthly;
      }

      if (currentPayment > maxPayment) {
        maxPayment = currentPayment;
        maxPaymentYear = year;
      }

      // 2. 本金与利息分配及未付利息核算
      const interestDue = Math.round(balance * monthlyRate);
      let principalPaid = 0;
      let interestPaid = 0;
      let unpaidInterestAdded = 0;

      if (repayMethod === 'equal_payment') {
        if (currentPayment >= interestDue) {
          let surplus = currentPayment - interestDue;

          // 结余部分先冲抵历史累积的未付利息
          let paidFromUnpaid = 0;
          if (accumulatedUnpaidInterest > 0) {
            paidFromUnpaid = Math.min(accumulatedUnpaidInterest, surplus);
            accumulatedUnpaidInterest -= paidFromUnpaid;
            surplus -= paidFromUnpaid;
          }

          interestPaid = interestDue + paidFromUnpaid;
          principalPaid = Math.min(balance, surplus);
          balance = Math.max(0, balance - principalPaid);
        } else {
          // ⚠️ 月供不足以支付当月利息 -> 产生未付利息 (未払利息)
          isUnpaidEverTriggered = true;
          unpaidInterestAdded = interestDue - currentPayment;
          accumulatedUnpaidInterest += unpaidInterestAdded;
          interestPaid = currentPayment;
          principalPaid = 0; // 本金停止减少
        }
      } else {
        principalPaid = Math.min(balance, Math.round(principal / totalMonths));
        balance = Math.max(0, balance - principalPaid);
        interestPaid = interestDue;
      }

      monthlyRecords.push({
        month: m,
        year: year,
        monthInYear: ((m - 1) % 12) + 1,
        rate: rate,
        payment: currentPayment,
        principalPaid: principalPaid,
        interestPaid: interestPaid,
        balance: balance,
        unpaidInterest: accumulatedUnpaidInterest,
        unpaidAdded: unpaidInterestAdded,
        rule125Triggered: rule125TriggeredThisMonth,
        isPeriodStart: (m - 1) % 60 === 0
      });
    }

    // 3. 构建年度聚合数据
    const yearlyRecords = [];
    let cumulativePayment = 0;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;

    for (let y = 1; y <= termYears; y++) {
      const yearMonths = monthlyRecords.filter(r => r.year === y);
      const yearPayment = yearMonths.reduce((sum, r) => sum + r.payment, 0);
      const yearInterest = yearMonths.reduce((sum, r) => sum + r.interestPaid, 0);
      const yearPrincipal = yearMonths.reduce((sum, r) => sum + r.principalPaid, 0);
      const lastMonth = yearMonths[yearMonths.length - 1];

      cumulativePayment += yearPayment;
      cumulativeInterest += yearInterest;
      cumulativePrincipal += yearPrincipal;

      const has125Rule = yearMonths.some(r => r.rule125Triggered);
      const hasUnpaid = yearMonths.some(r => r.unpaidAdded > 0 || r.unpaidInterest > 0);
      const rates = yearMonths.map(r => r.rate);
      const rateMin = Math.min(...rates);
      const rateMax = Math.max(...rates);

      yearlyRecords.push({
        year: y,
        rateDisplay: rateMin === rateMax ? formatRate(rateMin) : `${formatRate(rateMin)}~${formatRate(rateMax)}`,
        monthlyPayment: yearMonths[0].payment,
        yearPayment: yearPayment,
        yearPrincipal: yearPrincipal,
        yearInterest: yearInterest,
        endBalance: lastMonth.balance,
        endUnpaidInterest: lastMonth.unpaidInterest,
        has125Rule: has125Rule,
        hasUnpaid: hasUnpaid,
        isPeriodStart: (y - 1) % 5 === 0,
        months: yearMonths
      });
    }

    const finalBalance = monthlyRecords[monthlyRecords.length - 1].balance;
    const finalUnpaidInterest = monthlyRecords[monthlyRecords.length - 1].unpaidInterest;
    const balloonPayment = finalBalance + finalUnpaidInterest;

    return {
      monthlyRecords,
      yearlyRecords,
      initialPayment: monthlyRecords[0].payment,
      maxPayment,
      maxPaymentYear,
      totalPaymentRegular: cumulativePayment,
      totalInterestRegular: cumulativeInterest,
      totalPrincipalRegular: cumulativePrincipal,
      finalBalance,
      finalUnpaidInterest,
      balloonPayment,
      grandTotalPayment: cumulativePayment + balloonPayment,
      grandTotalInterest: cumulativeInterest + finalUnpaidInterest,
      is125EverTriggered,
      isUnpaidEverTriggered,
      hasBalloonRisk: balloonPayment > 100
    };
  }

  // --- 界面更新主函数 ---
  function updateUI() {
    const sim = runSimulation();
    const comp = runSimulation({
      enable5YearRule: false,
      enable125Rule: false
    });

    renderKPIs(sim);
    renderBanners(sim);
    renderComparison(sim, comp);
    renderCharts(sim);
    renderTable(sim);
  }

  function renderKPIs(res) {
    document.getElementById('kpi-initial-payment').textContent = formatYen(res.initialPayment);
    document.getElementById('kpi-initial-hint').textContent = `第1~5年月供 (${formatRate(state.initialRate)})`;

    document.getElementById('kpi-max-payment').textContent = formatYen(res.maxPayment);
    document.getElementById('kpi-max-hint').textContent = `在第 ${res.maxPaymentYear} 年达到峰值`;

    document.getElementById('kpi-total-payment').textContent = formatYen(res.grandTotalPayment);
    document.getElementById('kpi-total-hint').textContent = `本金 ${formatManYen(state.principalMan * 10000)} + 利息`;

    const statusEl = document.getElementById('kpi-balloon-status');
    const balloonCard = document.getElementById('kpi-card-balloon');
    if (res.hasBalloonRisk) {
      statusEl.textContent = formatYen(res.balloonPayment);
      statusEl.className = 'kpi-num text-danger';
      document.getElementById('kpi-balloon-hint').textContent = `⚠️ 期末一笔还清 (本金: ${formatYen(res.finalBalance)})`;
      balloonCard.classList.add('highlight-danger');
      balloonCard.classList.remove('highlight-primary');
    } else {
      statusEl.textContent = '¥0 (顺利结清)';
      statusEl.className = 'kpi-num text-success';
      document.getElementById('kpi-balloon-hint').textContent = `✅ 第${state.termYears}年贷款如期还清`;
      balloonCard.classList.remove('highlight-danger');
      balloonCard.classList.add('highlight-primary');
    }
  }

  function renderBanners(res) {
    const bannerEl = document.getElementById('alert-banner');
    if (!bannerEl) return;

    if (res.hasBalloonRisk) {
      bannerEl.className = 'banner danger';
      bannerEl.style.display = 'flex';
      bannerEl.innerHTML = `
        <div class="banner-icon">⚠️</div>
        <div class="banner-text">
          <h4>高风险预警：${state.termYears}年贷款到期需一次性补交 ${formatYen(res.balloonPayment)} (一括返済)</h4>
          <p>受 <strong>125%上限封顶</strong> 影响，月供未能如期冲抵本金。截至第 ${state.termYears} 年末，仍有剩余本金 <strong>${formatYen(res.finalBalance)}</strong>${res.finalUnpaidInterest > 0 ? ` 与未付利息 <strong>${formatYen(res.finalUnpaidInterest)}</strong>` : ''}。银行将在期末要求一次性全额还清，建议提前储备还款资金！</p>
        </div>
      `;
    } else if (res.isUnpaidEverTriggered) {
      bannerEl.className = 'banner warning';
      bannerEl.style.display = 'flex';
      bannerEl.innerHTML = `
        <div class="banner-icon">⚡</div>
        <div class="banner-text">
          <h4>提示：模拟周期内曾发生“未付利息 (未払利息)”</h4>
          <p>在加息高峰月份，月供甚至不足以支付当月利息，导致本金一度停止扣减。虽然后续周期已追回并在第 ${state.termYears} 年末顺利结清，但累积总利息支出显著提高。</p>
        </div>
      `;
    } else if (res.is125EverTriggered) {
      bannerEl.className = 'banner warning';
      bannerEl.style.display = 'flex';
      bannerEl.innerHTML = `
        <div class="banner-icon">🛡️</div>
        <div class="banner-text">
          <h4>保护机制生效：125%规则成功封顶月供涨幅</h4>
          <p>在调价节点，理论所需月供已超出上期的 1.25 倍。125%规则起到了安全阀作用，平滑了家庭每月开支，并在第 ${state.termYears} 年如期完成贷款偿还。</p>
        </div>
      `;
    } else {
      bannerEl.style.display = 'none';
    }
  }

  function renderComparison(sim, comp) {
    const compBox = document.getElementById('comparison-box');
    if (!compBox) return;

    const diff = sim.grandTotalInterest - comp.grandTotalInterest;
    const diffTxt = diff > 0 ? `多支付 ${formatYen(diff)}` : (diff < 0 ? `少支付 ${formatYen(Math.abs(diff))}` : '持平');

    compBox.innerHTML = `
      <div class="compare-head">
        <h4>📊 机制对照分析：有 5年/125% 规则 (大行) vs 无规则即时调整 (索尼/PayPay)</h4>
        <span class="label-hint">期限：${state.termYears}年 (共${state.termYears * 12}期)</span>
      </div>
      <div class="compare-grid">
        <div class="compare-card ${state.enable5YearRule ? 'highlight' : ''}">
          <div class="compare-title">
            <span>🛡️ 当前模式 (5年 & 125%规则${state.enable5YearRule ? '开启' : '关闭'})</span>
            <span class="badge ${sim.hasBalloonRisk ? 'badge-red' : 'badge-green'}">${sim.hasBalloonRisk ? '期末需补款' : '平稳过渡'}</span>
          </div>
          <div class="compare-row"><span class="lbl">最高月供支出:</span><span class="val">${formatYen(sim.maxPayment)}</span></div>
          <div class="compare-row"><span class="lbl">总利息支出:</span><span class="val">${formatYen(sim.grandTotalInterest)}</span></div>
          <div class="compare-row"><span class="lbl">期末补款 (一括返済):</span><span class="val ${sim.balloonPayment > 0 ? 'text-danger' : ''}">${formatYen(sim.balloonPayment)}</span></div>
          <div class="compare-row"><span class="lbl">还款月供稳定性:</span><span class="val text-success">★★★★★ (5年内固定)</span></div>
        </div>

        <div class="compare-card ${!state.enable5YearRule ? 'highlight' : ''}">
          <div class="compare-title">
            <span>⚡ 即时变动模式 (如索尼银行)</span>
            <span class="badge badge-blue">保证${state.termYears}年还清</span>
          </div>
          <div class="compare-row"><span class="lbl">最高月供支出:</span><span class="val">${formatYen(comp.maxPayment)}</span></div>
          <div class="compare-row"><span class="lbl">总利息支出:</span><span class="val">${formatYen(comp.grandTotalInterest)} (${diffTxt})</span></div>
          <div class="compare-row"><span class="lbl">期末补款 (一括返済):</span><span class="val text-success">¥0 (精准结清)</span></div>
          <div class="compare-row"><span class="lbl">还款月供稳定性:</span><span class="val text-warning">★★★☆☆ (加息立即涨月供)</span></div>
        </div>
      </div>
    `;
  }

  function renderCharts(res) {
    if (typeof Chart === 'undefined') return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const labels = res.yearlyRecords.map(r => `第${r.year}年`);

    // 图表 1: 月还款与本息构成
    const ctxPayment = document.getElementById('paymentChart')?.getContext('2d');
    if (ctxPayment) {
      if (paymentChart) paymentChart.destroy();

      paymentChart = new Chart(ctxPayment, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              type: 'line',
              label: '实还月供 (円/月)',
              data: res.yearlyRecords.map(r => r.monthlyPayment),
              borderColor: '#2563eb',
              backgroundColor: '#2563eb',
              borderWidth: 3,
              pointRadius: 2,
              tension: 0.1,
              yAxisID: 'y'
            },
            {
              type: 'bar',
              label: '全年偿还本金 (万円)',
              data: res.yearlyRecords.map(r => Math.round(r.yearPrincipal / 10000)),
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
              stack: 'stack1',
              yAxisID: 'y1'
            },
            {
              type: 'bar',
              label: '全年支付利息 (万円)',
              data: res.yearlyRecords.map(r => Math.round(r.yearInterest / 10000)),
              backgroundColor: 'rgba(239, 68, 68, 0.75)',
              stack: 'stack1',
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { labels: { color: textColor, font: { size: 12 } } },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  if (ctx.dataset.type === 'line') return `月供金额: ¥${Math.round(ctx.raw).toLocaleString('ja-JP')} /月`;
                  return `${ctx.dataset.label}: ${ctx.raw} 万円`;
                }
              }
            }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 14 } },
            y: {
              type: 'linear',
              position: 'left',
              grid: { color: gridColor },
              ticks: { color: textColor, callback: (v) => '¥' + (v / 1000).toFixed(0) + 'k' },
              title: { display: true, text: '每月还款额 (円)', color: textColor }
            },
            y1: {
              type: 'linear',
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { color: textColor, callback: (v) => v + '万' },
              title: { display: true, text: '全年总额 (万円)', color: textColor }
            }
          }
        }
      });
    }

    // 图表 2: 贷款余额与未付利息
    const ctxBalance = document.getElementById('balanceChart')?.getContext('2d');
    if (ctxBalance) {
      if (balanceChart) balanceChart.destroy();

      balanceChart = new Chart(ctxBalance, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: '贷款本金余额 (万円)',
              data: res.yearlyRecords.map(r => Math.round(r.endBalance / 10000)),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              borderWidth: 2.5,
              fill: true,
              pointRadius: 2,
              tension: 0.2
            },
            {
              type: 'bar',
              label: '未付利息累积 (万円)',
              data: res.yearlyRecords.map(r => Math.round(r.endUnpaidInterest / 10000)),
              backgroundColor: 'rgba(239, 68, 68, 0.85)',
              borderWidth: 0,
              barThickness: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { labels: { color: textColor, font: { size: 12 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} 万円 (${formatYen(ctx.raw * 10000)})`
              }
            }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 14 } },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor, callback: (v) => v + '万' },
              title: { display: true, text: '金额 (万円)', color: textColor }
            }
          }
        }
      });
    }
  }

  function renderTable(res) {
    const tbody = document.getElementById('schedule-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    res.yearlyRecords.forEach(yRec => {
      const tr = document.createElement('tr');
      if (yRec.isPeriodStart) tr.classList.add('period-start');
      if (yRec.has125Rule) tr.classList.add('rule-125');
      if (yRec.hasUnpaid) tr.classList.add('unpaid-row');

      const startCal = getCalendarDate((yRec.year - 1) * 12 + 1);
      const endCal = getCalendarDate(yRec.year * 12);

      let badgeHtml = '';
      if (yRec.has125Rule) badgeHtml += `<span class="pill pill-cap" title="触发125%上限封顶">⚡ 125%封顶</span> `;
      if (yRec.hasUnpaid) badgeHtml += `<span class="pill pill-unpaid" title="产生未付利息">⚠️ 未付利息</span> `;
      if (yRec.isPeriodStart && yRec.year > 1) badgeHtml += `<span class="pill pill-cycle">🔄 5年调价</span>`;

      tr.innerHTML = `
        <td style="font-weight: 600;">
          第 ${yRec.year} 年
          <span style="font-size: 11px; color: var(--text-muted); font-weight: normal; margin-left: 2px;">(${startCal.shortLabel}~${endCal.shortLabel})</span>
          ${badgeHtml}
        </td>
        <td>${yRec.rateDisplay}</td>
        <td style="font-weight: 700;">${formatYen(yRec.monthlyPayment)}</td>
        <td>${formatYen(yRec.yearPayment)}</td>
        <td style="color: #10b981;">${formatYen(yRec.yearPrincipal)}</td>
        <td style="color: #ef4444;">${formatYen(yRec.yearInterest)}</td>
        <td style="font-weight: 600;">${formatYen(yRec.endBalance)}</td>
        <td class="${yRec.endUnpaidInterest > 0 ? 'text-danger' : ''}">${formatYen(yRec.endUnpaidInterest)}</td>
        <td>
          <button type="button" class="btn-toggle-month chip" style="font-size: 11px;" data-year="${yRec.year}">
            详情 ▾
          </button>
        </td>
      `;
      tbody.appendChild(tr);

      // 展开逐月子行
      const subTr = document.createElement('tr');
      subTr.id = `month-subrow-${yRec.year}`;
      subTr.className = 'sub-row';
      subTr.style.display = 'none';

      let monthlyRowsHtml = '';
      yRec.months.forEach(m => {
        const mCal = getCalendarDate(m.month);
        monthlyRowsHtml += `
          <tr>
            <td><strong>第 ${m.month} 期</strong> <span style="color: var(--text-secondary); margin-left: 4px;">(${mCal.label})</span></td>
            <td><strong>${formatRate(m.rate)}</strong></td>
            <td style="font-weight: 600;">${formatYen(m.payment)}</td>
            <td style="color: #10b981;">${formatYen(m.principalPaid)}</td>
            <td style="color: #ef4444;">${formatYen(m.interestPaid)}</td>
            <td>${formatYen(m.balance)}</td>
            <td class="${m.unpaidInterest > 0 ? 'text-danger' : ''}">${formatYen(m.unpaidInterest)}</td>
            <td>${m.rule125Triggered ? '<span class="pill pill-cap">125%触发</span>' : (m.unpaidAdded > 0 ? '<span class="pill pill-unpaid">未付利息+' + formatYen(m.unpaidAdded) + '</span>' : '-')}</td>
          </tr>
        `;
      });

      subTr.innerHTML = `
        <td colspan="9">
          <div style="padding: 10px 14px;">
            <strong style="font-size: 12px; color: var(--text-secondary);">第 ${yRec.year} 年逐月还款明细 (${startCal.label} ~ ${endCal.label})：</strong>
            <table class="month-table">
              <thead>
                <tr>
                  <th style="text-align: left;">还款期数与日历月</th>
                  <th>适用年利率</th>
                  <th>当月还款额</th>
                  <th>偿还本金</th>
                  <th>支付利息</th>
                  <th>月末本金余额</th>
                  <th>未付利息挂账</th>
                  <th>状态说明</th>
                </tr>
              </thead>
              <tbody>${monthlyRowsHtml}</tbody>
            </table>
          </div>
        </td>
      `;
      tbody.appendChild(subTr);
    });

    tbody.querySelectorAll('.btn-toggle-month').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const yr = e.currentTarget.getAttribute('data-year');
        const targetRow = document.getElementById(`month-subrow-${yr}`);
        if (!targetRow) return;
        const isHidden = targetRow.style.display === 'none';
        targetRow.style.display = isHidden ? 'table-row' : 'none';
        e.currentTarget.textContent = isHidden ? '收起 ▴' : '详情 ▾';
      });
    });
  }

  function exportCSV() {
    const res = runSimulation();
    const rows = [
      ['还款期数', '日历年月', '贷款年份', '年内月序', '适用年利率(%)', '当期还款额(円)', '偿还本金(円)', '支付利息(円)', '月末本金余额(円)', '未付利息挂账(円)', '状态说明']
    ];

    res.monthlyRecords.forEach(m => {
      const mCal = getCalendarDate(m.month);
      let mark = '';
      if (m.rule125Triggered) mark += '触发125%上限; ';
      if (m.unpaidAdded > 0) mark += `产生未付利息${m.unpaidAdded}円; `;
      if (m.isPeriodStart) mark += '5年重评节点; ';

      rows.push([
        m.month,
        mCal.label,
        m.year,
        m.monthInYear,
        m.rate.toFixed(3),
        m.payment,
        m.principalPaid,
        m.interestPaid,
        m.balance,
        m.unpaidInterest,
        mark
      ]);
    });

    if (res.hasBalloonRisk) {
      const endCal = getCalendarDate(state.termYears * 12);
      rows.push(['期末一次性结清', endCal.label, state.termYears, 12, '-', res.balloonPayment, res.finalBalance, res.finalUnpaidInterest, 0, 0, '期末一括返済补齐剩余本息']);
    }

    const csvContent = '\uFEFF' + rows.map(e => e.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `日本房贷还款计划_${state.termYears}年_${state.principalMan}万.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- 自定义加息时间轴节点渲染（支持年+月精确配置） ---
  function renderCustomMilestones() {
    const container = document.getElementById('custom-milestone-list');
    if (!container) return;
    container.innerHTML = '';

    // 按绝对月份排序
    state.customMilestones.sort((a, b) => {
      const ma = ((a.year - 1) * 12) + (a.month || 1);
      const mb = ((b.year - 1) * 12) + (b.month || 1);
      return ma - mb;
    }).forEach((m, idx) => {
      const currentMo = m.month || 1;
      const absMonth = ((m.year - 1) * 12) + currentMo;
      const cal = getCalendarDate(absMonth);

      const row = document.createElement('div');
      row.className = 'custom-step-row';
      row.innerHTML = `
        <select class="select-year step-year-select" data-idx="${idx}">
          ${Array.from({ length: state.termYears }, (_, i) => i + 1).map(y => `
            <option value="${y}" ${y === m.year ? 'selected' : ''}>第 ${y} 年</option>
          `).join('')}
        </select>
        <select class="select-month step-month-select" data-idx="${idx}">
          ${Array.from({ length: 12 }, (_, i) => i + 1).map(mo => `
            <option value="${mo}" ${mo === currentMo ? 'selected' : ''}>第 ${mo} 月</option>
          `).join('')}
        </select>
        <span class="step-date-tag" title="对应还款期数与日历年月">第${absMonth}期 · ${cal.label}</span>
        <div class="rate-wrap">
          <input type="number" step="0.001" min="0" max="15" value="${m.rate}" class="form-input step-rate-input" data-idx="${idx}" />
          <span class="input-addon">%</span>
        </div>
        <button type="button" class="btn-icon-del" data-idx="${idx}" title="删除此节点">✕</button>
      `;
      container.appendChild(row);
    });

    container.querySelectorAll('.step-year-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        state.customMilestones[idx].year = parseInt(e.target.value);
        renderCustomMilestones();
        updateUI();
      });
    });

    container.querySelectorAll('.step-month-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        state.customMilestones[idx].month = parseInt(e.target.value);
        renderCustomMilestones();
        updateUI();
      });
    });

    container.querySelectorAll('.step-rate-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0) {
          state.customMilestones[idx].rate = val;
          updateUI();
        }
      });
    });

    container.querySelectorAll('.btn-icon-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        state.customMilestones.splice(idx, 1);
        renderCustomMilestones();
        updateUI();
      });
    });
  }

  // --- 动态渲染筹码按钮 (根据 config.js) ---
  function renderDynamicChips() {
    // 渲染本金筹码
    const principalChipsContainer = document.getElementById('chips-principal-container');
    if (principalChipsContainer) {
      const list = chipsCfg.principalList || [2000, 2500, 3000, 3190, 3500, 4000, 5000];
      principalChipsContainer.innerHTML = list.map(val => `
        <button type="button" class="chip chip-principal ${val === state.principalMan ? 'active' : ''}" data-val="${val}">
          ${val.toLocaleString()}万${val === loanCfg.principalMan ? ' (我的)' : ''}
        </button>
      `).join('');

      principalChipsContainer.querySelectorAll('.chip-principal').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const val = parseInt(e.target.getAttribute('data-val'));
          if (val) {
            state.principalMan = val;
            const inputPrincipal = document.getElementById('input-principal');
            const displayYen = document.getElementById('display-principal-yen');
            if (inputPrincipal) inputPrincipal.value = val;
            if (displayYen) displayYen.textContent = formatYen(val * 10000);
            updateChipsState();
            updateUI();
          }
        });
      });
    }

    // 渲染年限筹码
    const termChipsContainer = document.getElementById('chips-term-container');
    if (termChipsContainer) {
      const list = chipsCfg.termList || [20, 25, 30, 35, 40, 45, 50];
      termChipsContainer.innerHTML = list.map(val => `
        <button type="button" class="chip chip-term ${val === state.termYears ? 'active' : ''}" data-val="${val}">
          ${val}年${val === loanCfg.termYears ? ' (我的)' : ''}
        </button>
      `).join('');

      termChipsContainer.querySelectorAll('.chip-term').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const val = parseInt(e.target.getAttribute('data-val'));
          if (val) {
            state.termYears = val;
            const inputTerm = document.getElementById('input-term');
            if (inputTerm) inputTerm.value = val;
            updateTermChipsState();
            renderCustomMilestones();
            updateUI();
          }
        });
      });
    }
  }

  function updateChipsState() {
    document.querySelectorAll('.chip-principal').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-val')) === state.principalMan);
    });
  }

  function updateTermChipsState() {
    document.querySelectorAll('.chip-term').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-val')) === state.termYears);
    });
  }

  function init() {
    initTheme();

    // 绑定主题切换按钮
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleTheme();
        updateUI();
      });
    });

    // 1. 本金输入
    const inputPrincipal = document.getElementById('input-principal');
    const displayYen = document.getElementById('display-principal-yen');
    if (inputPrincipal) {
      inputPrincipal.value = state.principalMan;
      if (displayYen) displayYen.textContent = formatYen(state.principalMan * 10000);

      inputPrincipal.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val > 0) {
          state.principalMan = val;
          if (displayYen) displayYen.textContent = formatYen(val * 10000);
          updateChipsState();
          updateUI();
        }
      });
    }

    // 2. 贷款期限设置
    const inputTerm = document.getElementById('input-term');
    if (inputTerm) {
      inputTerm.value = state.termYears;
      inputTerm.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 1 && val <= 50) {
          state.termYears = val;
          updateTermChipsState();
          renderCustomMilestones();
          updateUI();
        }
      });
    }

    // 渲染动态筹码
    renderDynamicChips();

    // 3. 起始利率
    const inputRate = document.getElementById('input-rate');
    if (inputRate) {
      inputRate.value = state.initialRate.toString();
      inputRate.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0) {
          state.initialRate = val;
          updateUI();
        }
      });
    }

    // 4. 起贷放款年月
    const inputStartYear = document.getElementById('input-start-year');
    if (inputStartYear) {
      inputStartYear.value = state.startYear;
      inputStartYear.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 1990 && val <= 2100) {
          state.startYear = val;
          renderCustomMilestones();
          updateUI();
        }
      });
    }

    const inputStartMonth = document.getElementById('input-start-month');
    if (inputStartMonth) {
      inputStartMonth.value = state.startMonth;
      inputStartMonth.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 1 && val <= 12) {
          state.startMonth = val;
          renderCustomMilestones();
          updateUI();
        }
      });
    }

    // 5. 还款方式
    document.querySelectorAll('.segment-repay-method .segment-btn').forEach(item => {
      const itemVal = item.getAttribute('data-val');
      if (itemVal === state.repayMethod) {
        document.querySelectorAll('.segment-repay-method .segment-btn').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      }

      item.addEventListener('click', (e) => {
        document.querySelectorAll('.segment-repay-method .segment-btn').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        state.repayMethod = item.getAttribute('data-val');

        const notice = document.getElementById('rule-disabled-notice');
        if (notice) notice.style.display = state.repayMethod === 'equal_principal' ? 'block' : 'none';
        updateUI();
      });
    });

    // 6. 规则开关
    const toggle5Year = document.getElementById('toggle-5year-rule');
    if (toggle5Year) {
      toggle5Year.checked = state.enable5YearRule;
      toggle5Year.addEventListener('change', (e) => {
        state.enable5YearRule = e.target.checked;
        const toggle125 = document.getElementById('toggle-125-rule');
        if (toggle125) toggle125.disabled = !state.enable5YearRule;
        updateUI();
      });
    }

    const toggle125 = document.getElementById('toggle-125-rule');
    if (toggle125) {
      toggle125.checked = state.enable125Rule;
      toggle125.addEventListener('change', (e) => {
        state.enable125Rule = e.target.checked;
        updateUI();
      });
    }

    // 7. 场景选择
    document.querySelectorAll('.scenario-item').forEach(card => {
      const scenario = card.getAttribute('data-scenario');
      if (scenario === state.currentScenario) {
        document.querySelectorAll('.scenario-item').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      }

      card.addEventListener('click', (e) => {
        document.querySelectorAll('.scenario-item').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.currentScenario = scenario;

        const customBox = document.getElementById('custom-schedule-box');
        if (customBox) customBox.style.display = scenario === 'custom' ? 'block' : 'none';
        updateUI();
      });
    });

    // 添加自定义节点按钮（自动推算下一次调息月）
    const btnAddStep = document.getElementById('btn-add-step');
    if (btnAddStep) {
      btnAddStep.addEventListener('click', () => {
        let nextYr = 1;
        let nextMo = 7;
        let lastRate = state.initialRate;
        if (state.customMilestones.length > 0) {
          const last = state.customMilestones[state.customMilestones.length - 1];
          lastRate = last.rate;
          const lastAbs = ((last.year - 1) * 12) + (last.month || 1);
          const nextAbs = Math.min(state.termYears * 12, lastAbs + 6);
          nextYr = Math.ceil(nextAbs / 12);
          nextMo = ((nextAbs - 1) % 12) + 1;
        }
        state.customMilestones.push({ year: nextYr, month: nextMo, rate: +(lastRate + 0.15).toFixed(3) });
        renderCustomMilestones();
        updateUI();
      });
    }

    // 8. 图表 Tab 切换
    document.querySelectorAll('.chart-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        state.activeChartTab = tab;

        document.getElementById('chart-wrapper-payment').style.display = tab === 'payment' ? 'block' : 'none';
        document.getElementById('chart-wrapper-balance').style.display = tab === 'balance' ? 'block' : 'none';
      });
    });

    // 9. 表格展开全部
    const btnToggleAll = document.getElementById('btn-toggle-all-months');
    if (btnToggleAll) {
      btnToggleAll.addEventListener('click', () => {
        state.isTableExpanded = !state.isTableExpanded;
        btnToggleAll.textContent = state.isTableExpanded ? '收起全部明细' : '展开全部月份';

        document.querySelectorAll('.sub-row').forEach(row => {
          row.style.display = state.isTableExpanded ? 'table-row' : 'none';
        });
        document.querySelectorAll('.btn-toggle-month').forEach(btn => {
          btn.textContent = state.isTableExpanded ? '收起 ▴' : '详情 ▾';
        });
      });
    }

    // 10. CSV 导出
    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', exportCSV);
    }

    // 初始化渲染
    renderCustomMilestones();
    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', () => {
    if (!paymentChart && typeof Chart !== 'undefined') {
      updateUI();
    }
  });
})();
