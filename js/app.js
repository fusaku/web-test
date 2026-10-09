/**
 * ==============================================================================
 * 日本住宅ローン計算器 (Japan Mortgage Simulator)
 * 核心驱动逻辑 - js/app.js
 * ==============================================================================
 *
 * 📖 架构分层 (Architecture Layers):
 * 1. CONFIG & STATE       - 配置读取与响应式状态中心
 * 2. FORMATTERS           - 纯函数货币与日历工具 (无副作用)
 * 3. FINANCIAL CALCULATOR - 核心金融精算引擎 (PMT、5年规则、125%上限、未付利息滚存)
 * 4. DOM RENDERERS        - 视图渲染层 (KPI、风险横幅、机制对比、Chart.js、480期还款表)
 * 5. CONTROLLER & EVENTS  - 交互控制器与事件监听 (筹码联动、自定义调息节点、参数同步)
 * 6. INIT BOOTSTRAP       - 启动入口 (URL参数解析、语言监听、生命周期挂载)
 * ==============================================================================
 */

(function (window) {
  'use strict';

  /* ============================================================================ */
  /* 1. CONFIG & APPLICATION STATE (配置与响应式状态)                             */
  /* ============================================================================ */

  // 1.1 读取用户配置文件 (config.js)
  const cfg = window.MORTGAGE_CONFIG || {};
  const loanCfg = cfg.defaultLoan || {};
  const chipsCfg = cfg.quickChips || {};
  const sceneCfg = cfg.scenarios || {};

  // 1.2 主题管理键名 (与税金计算器实现双向无缝同步)
  const THEME_STORAGE_KEY = 'japan_mortgage_theme';
  const THEME_ALT_KEY = 'japan_tax_theme';

  // 1.3 核心状态中心 (响应式单一事实源)
  const state = {
    // 贷款本金（单位：万円）
    principalMan: loanCfg.principalMan ?? 3190,
    // 贷款年限（默认40年，支持1~50年任意输入）
    termYears: loanCfg.termYears ?? 40,
    // 初始借款年利率（%）
    initialRate: loanCfg.initialRate ?? 1.195,
    // 放款起贷日历年份与月份（精准推算实际月份）
    startYear: loanCfg.startYear ?? 2026,
    startMonth: loanCfg.startMonth ?? 11,
    // 还款方式：equal_payment(元利均等/等额本息) 或 equal_principal(元金均等/等额本金)
    repayMethod: loanCfg.repayMethod ?? 'equal_payment',
    // 核心保护机制开关
    enable5YearRule: loanCfg.enable5YearRule ?? true,
    enable125Rule: loanCfg.enable125Rule ?? true,
    // 加息情景：'mild' | 'flat' | 'steep' | 'extreme' | 'custom'
    currentScenario: sceneCfg.defaultScenario ?? 'mild',
    // 自定义加息时间轴节点（支持按第几年第几月精确设置）
    customMilestones: sceneCfg.customMilestones
      ? JSON.parse(JSON.stringify(sceneCfg.customMilestones))
      : [
          { year: 1, month: 3, rate: 1.345 },
          { year: 1, month: 9, rate: 1.495 },
          { year: 2, month: 3, rate: 1.645 },
          { year: 6, month: 1, rate: 1.950 }
        ],
    // 界面激活选项卡与表格展开状态
    activeChartTab: 'payment',
    isTableExpanded: false
  };

  // 全局 Chart.js 图表引用
  let paymentChart = null;
  let balanceChart = null;

  /* ============================================================================ */
  /* 2. FORMATTERS & DATE HELPERS (格式化与日历工具)                              */
  /* ============================================================================ */

  /**
   * 格式化日元数值为标准带千分位货币字符串 (例如: ¥118,520)
   * @param {number} val
   * @returns {string}
   */
  const formatYen = (val) => '¥' + Math.round(val || 0).toLocaleString('ja-JP');

  /**
   * 格式化日元为万円表述 (例如: 3,190 万円)
   * @param {number} yen
   * @returns {string}
   */
  const formatManYen = (yen) => `${Math.round((yen || 0) / 10000).toLocaleString('ja-JP')} 万円`;

  /**
   * 格式化百分比利率 (例如: 1.195%)
   * @param {number} rate
   * @returns {string}
   */
  const formatRate = (rate) => (Math.round((rate || 0) * 1000) / 1000).toString() + '%';

  /**
   * 多语言文本快捷获取函数
   * @param {string} key
   * @returns {string}
   */
  const t = (key) => {
    if (window.MortgageI18n && typeof window.MortgageI18n.t === 'function') {
      return window.MortgageI18n.t(key);
    }
    return key;
  };

  /**
   * 获取当前语言代码 ('zh' | 'ja')
   * @returns {string}
   */
  const getLang = () => (window.MortgageI18n ? window.MortgageI18n.getLang() : 'zh');

  /**
   * 根据还款期数 (第几月) 精确推算对应的日历年月
   * @param {number} monthIndex - 从 1 开始的期数
   * @returns {{ year: number, month: number, label: string, shortLabel: string }}
   */
  function getCalendarDate(monthIndex) {
    const totalMonths = (state.startYear * 12 + (state.startMonth - 1)) + (monthIndex - 1);
    const calYear = Math.floor(totalMonths / 12);
    const calMonth = (totalMonths % 12) + 1;
    const moStr = calMonth < 10 ? '0' + calMonth : calMonth.toString();
    return {
      year: calYear,
      month: calMonth,
      label: `${calYear}年${calMonth}月`,
      shortLabel: `${calYear}.${moStr}`
    };
  }

  /* ============================================================================ */
  /* 3. FINANCIAL CALCULATION ENGINE (房贷金融精算核心算法)                        */
  /* ============================================================================ */

  /**
   * 标准年金还款公式 (PMT): 计算等额本息理论月还款额
   * 公式: PMT = P * [ r * (1 + r)^n ] / [ (1 + r)^n - 1 ]
   * @param {number} principal - 剩余本金 (円)
   * @param {number} monthlyRate - 月利率 (小数，年利率 / 12)
   * @param {number} remainingMonths - 剩余还款期数 (月)
   * @returns {number} 理论月还款额 (円)
   */
  function calcPMT(principal, monthlyRate, remainingMonths) {
    if (principal <= 0 || remainingMonths <= 0) return 0;
    if (monthlyRate === 0) return principal / remainingMonths;
    const factor = Math.pow(1 + monthlyRate, remainingMonths);
    return principal * (monthlyRate * factor) / (factor - 1);
  }

  /**
   * 获取指定期数 (月份) 在当前情景下的适用年利率 (%)
   * 支持五大场景：平稳基准、温和递增、阶梯加速、剧烈暴涨以及自定义时间轴
   * @param {number} month - 第几期 (1..480)
   * @param {number} totalYears - 贷款总年限
   * @returns {number} 年利率百分比 (如 1.195)
   */
  function getRateForMonth(month, totalYears) {
    const year = Math.ceil(month / 12);
    const base = state.initialRate;

    switch (state.currentScenario) {
      case 'flat':
        // 场景 1: 全程平稳维持初始利率
        return base;

      case 'mild': {
        // 场景 2: 主流温和预测，每5年递增 0.25%
        const step = sceneCfg.mildIncreaseStepPer5Years ?? 0.25;
        const periodIdx = Math.floor((month - 1) / 60);
        return +(base + periodIdx * step).toFixed(3);
      }

      case 'steep':
        // 场景 3: 阶梯较快加息 (第6年起提速)
        if (year <= 5) return base;
        if (year <= 10) return +(base + 0.60).toFixed(3);
        if (year <= 15) return +(base + 1.20).toFixed(3);
        if (year <= 20) return +(base + 1.70).toFixed(3);
        if (year <= 25) return +(base + 2.20).toFixed(3);
        return +(base + 2.60).toFixed(3);

      case 'extreme':
        // 场景 4: 极端压力测试 (第6年飙至3.0%，第11年飙至4.5%)
        if (year <= 5) return base;
        if (year <= 10) return 3.00;
        return 4.50;

      case 'custom': {
        // 场景 5: 自定义时间轴节点 (精确匹配年+月)
        let matchedRate = base;
        const sorted = [...state.customMilestones].sort((a, b) => {
          const ma = ((a.year - 1) * 12) + (a.month || 1);
          const mb = ((b.year - 1) * 12) + (b.month || 1);
          return ma - mb;
        });
        for (const item of sorted) {
          const itemMonth = ((item.year - 1) * 12) + (item.month || 1);
          if (month >= itemMonth) {
            matchedRate = item.rate;
          }
        }
        return matchedRate;
      }

      default:
        return base;
    }
  }

  /**
   * 核心还款推演主引擎
   * 严谨模拟日本三大行与住信SBI等金融机构的业务逻辑：
   * 1. 5年规则 (5年ルール)：利率调整时月扣款额在5年周期内固定不变
   * 2. 125%上限规则 (125%ルール)：每5年重算时，新月供上限为上期月供的 1.25 倍
   * 3. 未付利息 (未払利息)：当月供不足以支付利息时挂账滚存，结余优先冲抵，期末一次性结清 (一括返済)
   *
   * @param {Object} [options] - 覆盖参数 (用于对照组测算)
   * @returns {Object} 完整推演结果数据集
   */
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

    // --- 逐月期数推演循环 (1 到 480 期) ---
    for (let m = 1; m <= totalMonths; m++) {
      const year = Math.ceil(m / 12);
      const remainingMonths = totalMonths - m + 1;
      const rate = getRateForMonth(m, termYears);
      const monthlyRate = (rate / 100) / 12;

      let rule125TriggeredThisMonth = false;

      // 步骤 1: 确定本月应付月供额 (Current Payment)
      if (repayMethod === 'equal_payment') {
        if (m === 1) {
          // 首期月供计算
          currentPayment = Math.round(calcPMT(balance, monthlyRate, remainingMonths));
          prev5YearPayment = currentPayment;
        } else if (enable5YearRule) {
          // 5年规则：仅在第 61、121、181、241... 个月（每5年节点）重算月供
          if ((m - 1) % 60 === 0) {
            const unconstrainedPMT = Math.round(calcPMT(balance, monthlyRate, remainingMonths));

            if (enable125Rule) {
              const maxAllowedCap = Math.round(prev5YearPayment * 1.25);
              if (unconstrainedPMT > maxAllowedCap) {
                currentPayment = maxAllowedCap;
                rule125TriggeredThisMonth = true;
                is125EverTriggered = true;
              } else {
                currentPayment = unconstrainedPMT;
              }
            } else {
              currentPayment = unconstrainedPMT;
            }
            prev5YearPayment = currentPayment;
          }
          // 在5年周期内，月供严格锁定不变
        } else {
          // 无5年规则模式 (如索尼银行模式)：每当利率变动或每月即时重算
          const prevRate = getRateForMonth(m - 1, termYears);
          if (rate !== prevRate || m === 1) {
            currentPayment = Math.round(calcPMT(balance, monthlyRate, remainingMonths));
          }
        }
      } else {
        // 元金均等返済：每月固定偿还本金，利息据实结算
        const fixedPrincipal = Math.round(principal / totalMonths);
        const currentInterest = Math.round(balance * monthlyRate);
        currentPayment = fixedPrincipal + currentInterest;
      }

      // 记录峰值月供
      if (currentPayment > maxPayment) {
        maxPayment = currentPayment;
        maxPaymentYear = year;
      }

      // 步骤 2: 本金与利息核算分配 (拆分本息与未付利息处理)
      const interestDue = Math.round(balance * monthlyRate);
      let principalPaid = 0;
      let interestPaid = 0;
      let unpaidInterestAdded = 0;

      if (repayMethod === 'equal_payment') {
        if (currentPayment >= interestDue) {
          let surplus = currentPayment - interestDue;

          // 若有历史累积的未付利息，月供结余优先冲抵未付利息
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
          // ⚠️ 利息倒挂：月供不足以覆盖当月应付利息 -> 产生未付利息 (未払利息)
          isUnpaidEverTriggered = true;
          unpaidInterestAdded = interestDue - currentPayment;
          accumulatedUnpaidInterest += unpaidInterestAdded;
          interestPaid = currentPayment;
          principalPaid = 0; // 本金完全停止减少
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

    // 步骤 3: 按年度构建聚合统计数据 (Yearly Aggregation)
    const yearlyRecords = [];
    let cumulativePayment = 0;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;

    for (let y = 1; y <= termYears; y++) {
      const yearMonths = monthlyRecords.filter((r) => r.year === y);
      const yearPayment = yearMonths.reduce((sum, r) => sum + r.payment, 0);
      const yearInterest = yearMonths.reduce((sum, r) => sum + r.interestPaid, 0);
      const yearPrincipal = yearMonths.reduce((sum, r) => sum + r.principalPaid, 0);
      const lastMonth = yearMonths[yearMonths.length - 1];

      cumulativePayment += yearPayment;
      cumulativeInterest += yearInterest;
      cumulativePrincipal += yearPrincipal;

      const has125Rule = yearMonths.some((r) => r.rule125Triggered);
      const hasUnpaid = yearMonths.some((r) => r.unpaidAdded > 0 || r.unpaidInterest > 0);
      const rates = yearMonths.map((r) => r.rate);
      const rateMin = Math.min(...rates);
      const rateMax = Math.max(...rates);

      const payments = yearMonths.map((r) => r.payment);
      const payMin = Math.min(...payments);
      const payMax = Math.max(...payments);

      yearlyRecords.push({
        year: y,
        rateDisplay: rateMin === rateMax ? formatRate(rateMin) : `${formatRate(rateMin)}~${formatRate(rateMax)}`,
        monthlyPayment: yearMonths[0].payment,
        paymentDisplay: payMin === payMax ? formatYen(payMin) : `${formatYen(payMin)} ~ ${formatYen(payMax)}`,
        monthlyPaymentMin: payMin,
        monthlyPaymentMax: payMax,
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

    // 步骤 4: 期末清偿与一括返済核算
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

  /* ============================================================================ */
  /* 4. DOM RENDERERS (界面渲染层)                                                */
  /* ============================================================================ */

  /**
   * 刷新全部界面的主渲染流程
   */
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

    // 动态同步前往税金计算器的参数
    const navTax = document.getElementById('nav-link-tax');
    if (navTax) {
      navTax.href = `./tax/?mortgage=${state.principalMan}`;
    }
  }

  /**
   * 渲染 4 个核心 KPI 指标卡片
   * @param {Object} res - 推演结果
   */
  function renderKPIs(res) {
    const lang = getLang();

    // KPI 1: 初期月供
    const elInitial = document.getElementById('kpi-initial-payment');
    const elInitialHint = document.getElementById('kpi-initial-hint');
    if (elInitial) elInitial.textContent = formatYen(res.initialPayment);
    if (elInitialHint) {
      elInitialHint.textContent = lang === 'ja'
        ? `1〜5年目返済 (${formatRate(state.initialRate)})`
        : `第1~5年月供 (${formatRate(state.initialRate)})`;
    }

    // KPI 2: 最高月供
    const elMax = document.getElementById('kpi-max-payment');
    const elMaxHint = document.getElementById('kpi-max-hint');
    if (elMax) elMax.textContent = formatYen(res.maxPayment);
    if (elMaxHint) {
      elMaxHint.textContent = lang === 'ja'
        ? `第 ${res.maxPaymentYear} 年目にピーク到達`
        : `在第 ${res.maxPaymentYear} 年达到峰值`;
    }

    // KPI 3: 累计总还款额
    const elTotal = document.getElementById('kpi-total-payment');
    const elTotalHint = document.getElementById('kpi-total-hint');
    if (elTotal) elTotal.textContent = formatYen(res.grandTotalPayment);
    if (elTotalHint) {
      elTotalHint.textContent = lang === 'ja'
        ? `元金 ${formatManYen(state.principalMan * 10000)} ＋ 利息`
        : `本金 ${formatManYen(state.principalMan * 10000)} + 利息`;
    }

    // KPI 4: 期末清偿状态
    const statusEl = document.getElementById('kpi-balloon-status');
    const balloonHint = document.getElementById('kpi-balloon-hint');
    const balloonCard = document.getElementById('kpi-card-balloon');

    if (statusEl && balloonCard && balloonHint) {
      if (res.hasBalloonRisk) {
        statusEl.textContent = formatYen(res.balloonPayment);
        statusEl.className = 'kpi-num text-danger';
        balloonHint.textContent = lang === 'ja'
          ? `⚠️ 期末一括返済 (残債: ${formatYen(res.finalBalance)})`
          : `⚠️ 期末一笔还清 (本金: ${formatYen(res.finalBalance)})`;
        balloonCard.classList.add('highlight-danger');
        balloonCard.classList.remove('highlight-primary');
      } else {
        statusEl.textContent = t('kpi_settled');
        statusEl.className = 'kpi-num text-success';
        balloonHint.textContent = t('kpi_settled_hint').replace('{term}', state.termYears);
        balloonCard.classList.remove('highlight-danger');
        balloonCard.classList.add('highlight-primary');
      }
    }
  }

  /**
   * 渲染动态风险警报横幅
   * @param {Object} res
   */
  function renderBanners(res) {
    const bannerEl = document.getElementById('alert-banner');
    if (!bannerEl) return;
    const lang = getLang();

    if (res.hasBalloonRisk) {
      bannerEl.className = 'banner danger';
      bannerEl.style.display = 'flex';
      const cause = res.is125EverTriggered
        ? (lang === 'ja' ? '<strong>125%上限ルール</strong>' : '<strong>125%上限封顶</strong>')
        : (lang === 'ja' ? '<strong>5年固定返済ルール</strong>' : '<strong>5年固定还款周期</strong>');

      bannerEl.innerHTML = lang === 'ja' ? `
        <div class="banner-icon">⚠️</div>
        <div class="banner-text">
          <h4>高リスク警告：${state.termYears}年満期時に一括返済 ${formatYen(res.balloonPayment)} が必要です (一括返済)</h4>
          <p>${cause}の影響により、毎月の返済で元金が予定通り減少しませんでした。第 ${state.termYears} 年目満期時点で、元金残高 <strong>${formatYen(res.finalBalance)}</strong>${res.finalUnpaidInterest > 0 ? ` および未払利息 <strong>${formatYen(res.finalUnpaidInterest)}</strong>` : ''} が残存します。金融機関より一括返済が請求されますので、事前の繰上返済または資金準備が必要です！</p>
        </div>
      ` : `
        <div class="banner-icon">⚠️</div>
        <div class="banner-text">
          <h4>高风险预警：${state.termYears}年贷款到期需一次性补交 ${formatYen(res.balloonPayment)} (一括返済)</h4>
          <p>受 ${cause} 影响，月供未能如期冲抵本金。截至第 ${state.termYears} 年末，仍有剩余本金 <strong>${formatYen(res.finalBalance)}</strong>${res.finalUnpaidInterest > 0 ? ` 与未付利息 <strong>${formatYen(res.finalUnpaidInterest)}</strong>` : ''}。银行将在期末要求一次性全额还清，建议提前进行随期提前还款 (繰上返済) 或储备还款资金！</p>
        </div>
      `;
    } else if (res.isUnpaidEverTriggered) {
      bannerEl.className = 'banner warning';
      bannerEl.style.display = 'flex';
      bannerEl.innerHTML = lang === 'ja' ? `
        <div class="banner-icon">⚡</div>
        <div class="banner-text">
          <h4>注意：返済期間中に「未払利息」が発生した履歴があります</h4>
          <p>金利急騰期において、毎月の返済額が当月利息を下回り、元金充当が一時ストップしました。その後の返済で挽回し第 ${state.termYears} 年目に完済されたものの、支払利息総額が大幅に増加しています。</p>
        </div>
      ` : `
        <div class="banner-icon">⚡</div>
        <div class="banner-text">
          <h4>提示：模拟周期内曾发生“未付利息 (未払利息)”</h4>
          <p>在加息高峰月份，月供甚至不足以支付当月利息，导致本金一度停止扣减。虽然后续周期已追回并在第 ${state.termYears} 年末顺利结清，但累积总利息支出显著提高。</p>
        </div>
      `;
    } else if (res.is125EverTriggered) {
      bannerEl.className = 'banner warning';
      bannerEl.style.display = 'flex';
      bannerEl.innerHTML = lang === 'ja' ? `
        <div class="banner-icon">🛡️</div>
        <div class="banner-text">
          <h4>安全機能作動：125%ルールにより返済額の急増が抑制されました</h4>
          <p>金利見直し期において、再計算された返済額が前回の1.25倍を超過しました。125%ルールが上限キャップとして機能し、家計の支出急増を防ぎながら第 ${state.termYears} 年目に完済に至りました。</p>
        </div>
      ` : `
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

  /**
   * 渲染大行 (5年/125%规则) vs 索尼银行 (无规则即时变动) 对比面板
   * @param {Object} sim - 当前模式
   * @param {Object} comp - 即时重算模式
   */
  function renderComparison(sim, comp) {
    const compBox = document.getElementById('comparison-box');
    if (!compBox) return;
    const lang = getLang();

    const diff = sim.grandTotalInterest - comp.grandTotalInterest;
    const diffTxt = diff > 0
      ? t('comp_diff_more').replace('{val}', formatYen(diff))
      : diff < 0
      ? t('comp_diff_less').replace('{val}', formatYen(Math.abs(diff)))
      : t('comp_diff_equal');

    const statusTxt = state.enable5YearRule ? t('comp_status_on') : t('comp_status_off');
    const termInfo = t('comp_term_info').replace('{term}', state.termYears).replace('{months}', state.termYears * 12);
    const curModeTitle = t('comp_current_mode').replace('{status}', statusTxt);
    const settleGuaranteed = t('comp_guaranteed').replace('{term}', state.termYears);

    compBox.innerHTML = `
      <div class="compare-head">
        <h4>${t('comp_title')}</h4>
        <span class="label-hint">${termInfo}</span>
      </div>
      <div class="compare-grid">
        <div class="compare-card ${state.enable5YearRule ? 'highlight' : ''}">
          <div class="compare-title">
            <span>${curModeTitle}</span>
            <span class="badge ${sim.hasBalloonRisk ? 'badge-red' : 'badge-green'}">
              ${sim.hasBalloonRisk ? t('comp_balloon_risk') : t('comp_smooth')}
            </span>
          </div>
          <div class="compare-row"><span class="lbl">${t('comp_lbl_max_pay')}</span><span class="val">${formatYen(sim.maxPayment)}</span></div>
          <div class="compare-row"><span class="lbl">${t('comp_lbl_interest')}</span><span class="val">${formatYen(sim.grandTotalInterest)}</span></div>
          <div class="compare-row"><span class="lbl">${t('comp_lbl_balloon')}</span><span class="val ${sim.balloonPayment > 0 ? 'text-danger' : ''}">${formatYen(sim.balloonPayment)}</span></div>
          <div class="compare-row"><span class="lbl">${t('comp_lbl_stability')}</span><span class="val text-success">${t('comp_stab_high')}</span></div>
        </div>

        <div class="compare-card ${!state.enable5YearRule ? 'highlight' : ''}">
          <div class="compare-title">
            <span>${t('comp_instant_mode')}</span>
            <span class="badge badge-blue">${settleGuaranteed}</span>
          </div>
          <div class="compare-row"><span class="lbl">${t('comp_lbl_max_pay')}</span><span class="val">${formatYen(comp.maxPayment)}</span></div>
          <div class="compare-row"><span class="lbl">${t('comp_lbl_interest')}</span><span class="val">${formatYen(comp.grandTotalInterest)} (${diffTxt})</span></div>
          <div class="compare-row"><span class="lbl">${t('comp_lbl_balloon')}</span><span class="val text-success">¥0 (${lang === 'ja' ? '完全完済' : '精准结清'})</span></div>
          <div class="compare-row"><span class="lbl">${t('comp_lbl_stability')}</span><span class="val text-warning">${t('comp_stab_low')}</span></div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染 Chart.js 数据可视化双图表
   * @param {Object} res
   */
  function renderCharts(res) {
    if (typeof Chart === 'undefined') return;
    const lang = getLang();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const labels = res.yearlyRecords.map((r) => (lang === 'ja' ? `第${r.year}年目` : `第${r.year}年`));

    // 图表 1: 每月还款额与本金/利息构成
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
              label: t('chart_legend_pmt'),
              data: res.yearlyRecords.map((r) => r.monthlyPayment),
              borderColor: '#2563eb',
              backgroundColor: '#2563eb',
              borderWidth: 3,
              pointRadius: 2,
              tension: 0.1,
              yAxisID: 'y'
            },
            {
              type: 'bar',
              label: t('chart_legend_prn'),
              data: res.yearlyRecords.map((r) => Math.round(r.yearPrincipal / 10000)),
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
              stack: 'stack1',
              yAxisID: 'y1'
            },
            {
              type: 'bar',
              label: t('chart_legend_int'),
              data: res.yearlyRecords.map((r) => Math.round(r.yearInterest / 10000)),
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
                  if (ctx.dataset.type === 'line') {
                    return `${t('chart_legend_pmt')}: ¥${Math.round(ctx.raw).toLocaleString('ja-JP')} /月`;
                  }
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
              title: { display: true, text: t('chart_axis_pmt'), color: textColor }
            },
            y1: {
              type: 'linear',
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { color: textColor, callback: (v) => v + '万' },
              title: { display: true, text: t('chart_axis_year_total'), color: textColor }
            }
          }
        }
      });
    }

    // 图表 2: 贷款本金残高与未付利息走势
    const ctxBalance = document.getElementById('balanceChart')?.getContext('2d');
    if (ctxBalance) {
      if (balanceChart) balanceChart.destroy();

      balanceChart = new Chart(ctxBalance, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: t('chart_legend_bal'),
              data: res.yearlyRecords.map((r) => Math.round(r.endBalance / 10000)),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              borderWidth: 2.5,
              fill: true,
              pointRadius: 2,
              tension: 0.2
            },
            {
              type: 'bar',
              label: t('chart_legend_unpaid'),
              data: res.yearlyRecords.map((r) => Math.round(r.endUnpaidInterest / 10000)),
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
              title: { display: true, text: t('chart_axis_man'), color: textColor }
            }
          }
        }
      });
    }
  }

  /**
   * 渲染 40 年详细还款计划表与逐月展开项
   * @param {Object} res
   */
  function renderTable(res) {
    const tbody = document.getElementById('schedule-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const lang = getLang();

    res.yearlyRecords.forEach((yRec) => {
      const tr = document.createElement('tr');
      if (yRec.isPeriodStart) tr.classList.add('period-start');
      if (yRec.has125Rule) tr.classList.add('rule-125');
      if (yRec.hasUnpaid) tr.classList.add('unpaid-row');

      const startCal = getCalendarDate((yRec.year - 1) * 12 + 1);
      const endCal = getCalendarDate(yRec.year * 12);
      const yrLabel = lang === 'ja' ? `第 ${yRec.year} 年目` : `第 ${yRec.year} 年`;

      let badgeHtml = '';
      if (yRec.has125Rule) badgeHtml += `<span class="pill pill-cap" title="${t('pill_cap')}">${t('pill_cap')}</span> `;
      if (yRec.hasUnpaid) badgeHtml += `<span class="pill pill-unpaid" title="${t('pill_unpaid')}">${t('pill_unpaid')}</span> `;
      if (yRec.isPeriodStart && yRec.year > 1) badgeHtml += `<span class="pill pill-cycle">${t('pill_cycle')}</span>`;

      tr.innerHTML = `
        <td style="font-weight: 600;">
          ${yrLabel}
          <span style="font-size: 11px; color: var(--text-muted); font-weight: normal; margin-left: 2px;">(${startCal.shortLabel}~${endCal.shortLabel})</span>
          ${badgeHtml}
        </td>
        <td>${yRec.rateDisplay}</td>
        <td style="font-weight: 700;">${yRec.paymentDisplay || formatYen(yRec.monthlyPayment)}</td>
        <td>${formatYen(yRec.yearPayment)}</td>
        <td style="color: #10b981;">${formatYen(yRec.yearPrincipal)}</td>
        <td style="color: #ef4444;">${formatYen(yRec.yearInterest)}</td>
        <td style="font-weight: 600;">${formatYen(yRec.endBalance)}</td>
        <td class="${yRec.endUnpaidInterest > 0 ? 'text-danger' : ''}">${formatYen(yRec.endUnpaidInterest)}</td>
        <td>
          <button type="button" class="btn-toggle-month chip" style="font-size: 11px;" data-year="${yRec.year}">
            ${t('btn_detail_open')}
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
      yRec.months.forEach((m) => {
        const mCal = getCalendarDate(m.month);
        const mTermLabel = lang === 'ja' ? `第 ${m.month} 回` : `第 ${m.month} 期`;
        let statusBadge = '-';
        if (m.rule125Triggered) {
          statusBadge = `<span class="pill pill-cap">${t('pill_cap')}</span>`;
        } else if (m.unpaidAdded > 0) {
          statusBadge = `<span class="pill pill-unpaid">${lang === 'ja' ? '未払利息+' : '未付利息+'}${formatYen(m.unpaidAdded)}</span>`;
        }

        monthlyRowsHtml += `
          <tr>
            <td><strong>${mTermLabel}</strong> <span style="color: var(--text-secondary); margin-left: 4px;">(${mCal.label})</span></td>
            <td><strong>${formatRate(m.rate)}</strong></td>
            <td style="font-weight: 600;">${formatYen(m.payment)}</td>
            <td style="color: #10b981;">${formatYen(m.principalPaid)}</td>
            <td style="color: #ef4444;">${formatYen(m.interestPaid)}</td>
            <td>${formatYen(m.balance)}</td>
            <td class="${m.unpaidInterest > 0 ? 'text-danger' : ''}">${formatYen(m.unpaidInterest)}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      });

      const subHeader = t('sub_month_header').replace('{year}', yRec.year).replace('{start}', startCal.label).replace('{end}', endCal.label);
      subTr.innerHTML = `
        <td colspan="9">
          <div style="padding: 10px 14px;">
            <strong style="font-size: 12px; color: var(--text-secondary);">${subHeader}</strong>
            <table class="month-table">
              <thead>
                <tr>
                  <th style="text-align: left;">${t('sub_th_month')}</th>
                  <th>${t('sub_th_rate')}</th>
                  <th>${t('sub_th_pmt')}</th>
                  <th>${t('sub_th_prn')}</th>
                  <th>${t('sub_th_int')}</th>
                  <th>${t('sub_th_bal')}</th>
                  <th>${t('sub_th_unpaid')}</th>
                  <th>${t('sub_th_status')}</th>
                </tr>
              </thead>
              <tbody>${monthlyRowsHtml}</tbody>
            </table>
          </div>
        </td>
      `;
      tbody.appendChild(subTr);
    });

    // 绑定单年逐月展开/折叠按钮
    tbody.querySelectorAll('.btn-toggle-month').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const yr = e.currentTarget.getAttribute('data-year');
        const targetRow = document.getElementById(`month-subrow-${yr}`);
        if (!targetRow) return;
        const isHidden = targetRow.style.display === 'none';
        targetRow.style.display = isHidden ? 'table-row' : 'none';
        e.currentTarget.textContent = isHidden ? t('btn_detail_close') : t('btn_detail_open');
      });
    });
  }

  /**
   * 渲染自定义时间轴节点列表 (按年+月精细配置)
   */
  function renderCustomMilestones() {
    const container = document.getElementById('custom-milestone-list');
    if (!container) return;
    container.innerHTML = '';
    const lang = getLang();

    // 约束年份不超出当前贷款期限
    state.customMilestones.forEach((m) => {
      if (m.year > state.termYears) m.year = state.termYears;
    });

    // 依据期数先后排序
    state.customMilestones
      .sort((a, b) => {
        const ma = (a.year - 1) * 12 + (a.month || 1);
        const mb = (b.year - 1) * 12 + (b.month || 1);
        return ma - mb;
      })
      .forEach((m, idx) => {
        const currentMo = m.month || 1;
        const absMonth = (m.year - 1) * 12 + currentMo;
        const cal = getCalendarDate(absMonth);
        const yrLabel = (y) => (lang === 'ja' ? `第 ${y} 年目` : `第 ${y} 年`);
        const moLabel = (mo) => (lang === 'ja' ? `第 ${mo} か月目` : `第 ${mo} 月`);
        const termLabel = lang === 'ja' ? `第${absMonth}回 · ${cal.label}` : `第${absMonth}期 · ${cal.label}`;

        const row = document.createElement('div');
        row.className = 'custom-step-row';
        row.innerHTML = `
          <select class="select-year step-year-select" data-idx="${idx}">
            ${Array.from({ length: state.termYears }, (_, i) => i + 1)
              .map((y) => `<option value="${y}" ${y === m.year ? 'selected' : ''}>${yrLabel(y)}</option>`)
              .join('')}
          </select>
          <select class="select-month step-month-select" data-idx="${idx}">
            ${Array.from({ length: 12 }, (_, i) => i + 1)
              .map((mo) => `<option value="${mo}" ${mo === currentMo ? 'selected' : ''}>${moLabel(mo)}</option>`)
              .join('')}
          </select>
          <span class="step-date-tag" title="${lang === 'ja' ? '返済回と年月' : '对应还款期数与日历年月'}">${termLabel}</span>
          <div class="rate-wrap">
            <input type="number" step="0.001" min="0" max="15" value="${m.rate}" class="form-input step-rate-input" data-idx="${idx}" />
            <span class="input-addon">%</span>
          </div>
          <button type="button" class="btn-icon-del" data-idx="${idx}" title="${lang === 'ja' ? 'この見直しノードを削除' : '删除此节点'}">✕</button>
        `;
        container.appendChild(row);
      });

    // 绑定事件
    container.querySelectorAll('.step-year-select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        state.customMilestones[idx].year = parseInt(e.target.value);
        renderCustomMilestones();
        updateUI();
      });
    });

    container.querySelectorAll('.step-month-select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        state.customMilestones[idx].month = parseInt(e.target.value);
        renderCustomMilestones();
        updateUI();
      });
    });

    container.querySelectorAll('.step-rate-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0) {
          state.customMilestones[idx].rate = val;
          updateUI();
        }
      });
    });

    container.querySelectorAll('.btn-icon-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        state.customMilestones.splice(idx, 1);
        renderCustomMilestones();
        updateUI();
      });
    });
  }

  /**
   * 动态生成本金与期限快捷筹码选项
   */
  function renderDynamicChips() {
    const lang = getLang();
    const myTag = lang === 'ja' ? ' (初期値)' : ' (我的)';

    // 本金筹码
    const principalChipsContainer = document.getElementById('chips-principal-container');
    if (principalChipsContainer) {
      const list = chipsCfg.principalList || [2000, 2500, 3000, 3190, 3500, 4000, 5000];
      principalChipsContainer.innerHTML = list
        .map(
          (val) => `
        <button type="button" class="chip chip-principal ${val === state.principalMan ? 'active' : ''}" data-val="${val}">
          ${val.toLocaleString()}万${val === loanCfg.principalMan ? myTag : ''}
        </button>
      `
        )
        .join('');

      principalChipsContainer.querySelectorAll('.chip-principal').forEach((btn) => {
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

    // 年限筹码
    const termChipsContainer = document.getElementById('chips-term-container');
    if (termChipsContainer) {
      const list = chipsCfg.termList || [20, 25, 30, 35, 40, 45, 50];
      termChipsContainer.innerHTML = list
        .map(
          (val) => `
        <button type="button" class="chip chip-term ${val === state.termYears ? 'active' : ''}" data-val="${val}">
          ${val}年${val === loanCfg.termYears ? myTag : ''}
        </button>
      `
        )
        .join('');

      termChipsContainer.querySelectorAll('.chip-term').forEach((btn) => {
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
    document.querySelectorAll('.chip-principal').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-val')) === state.principalMan);
    });
  }

  function updateTermChipsState() {
    document.querySelectorAll('.chip-term').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-val')) === state.termYears);
    });
  }

  /**
   * 导出带 UTF-8 BOM 的 480 期全量还款明细 CSV
   */
  function exportCSV() {
    const res = runSimulation();
    const lang = getLang();
    const isJa = lang === 'ja';

    const headerCols = isJa
      ? ['返済回', '年月', '年次', '年内月序', '適用金利(%)', '当月返済額(円)', '元金充当(円)', '支払利息(円)', '月末残高(円)', '未払利息(円)', '備考']
      : ['还款期数', '日历年月', '贷款年份', '年内月序', '适用年利率(%)', '当期还款额(円)', '偿还本金(円)', '支付利息(円)', '月末本金余额(円)', '未付利息挂账(円)', '状态说明'];

    const rows = [headerCols];

    res.monthlyRecords.forEach((m) => {
      const mCal = getCalendarDate(m.month);
      let mark = '';
      if (m.rule125Triggered) mark += isJa ? '125%上限適用; ' : '触发125%上限; ';
      if (m.unpaidAdded > 0) mark += isJa ? `未払利息発生${m.unpaidAdded}円; ` : `产生未付利息${m.unpaidAdded}円; `;
      if (m.isPeriodStart) mark += isJa ? '5年見直し期; ' : '5年重评节点; ';

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
      const balloonLabel = isJa ? '満期時一括返済' : '期末一次性结清';
      const balloonNote = isJa ? '満期時残債一括清算' : '期末一括返済补齐剩余本息';
      rows.push([balloonLabel, endCal.label, state.termYears, 12, '-', res.balloonPayment, res.finalBalance, res.finalUnpaidInterest, 0, 0, balloonNote]);
    }

    const csvContent = '\uFEFF' + rows.map((e) => e.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isJa
      ? `住宅ローン返済計画_${state.termYears}年_${state.principalMan}万円.csv`
      : `日本房贷还款计划_${state.termYears}年_${state.principalMan}万.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ============================================================================ */
  /* 5. USER INTERACTION & CONTROLLER (交互控制器与事件监听)                      */
  /* ============================================================================ */

  // 5.1 主题管理
  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(THEME_ALT_KEY);
    } catch (e) {}
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(THEME_ALT_KEY, theme);
    } catch (e) {}
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
  }

  // 5.2 绑定各项输入控制器
  function bindLoanInputControls() {
    // 本金输入
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

    // 贷款期限
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

    // 初始利率
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

    // 放款年月
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

    // 还款方式切换 (元利均等 vs 元金均等)
    document.querySelectorAll('.segment-repay-method .segment-btn').forEach((item) => {
      const itemVal = item.getAttribute('data-val');
      if (itemVal === state.repayMethod) {
        document.querySelectorAll('.segment-repay-method .segment-btn').forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
      }

      item.addEventListener('click', () => {
        document.querySelectorAll('.segment-repay-method .segment-btn').forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
        state.repayMethod = item.getAttribute('data-val');

        const notice = document.getElementById('rule-disabled-notice');
        if (notice) notice.style.display = state.repayMethod === 'equal_principal' ? 'block' : 'none';
        updateUI();
      });
    });

    // 规则开关 (5年规则 / 125%规则)
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

    // 加息情景卡片选择
    document.querySelectorAll('.scenario-item').forEach((card) => {
      const scenario = card.getAttribute('data-scenario');
      if (scenario === state.currentScenario) {
        document.querySelectorAll('.scenario-item').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
      }

      card.addEventListener('click', () => {
        document.querySelectorAll('.scenario-item').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        state.currentScenario = scenario;

        const customBox = document.getElementById('custom-schedule-box');
        if (customBox) customBox.style.display = scenario === 'custom' ? 'block' : 'none';
        updateUI();
      });
    });

    // 添加自定义节点按钮
    const btnAddStep = document.getElementById('btn-add-step');
    if (btnAddStep) {
      btnAddStep.addEventListener('click', () => {
        let nextYr = 1;
        let nextMo = 7;
        let lastRate = state.initialRate;
        if (state.customMilestones.length > 0) {
          const last = state.customMilestones[state.customMilestones.length - 1];
          lastRate = last.rate;
          const lastAbs = (last.year - 1) * 12 + (last.month || 1);
          const nextAbs = Math.min(state.termYears * 12, lastAbs + 6);
          nextYr = Math.ceil(nextAbs / 12);
          nextMo = ((nextAbs - 1) % 12) + 1;
        }
        state.customMilestones.push({ year: nextYr, month: nextMo, rate: +(lastRate + 0.15).toFixed(3) });
        renderCustomMilestones();
        updateUI();
      });
    }

    // 图表选项卡切换
    document.querySelectorAll('.chart-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        state.activeChartTab = tab;

        const pWrap = document.getElementById('chart-wrapper-payment');
        const bWrap = document.getElementById('chart-wrapper-balance');
        if (pWrap) pWrap.style.display = tab === 'payment' ? 'block' : 'none';
        if (bWrap) bWrap.style.display = tab === 'balance' ? 'block' : 'none';
      });
    });

    // 全部月份表格展开/折叠
    const btnToggleAll = document.getElementById('btn-toggle-all-months');
    if (btnToggleAll) {
      btnToggleAll.addEventListener('click', () => {
        state.isTableExpanded = !state.isTableExpanded;
        btnToggleAll.textContent = state.isTableExpanded ? t('btn_collapse_all') : t('btn_expand_all');

        document.querySelectorAll('.sub-row').forEach((row) => {
          row.style.display = state.isTableExpanded ? 'table-row' : 'none';
        });
        document.querySelectorAll('.btn-toggle-month').forEach((btn) => {
          btn.textContent = state.isTableExpanded ? t('btn_detail_close') : t('btn_detail_open');
        });
      });
    }

    // CSV 导出
    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', exportCSV);
    }

    // 主题切换按钮
    document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleTheme();
        updateUI();
      });
    });
  }

  /* ============================================================================ */
  /* 6. INIT BOOTSTRAP (应用启动入口)                                             */
  /* ============================================================================ */

  function init() {
    initTheme();

    // 6.1 读取 URL 参数 (例如从税金计算器跳过来 ?principal=3500&term=35&rate=1.2)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('principal')) {
        const p = parseInt(urlParams.get('principal'));
        if (!isNaN(p) && p > 0) state.principalMan = p;
      }
      if (urlParams.has('term')) {
        const term = parseInt(urlParams.get('term'));
        if (!isNaN(term) && term >= 1 && term <= 50) state.termYears = term;
      }
      if (urlParams.has('rate')) {
        const r = parseFloat(urlParams.get('rate'));
        if (!isNaN(r) && r >= 0) state.initialRate = r;
      }
    } catch (e) {}

    // 6.2 绑定语言变更事件
    window.addEventListener('mortgage-lang-changed', () => {
      renderDynamicChips();
      renderCustomMilestones();
      updateUI();
    });

    // 6.3 渲染控件与筹码
    renderDynamicChips();
    bindLoanInputControls();
    renderCustomMilestones();

    // 6.4 首次核心计算与渲染
    updateUI();
  }

  // DOM 准备好后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 延迟图表重绘（防止CDN异步加载未就绪）
  window.addEventListener('load', () => {
    if (!paymentChart && typeof Chart !== 'undefined') {
      updateUI();
    }
  });

  // 暴露调试对象供开发者控制台检验
  window.MortgageApp = {
    state,
    runSimulation,
    updateUI
  };

})(window);
