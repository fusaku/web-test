/**
 * ==============================================================================
 * 日本正社員税金・住宅ローン控除・ふるさと納税シミュレーター
 * 交互控制器与视图渲染 - tax/js/app.js (神奈川·横浜市标准版)
 * ==============================================================================
 *
 * 📖 架构分层 (Architecture Layers):
 * 1. CONFIG & STATE       - 用户表单数据读取与模型装配
 * 2. FORMATTERS           - 纯函数货币与多语言辅助工具
 * 3. DOM RENDERERS        - 视图看板渲染 (KPI、保险节税、房贷进度、对比、源泉票、图表)
 * 4. REPORT EXPORT        - 带 BOM 头的精细化 CSV 报告导出
 * 5. CONTROLLER & EVENTS  - 交互控制器与联动事件监听
 * 6. INIT BOOTSTRAP       - 应用加载与默认参数装配入口
 * ==============================================================================
 */

(function(window) {
  'use strict';

  /* ============================================================================ */
  /* 1. CONFIG & STATE (配置与表单数据获取)                                       */
  /* ============================================================================ */

  // 全局 Chart.js 图表实例引用
  let taxCompositionChart = null;
  let taxComparisonChart = null;

  /**
   * 从 DOM 表单收集并标准化全部计算输入参数
   * @returns {Object} 标准化计算入参对象
   */
  function getFormData() {
    const regionPrefecture = document.getElementById('select-region')?.value || 'yokohama';
    const grossAnnualIncomeMan = parseFloat(document.getElementById('input-income')?.value) || 0;
    const ageOver40 = !!document.getElementById('input-age-40')?.checked;
    const socialInsuranceMode = document.querySelector('input[name="si-mode"]:checked')?.value || 'auto';
    const manualSocialInsuranceMan = parseFloat(document.getElementById('input-manual-si')?.value) || 0;

    // 配偶与抚养
    const spouseStatus = document.getElementById('select-spouse')?.value || 'none';
    const dependents16to18 = parseInt(document.getElementById('input-dep-1618')?.value, 10) || 0;
    const dependents19to22 = parseInt(document.getElementById('input-dep-1922')?.value, 10) || 0;
    const dependentsElderly = parseInt(document.getElementById('input-dep-elder')?.value, 10) || 0;
    const idecoAnnualMan = parseFloat(document.getElementById('input-ideco')?.value) || 0;

    // 商业保险料
    const lifeInsuranceGeneralMan = parseFloat(document.getElementById('input-life-general')?.value) || 0;
    const lifeInsuranceMedicalMan = parseFloat(document.getElementById('input-life-medical')?.value) || 0;
    const lifeInsuranceAnnuityMan = parseFloat(document.getElementById('input-life-annuity')?.value) || 0;
    const earthquakeInsuranceMan = parseFloat(document.getElementById('input-eq-ins')?.value) || 0;

    // 房贷相关
    const enableMortgage = !!document.getElementById('input-enable-mortgage')?.checked;
    const mortgageBalanceMan = parseFloat(document.getElementById('input-mortgage-balance')?.value) || 0;
    const deductionRate = parseFloat(document.getElementById('input-deduction-rate')?.value) || 0.7;
    const houseType = document.getElementById('select-house-type')?.value || 'energy_saving';
    const customLimitMan = parseFloat(document.getElementById('input-custom-limit')?.value) || 4000;
    const moveInYear = parseInt(document.getElementById('select-move-in-year')?.value, 10) || 2024;

    // 故乡税
    const preferredMethod = document.querySelector('input[name="furusato-method"]:checked')?.value || 'onestop';
    const plannedFurusatoMan = parseFloat(document.getElementById('input-furusato-planned')?.value) || 0;

    return {
      regionPrefecture,
      grossAnnualIncomeMan,
      ageOver40,
      socialInsuranceMode,
      manualSocialInsuranceMan,
      spouseStatus,
      dependents16to18,
      dependents19to22,
      dependentsElderly,
      idecoAnnualMan,
      lifeInsuranceGeneralMan,
      lifeInsuranceMedicalMan,
      lifeInsuranceAnnuityMan,
      earthquakeInsuranceMan,
      enableMortgage,
      mortgageBalanceMan,
      deductionRate,
      houseType,
      customLimitMan,
      moveInYear,
      preferredMethod,
      plannedFurusatoMan
    };
  }

  /* ============================================================================ */
  /* 2. FORMATTERS & UTILITIES (格式化与辅助工具)                                 */
  /* ============================================================================ */

  /**
   * 格式化货币为标准千分位日元字符串 (例如: ¥118,520)
   * @param {number} num
   * @returns {string}
   */
  function formatYen(num) {
    if (isNaN(num)) return '¥0';
    return '¥' + Math.round(num).toLocaleString('ja-JP');
  }

  /**
   * 格式化日元为万円表述 (例如: 700.0 万円)
   * @param {number} num
   * @returns {string}
   */
  function formatManYen(num) {
    if (isNaN(num)) return '0.0 万円';
    return (num / 10000).toFixed(1) + ' 万円';
  }

  /**
   * 多语言文本获取快捷函数
   * @param {string} key
   * @returns {string}
   */
  function t(key) {
    if (window.TaxI18n && typeof window.TaxI18n.t === 'function') {
      return window.TaxI18n.t(key);
    }
    return key;
  }

  /**
   * 当前语言代码
   * @returns {string} 'zh' | 'ja'
   */
  function getLang() {
    return window.TaxI18n ? window.TaxI18n.getLang() : 'zh';
  }

  /* ============================================================================ */
  /* 3. DOM RENDERERS (视图渲染层)                                                */
  /* ============================================================================ */

  /**
   * 主渲染入口：触发算法引擎并更新所有模块视图
   */
  function updateCalculations() {
    if (!window.TaxEngine) return;
    const input = getFormData();
    const result = window.TaxEngine.calculateAll(input);

    renderHeaderDynamicLabels(result, input);
    renderKPICards(result, input);
    renderInsuranceDeductionSummary(result);
    renderMortgageProgressBar(result, input);
    renderComparisonSection(result, input);
    renderFurusatoPlanner(result);
    renderSourceTaxTable(result);
    renderCharts(result);

    // 动态同步筹码高亮与前往房贷模拟器的 URL 参数
    syncChipsState(input.grossAnnualIncomeMan, input.mortgageBalanceMan);
    const navMort = document.getElementById('nav-link-mortgage');
    if (navMort) {
      const mVal = input.enableMortgage && input.mortgageBalanceMan > 0 ? input.mortgageBalanceMan : '';
      navMort.href = mVal ? `../?principal=${mVal}` : '../';
    }
  }

  /**
   * 3.1 渲染表头动态日元提示与地域标准 Badge
   */
  function renderHeaderDynamicLabels(result, input) {
    const elIncomeYen = document.getElementById('display-income-yen');
    if (elIncomeYen) elIncomeYen.textContent = formatYen(result.grossIncome);

    const elMortYen = document.getElementById('display-mortgage-yen');
    if (elMortYen) {
      const mortYen = input.enableMortgage ? input.mortgageBalanceMan * 10000 : 0;
      elMortYen.textContent = formatYen(mortYen);
    }

    const regionBadge = document.getElementById('region-summary-badge');
    if (regionBadge) {
      regionBadge.innerHTML = input.regionPrefecture === 'yokohama' ? t('region_yokohama_badge') : t('region_other_badge');
    }
  }

  /**
   * 3.2 渲染 4 个核心大指标 KPI 看板
   */
  function renderKPICards(result, input) {
    // KPI 1: 住宅减税 (房贷特别控除)
    const elMortVal = document.getElementById('kpi-mortgage-val');
    const elMortSub = document.getElementById('kpi-mortgage-sub');
    const elMortBadge = document.getElementById('kpi-mortgage-badge');

    if (input.enableMortgage && result.baseMortgageSim.isEligible && result.baseMortgageSim.maxDeduction > 0) {
      if (elMortVal) elMortVal.textContent = formatYen(result.activeMortgage.totalDeducted);
      if (elMortSub) {
        elMortSub.innerHTML = t('kpi_mortgage_sub_tpl')
          .replace('{max}', formatYen(result.baseMortgageSim.maxDeduction))
          .replace('{it}', formatYen(result.activeMortgage.incomeTaxDeducted))
          .replace('{rt}', formatYen(result.activeMortgage.residentTaxDeducted));
      }
      if (elMortBadge) {
        if (result.activeMortgage.wastedDeduction > 0) {
          elMortBadge.className = 'kpi-badge badge-red';
          elMortBadge.textContent = t('kpi_mortgage_waste_badge').replace('{waste}', formatYen(result.activeMortgage.wastedDeduction));
        } else {
          elMortBadge.className = 'kpi-badge badge-green';
          elMortBadge.textContent = t('kpi_mortgage_full_badge');
        }
      }
    } else {
      if (elMortVal) elMortVal.textContent = '¥0';
      if (elMortSub) {
        elMortSub.textContent = input.enableMortgage ? t('kpi_mortgage_fallback_high') : t('kpi_mortgage_fallback_none');
      }
      if (elMortBadge) {
        elMortBadge.className = 'kpi-badge badge-blue';
        elMortBadge.textContent = t('kpi_mortgage_badge_none');
      }
    }

    // KPI 2: 故乡税上限
    const elFurusatoVal = document.getElementById('kpi-furusato-val');
    const elFurusatoSub = document.getElementById('kpi-furusato-sub');
    if (elFurusatoVal) elFurusatoVal.textContent = formatYen(result.baseFurusatoLimit);
    if (elFurusatoSub) {
      elFurusatoSub.innerHTML = t('kpi_furusato_sub_tpl').replace('{gift}', formatYen(Math.floor(result.baseFurusatoLimit * 0.3)));
    }

    // KPI 3: 到手收入 (手取り)
    const elTakehomeVal = document.getElementById('kpi-takehome-val');
    const elTakehomeSub = document.getElementById('kpi-takehome-sub');
    if (elTakehomeVal) elTakehomeVal.textContent = formatYen(result.standardTakeHomePay);
    if (elTakehomeSub) {
      let takeHomeSubHtml = t('kpi_takehome_sub_tpl').replace('{monthly}', formatYen(result.monthlyTakeHome));
      if (result.totalCommercialPremiumsPaid > 0) {
        takeHomeSubHtml += t('kpi_takehome_net_cash_tpl')
          .replace('{prem}', formatYen(result.totalCommercialPremiumsPaid))
          .replace('{cash}', formatYen(result.netCashTakeHomePay));
      }
      elTakehomeSub.innerHTML = takeHomeSubHtml;
    }

    // KPI 4: 每年社保与税金合计
    const elTaxesVal = document.getElementById('kpi-taxes-val');
    const elTaxesSub = document.getElementById('kpi-taxes-sub');
    const totalTaxAndSocial = result.socialInsurance.total + result.totalTaxes;
    if (elTaxesVal) elTaxesVal.textContent = formatYen(totalTaxAndSocial);
    if (elTaxesSub) {
      elTaxesSub.innerHTML = t('kpi_taxes_sub_tpl')
        .replace('{si}', formatYen(result.socialInsurance.total))
        .replace('{it}', formatYen(result.finalNetIncomeTax))
        .replace('{rt}', formatYen(result.finalResidentTax));
    }
  }

  /**
   * 3.3 商业保险料控除节税明细面板
   */
  function renderInsuranceDeductionSummary(result) {
    const box = document.getElementById('insurance-summary-box');
    if (!box) return;

    const life = result.lifeDed;
    const eq = result.eqDed;

    document.getElementById('ins-life-it-ded').textContent = formatYen(life.incomeTaxTotal);
    document.getElementById('ins-life-rt-ded').textContent = formatYen(life.residentTaxTotal);
    document.getElementById('ins-eq-it-ded').textContent = formatYen(eq.incomeTax);
    document.getElementById('ins-eq-rt-ded').textContent = formatYen(eq.residentTax);

    document.getElementById('ins-total-saved-val').textContent = `+${formatYen(result.totalInsuranceTaxSavings)}`;
    document.getElementById('ins-total-saved-sub').innerHTML = t('ins_total_saved_sub_tpl')
      .replace('{it}', formatYen(result.insuranceIncomeTaxSaved))
      .replace('{rt}', formatYen(result.insuranceResidentTaxSaved));
  }

  /**
   * 3.4 房贷减税三段式进度条
   */
  function renderMortgageProgressBar(result, input) {
    const container = document.getElementById('mortgage-bar-container');
    if (!container) return;

    if (input.enableMortgage && result.baseMortgageSim.maxDeduction > 0) {
      const maxDed = result.baseMortgageSim.maxDeduction;
      const pctIncome = (result.activeMortgage.incomeTaxDeducted / maxDed) * 100;
      const pctResident = (result.activeMortgage.residentTaxDeducted / maxDed) * 100;
      const pctWasted = (result.activeMortgage.wastedDeduction / maxDed) * 100;

      document.getElementById('prog-income').style.width = pctIncome + '%';
      document.getElementById('prog-resident').style.width = pctResident + '%';
      document.getElementById('prog-wasted').style.width = pctWasted + '%';

      document.getElementById('legend-income-val').textContent = `${formatYen(result.activeMortgage.incomeTaxDeducted)} (${pctIncome.toFixed(0)}%)`;
      document.getElementById('legend-resident-val').textContent = `${formatYen(result.activeMortgage.residentTaxDeducted)} (${pctResident.toFixed(0)}%)`;
      document.getElementById('legend-wasted-val').textContent = `${formatYen(result.activeMortgage.wastedDeduction)} (${pctWasted.toFixed(0)}%)`;
      container.style.display = 'block';

      const capText = input.moveInYear >= 2022 ? '97,500円' : '136,500円';
      document.getElementById('mortgage-res-cap-text').textContent = t('mortgage_res_cap_tpl')
        .replace('{cap}', capText)
        .replace('{amount}', formatYen(result.baseMortgageSim.residentTaxCap));
    } else {
      container.style.display = 'none';
    }
  }

  /**
   * 3.5 One-Stop 特例 vs 確定申告 制度深度联动分析
   */
  function renderComparisonSection(result, input) {
    const donation = result.actualDonation;
    const loss = result.shinkoku.mortgageLossFromShinkoku;
    const safeLimit = result.shinkoku.safeFurusatoLimitShinkoku;

    document.getElementById('onestop-mortgage-ded').textContent = formatYen(result.onestop.mortgageDeducted);
    document.getElementById('onestop-furusato-ded').textContent = formatYen(Math.max(0, donation - 2000));
    document.getElementById('onestop-wasted').textContent = formatYen(result.onestop.wastedMortgage);

    document.getElementById('shinkoku-mortgage-ded').textContent = formatYen(result.shinkoku.mortgageSim.totalDeducted);
    document.getElementById('shinkoku-furusato-ded').textContent = formatYen(Math.max(0, donation - 2000));
    document.getElementById('shinkoku-wasted').textContent = formatYen(result.shinkoku.mortgageSim.wastedDeduction);

    const alertBox = document.getElementById('comparison-alert');
    if (!alertBox) return;

    if (input.enableMortgage) {
      if (loss > 0) {
        alertBox.className = 'alert-box alert-warning';
        alertBox.innerHTML = `
          <span class="alert-icon">⚠️</span>
          <div>
            <strong>${t('alert_loss_title').replace('{loss}', formatYen(loss))}</strong><br>
            ${t('alert_loss_reason').replace('{cap}', formatYen(result.baseMortgageSim.residentTaxCap))}<br>
            ${t('alert_loss_advice').replace('{safe}', formatYen(safeLimit))}
          </div>
        `;
      } else {
        alertBox.className = 'alert-box alert-success';
        alertBox.innerHTML = `
          <span class="alert-icon">🎉</span>
          <div>
            <strong>${t('alert_safe_title')}</strong><br>
            ${t('alert_safe_body')}
          </div>
        `;
      }
    } else {
      alertBox.className = 'alert-box alert-info';
      alertBox.innerHTML = `
        <span class="alert-icon">ℹ️</span>
        <div>${t('alert_no_mortgage')}</div>
      `;
    }
  }

  /**
   * 3.6 故乡税购买筹划与回报分析
   */
  function renderFurusatoPlanner(result) {
    const donation = result.actualDonation;
    const selfBurden = Math.min(donation, 2000);
    const taxDeducted = Math.max(0, donation - 2000);
    const giftVal = result.estimatedGiftValue;
    const netProfit = giftVal - selfBurden;

    document.getElementById('plan-donation-display').textContent = formatYen(donation);
    document.getElementById('plan-self-burden').textContent = formatYen(selfBurden);
    document.getElementById('plan-tax-deduction').textContent = formatYen(taxDeducted);
    document.getElementById('plan-gift-val').textContent = formatYen(giftVal);
    document.getElementById('plan-net-profit').textContent = `+${formatYen(netProfit)}`;
  }

  /**
   * 3.7 日本源泉徴収票字段对照表 (数据驱动型结构，杜绝死代码)
   */
  function renderSourceTaxTable(result) {
    const tbody = document.getElementById('source-table-body');
    if (!tbody) return;
    const isJa = getLang() === 'ja';

    // 以清晰的数据模型定义表格各行，避免上百行重复拼接 HTML
    const tableRows = [
      {
        titleZh: '支払金額 (税前年收入)',
        titleJa: '支払金額 (額面年収)',
        tagZh: '① 票面最左上',
        tagJa: '① 源泉票左上',
        value: formatYen(result.grossIncome),
        descZh: '税前额面年收入总和',
        descJa: '1年間の支払給与・賞与の総支給額'
      },
      {
        titleZh: '給与所得控除後の金額',
        titleJa: '給与所得控除後の金額',
        tagZh: '② 所得额',
        tagJa: '② 所得金額',
        value: formatYen(result.employmentIncome),
        descZh: `扣除给与所得控除 (${formatYen(result.employmentDeduction)}) 后的金额`,
        descJa: `給与所得控除額 (${formatYen(result.employmentDeduction)}) を差し引いた金額`
      },
      {
        titleZh: '社会保険料等の金額',
        titleJa: '社会保険料等の金額',
        tagZh: '社保控除',
        tagJa: '社保控除',
        value: formatYen(result.socialInsurance.total),
        descZh: '健保 5.01% (神奈川支部) + 厚生年金 9.15% + 雇佣 0.6%',
        descJa: '健康保険(5.01%)+厚生年金(9.15%)+雇用保険(0.60%)等'
      },
      {
        titleZh: '生命保険料の控除額',
        titleJa: '生命保険料の控除額',
        tagZh: '新制三分类',
        tagJa: '新制度3区分',
        value: formatYen(result.lifeDed.incomeTaxTotal),
        descZh: `一般 (${formatYen(result.lifeDed.general.incomeTax)}) + 医疗 (${formatYen(result.lifeDed.medical.incomeTax)}) + 年金 (${formatYen(result.lifeDed.annuity.incomeTax)})`,
        descJa: `一般(${formatYen(result.lifeDed.general.incomeTax)})＋介護医療(${formatYen(result.lifeDed.medical.incomeTax)})＋個人年金(${formatYen(result.lifeDed.annuity.incomeTax)})`
      },
      {
        titleZh: '地震保険料の控除額',
        titleJa: '地震保険料の控除額',
        tagZh: '地震险',
        tagJa: '地震保険',
        value: formatYen(result.eqDed.incomeTax),
        descZh: `最高 50,000 円 (实缴保费: ${formatYen(result.eqDed.premium)})`,
        descJa: `最高 50,000 円 (実支払保険料: ${formatYen(result.eqDed.premium)})`
      },
      {
        titleZh: '所得控除の額の合計額',
        titleJa: '所得控除の額の合計額',
        tagZh: '③ 控除合计',
        tagJa: '③ 控除合計',
        value: formatYen(result.incomeTaxDeductionsTotal),
        descZh: `社保 + 基础控除 (${formatYen(result.basicDed.incomeTax)}) + 保险控除 + 抚养/配偶等`,
        descJa: `社保＋基礎控除(${formatYen(result.basicDed.incomeTax)})＋保険料控除＋配偶者・扶養控除等`
      },
      {
        titleZh: '課税給与所得金額',
        titleJa: '課税給与所得金額',
        tagZh: '千円未满舍去',
        tagJa: '千円未満切捨',
        value: formatYen(result.incomeTaxableIncome),
        descZh: `计算税率的基准 (边际所得税率: ${result.incomeTaxBracket.label})`,
        descJa: `税額計算の課税標準 (適用限界税率: ${result.incomeTaxBracket.label})`
      },
      {
        titleZh: '算出所得税額 (减税前)',
        titleJa: '算出所得税額 (住宅控除前)',
        tagZh: '税率速算后',
        tagJa: '税率速算後',
        value: formatYen(result.rawIncomeTax),
        descZh: '房贷减税抵扣前的原始所得税',
        descJa: '住宅借入金等特別控除を差し引く前の所得税額'
      },
      {
        titleZh: '住宅借入金等特別控除の額',
        titleJa: '住宅借入金等特別控除の額',
        tagZh: '④ 房贷所得税抵扣',
        tagJa: '④ 住宅ローン控除',
        value: `- ${formatYen(result.activeMortgage.incomeTaxDeducted)}`,
        valueStyle: 'color:var(--success);',
        descZh: '直接在所得税中抵扣的金额',
        descJa: '所得税から直接差し引かれる住宅減税額'
      },
      {
        titleZh: '源泉徴収税額 (最终实缴所得税)',
        titleJa: '源泉徴収税額 (所得税納付額)',
        tagZh: '⑤ 年末最终税额',
        tagJa: '⑤ 年末最終税額',
        value: formatYen(result.finalNetIncomeTax),
        valueStyle: 'color:var(--primary);font-weight:700;',
        descZh: `含 2.1% 振兴特别所得税 (${formatYen(result.finalReconstructionTax)})`,
        descJa: `復興特別所得税 (2.1%・${formatYen(result.finalReconstructionTax)}) を含む`
      },
      {
        titleZh: '翌年度 住民税所得割 房贷抵扣',
        titleJa: '翌年度 住民税所得割 住宅控除額',
        tagZh: '横浜市住民税转嫁',
        tagJa: '横浜市住民税充当',
        value: `- ${formatYen(result.activeMortgage.residentTaxDeducted)}`,
        valueStyle: 'color:var(--primary);',
        isSubtle: true,
        descZh: `翌年6月起冲抵 (上限: ${formatYen(result.baseMortgageSim.residentTaxCap)})`,
        descJa: `翌年6月分住民税より減額 (上限: ${formatYen(result.baseMortgageSim.residentTaxCap)})`
      },
      {
        titleZh: '翌年度 住民税納付年額 (概算)',
        titleJa: '翌年度 住民税納付年額 (概算)',
        tagZh: '横浜市 10.025%',
        tagJa: '横浜市 10.025%',
        value: formatYen(result.finalResidentTax),
        valueStyle: 'font-weight:700;',
        isSubtle: true,
        descZh: `含所得割 10.025% + 均等割等 ${formatYen(result.residentPerCapitaLevy)} (含水源税+横浜绿税)`,
        descJa: `所得割 10.025% ＋ 均等割等 ${formatYen(result.residentPerCapitaLevy)} (水源税・横浜みどり税含む)`
      }
    ];

    tbody.innerHTML = tableRows
      .map(
        (r) => `
      <tr ${r.isSubtle ? 'style="background:var(--bg-subtle);"' : ''}>
        <td><strong>${isJa ? r.titleJa : r.titleZh}</strong><span class="source-ticket-tag">${isJa ? r.tagJa : r.tagZh}</span></td>
        <td class="num" style="${r.valueStyle || ''}">${r.value}</td>
        <td style="color:var(--text-muted);font-size:12px;">${isJa ? r.descJa : r.descZh}</td>
      </tr>
    `
      )
      .join('');
  }

  /**
   * 3.8 渲染 Chart.js 收入结构环形图与税前/税后减税对比柱状图
   */
  function renderCharts(result) {
    if (typeof Chart === 'undefined') return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    // 图表 1: 收入流向环形饼图
    const ctxComp = document.getElementById('chart-composition');
    if (ctxComp) {
      const compData = [
        result.netCashTakeHomePay,
        result.totalCommercialPremiumsPaid,
        result.socialInsurance.total,
        result.finalNetIncomeTax,
        result.finalResidentTax,
        result.actualDonation
      ];
      const compLabels = t('chart_comp_labels');

      if (taxCompositionChart) {
        taxCompositionChart.data.labels = compLabels;
        taxCompositionChart.data.datasets[0].data = compData;
        taxCompositionChart.options.plugins.legend.labels.color = textColor;
        taxCompositionChart.update();
      } else {
        taxCompositionChart = new Chart(ctxComp, {
          type: 'doughnut',
          data: {
            labels: compLabels,
            datasets: [
              {
                data: compData,
                backgroundColor: ['#0284c7', '#14b8a6', '#818cf8', '#10b981', '#f59e0b', '#ec4899'],
                borderWidth: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { color: textColor, font: { size: 12 } }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    const total = result.grossIncome;
                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                    return ` ${label}: ¥${value.toLocaleString()} (${pct}%)`;
                  }
                }
              }
            },
            cutout: '65%'
          }
        });
      }
    }

    // 图表 2: 减税成效对比柱状图
    const ctxCompare = document.getElementById('chart-comparison');
    if (ctxCompare) {
      const rawIT = Math.floor(result.rawIncomeTax * 1.021);
      const rawRT = result.adjustedResidentIncomeLevy + result.residentPerCapitaLevy;
      const afterIT = result.finalNetIncomeTax;
      const afterRT = result.finalResidentTax;

      const compareLabels = t('chart_compare_labels');
      const labelBefore = t('chart_dataset_before');
      const labelAfter = t('chart_dataset_after');

      const compareData = {
        labels: compareLabels,
        datasets: [
          {
            label: labelBefore,
            data: [rawIT, rawRT, rawIT + rawRT],
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.6)',
            borderRadius: 6
          },
          {
            label: labelAfter,
            data: [afterIT, afterRT, afterIT + afterRT],
            backgroundColor: '#10b981',
            borderRadius: 6
          }
        ]
      };

      if (taxComparisonChart) {
        taxComparisonChart.data = compareData;
        taxComparisonChart.options.plugins.legend.labels.color = textColor;
        taxComparisonChart.options.scales.x.ticks.color = textColor;
        taxComparisonChart.options.scales.y.ticks.color = textColor;
        taxComparisonChart.options.scales.y.grid.color = gridColor;
        taxComparisonChart.update();
      } else {
        taxComparisonChart = new Chart(ctxCompare, {
          type: 'bar',
          data: compareData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: textColor, font: { size: 12 } } },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return ` ${context.dataset.label}: ¥${context.parsed.y.toLocaleString()}`;
                  }
                }
              }
            },
            scales: {
              x: { ticks: { color: textColor }, grid: { display: false } },
              y: {
                ticks: {
                  color: textColor,
                  callback: (val) => '¥' + (val / 10000).toFixed(0) + '万'
                },
                grid: { color: gridColor }
              }
            }
          }
        });
      }
    }
  }

  /* ============================================================================ */
  /* 4. REPORT EXPORT (带 BOM 头的 CSV 导出)                                      */
  /* ============================================================================ */

  /**
   * 导出结构化 CSV 明细报告
   */
  function exportCSV() {
    const input = getFormData();
    const result = window.TaxEngine.calculateAll(input);
    const isJa = getLang() === 'ja';

    const catCol = t('csv_category');
    const itemCol = t('csv_item');
    const amtCol = t('csv_amount_desc');

    const rows = [
      [catCol, itemCol, amtCol],
      [isJa ? '基準・制度' : '计算标准', isJa ? '基準地域・税制基準' : '所在地区与税制标准', result.region.name],
      [isJa ? '基準・制度' : '计算标准', isJa ? '健康保険料率 (協会けんぽ神奈川支部)' : '健康保险率 (協会けんぽ神奈川支部)', result.region.healthRate],
      [isJa ? '基準・制度' : '计算标准', isJa ? '住民税所得割率 (水源税含む)' : '住民税所得割率 (含水源税)', result.region.residentTaxRate],
      [isJa ? '基準・制度' : '计算标准', isJa ? '住民税均等割等年額 (横浜みどり税含む)' : '住民税均等割等年额 (含横滨绿税等)', result.region.perCapitaLevy],
      [isJa ? '額面給与' : '基本收入', isJa ? '額面年収 (支払金額)' : '额面年收入 (支払金额)', result.grossIncome],
      [isJa ? '額面給与' : '基本收入', isJa ? '給与所得控除額' : '给与所得控除额', result.employmentDeduction],
      [isJa ? '額面給与' : '基本收入', isJa ? '給与所得金額' : '给与所得金额', result.employmentIncome],
      [isJa ? '社会保険料' : '社会保险', isJa ? '社会保険料年額合計' : '社会保险料年额合计', result.socialInsurance.total],
      [isJa ? '社会保険料' : '社会保险', isJa ? '健康保険料概算 (5.01%)' : '健康保险料估算 (5.01%)', result.socialInsurance.health],
      [isJa ? '社会保険料' : '社会保险', isJa ? '厚生年金概算 (9.15%)' : '厚生年金估算 (9.15%)', result.socialInsurance.pension],
      [isJa ? '社会保険料' : '社会保险', isJa ? '雇用保険概算 (0.60%)' : '雇佣保险估算 (0.60%)', result.socialInsurance.employment],
      [isJa ? '社会保険料' : '社会保险', isJa ? '介護保険概算 (0.80%)' : '介护保险估算 (0.80%)', result.socialInsurance.nursing],
      [isJa ? '商業保険料' : '商业保险', isJa ? '一般生命保険料支払年額' : '一般生命保险料实缴年额', result.lifeDed.general.premium],
      [isJa ? '商業保険料' : '商业保险', isJa ? '介護医療保険料支払年額' : '医疗介护保险料实缴年额', result.lifeDed.medical.premium],
      [isJa ? '商業保険料' : '商业保险', isJa ? '個人年金保険料支払年額' : '个人年金保险料实缴年额', result.lifeDed.annuity.premium],
      [isJa ? '商業保険料' : '商业保险', isJa ? '地震保険料支払年額' : '地震保险料实缴年额', result.eqDed.premium],
      [isJa ? '保険料控除' : '商业保险控除', isJa ? '所得税 生命保険料控除額' : '所得税生命保险料控除额', result.lifeDed.incomeTaxTotal],
      [isJa ? '保険料控除' : '商业保险控除', isJa ? '住民税 生命保険料控除額' : '住民税生命保险料控除额', result.lifeDed.residentTaxTotal],
      [isJa ? '保険料控除' : '商业保险控除', isJa ? '所得税 地震保険料控除額' : '所得税地震保险料控除额', result.eqDed.incomeTax],
      [isJa ? '保険料控除' : '商业保险控除', isJa ? '住民税 地震保険料控除額' : '住民税地震保险料控除额', result.eqDed.residentTax],
      [isJa ? '保険料控除' : '商业保险控除', isJa ? '商業保険料控除 年間節税効果' : '商业保险控除年度节税额', result.totalInsuranceTaxSavings],
      [isJa ? '所得税' : '所得税', isJa ? '課税給与所得金額' : '课税给与所得金额', result.incomeTaxableIncome],
      [isJa ? '所得税' : '所得税', isJa ? '算出所得税額' : '原始算出所得税额', result.rawIncomeTax],
      [isJa ? '所得税' : '所得税', isJa ? '住宅借入金等特別控除額 (所得税控除)' : '房贷所得税抵扣额', result.activeMortgage.incomeTaxDeducted],
      [isJa ? '所得税' : '所得税', isJa ? '源泉徴収税額 (復興特別所得税含む)' : '最终应缴所得税(含复兴特别税)', result.finalNetIncomeTax],
      [isJa ? '住民税' : '住民税', isJa ? '課税住民税所得金額' : '课税住民税所得金额', result.residentTaxableIncome],
      [isJa ? '住民税' : '住民税', isJa ? '算出所得割額 (10.025%)' : '原始所得割额 (10.025%)', result.rawResidentIncomeLevy],
      [isJa ? '住民税' : '住民税', isJa ? '調整控除額' : '调整控除额', result.adjustmentDeduction],
      [isJa ? '住民税' : '住民税', isJa ? '住宅借入金等特別控除額 (住民税充当)' : '房贷住民税转嫁抵扣额', result.activeMortgage.residentTaxDeducted],
      [isJa ? '住民税' : '住民税', isJa ? '翌年度住民税納付年額 (概算)' : '最终应缴住民税', result.finalResidentTax],
      [isJa ? '住宅ローン控除' : '房贷减税', isJa ? '年末ローン残高' : '年末贷款余额', input.enableMortgage ? input.mortgageBalanceMan * 10000 : 0],
      [isJa ? '住宅ローン控除' : '房贷减税', isJa ? '理論上の減税上限額' : '理论最大减税额度', result.baseMortgageSim.maxDeduction],
      [isJa ? '住宅ローン控除' : '房贷减税', isJa ? '実際の減税総額' : '实际总减税额', result.activeMortgage.totalDeducted],
      [isJa ? '住宅ローン控除' : '房贷减税', isJa ? '控除しきれず失効した額' : '未能用尽失效金额', result.activeMortgage.wastedDeduction],
      [isJa ? 'ふるさと納税' : '故乡税', isJa ? '実質負担2,000円上限目安額' : '実質負担2000円上限额', result.baseFurusatoLimit],
      [isJa ? 'ふるさと納税' : '故乡税', isJa ? '予定寄附金額' : '计划购买捐款额', result.actualDonation],
      [isJa ? 'ふるさと納税' : '故乡税', isJa ? '返礼品相当額 (約30%)' : '预计返礼品总价值(按30%)', result.estimatedGiftValue],
      [isJa ? '手取り額' : '实到手', isJa ? '法定税引後年間手取り額' : '法定税后年到手金额(手取り)', result.standardTakeHomePay],
      [isJa ? '手取り額' : '实到手', isJa ? '保険料支払後自由現金手取り' : '扣减商业保费后净自由现金', result.netCashTakeHomePay],
      [isJa ? '手取り額' : '实到手', isJa ? '月平均法定手取り額 (12分割)' : '月均法定到手金额(12薪)', result.monthlyTakeHome],
      [isJa ? '手取り額' : '实到手', isJa ? '月平均自由現金手取り (12分割)' : '月均净自由现金(12薪)', result.monthlyNetCash]
    ];

    let csvContent = '\uFEFF';
    rows.forEach((row) => {
      csvContent += row.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = t('csv_filename_tpl').replace('{income}', input.grossAnnualIncomeMan);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* ============================================================================ */
  /* 5. CONTROLLER & EVENT LISTENERS (交互控制器与事件监听)                      */
  /* ============================================================================ */

  /**
   * 生成额面年收与房贷余额筹码
   */
  function renderChips() {
    const config = window.TAX_CONFIG || {};
    const incomes = (config.quickChips && config.quickChips.incomes) || [400, 500, 600, 700, 800, 900, 1000, 1200, 1500];
    const mortBalances = (config.quickChips && config.quickChips.mortgageBalances) || [2000, 2500, 3000, 3190, 3500, 4000, 5000];

    const incomeContainer = document.getElementById('chips-income-container');
    if (incomeContainer) {
      incomeContainer.innerHTML = '';
      incomes.forEach((inc) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = `${inc}万`;
        chip.addEventListener('click', () => {
          document.getElementById('input-income').value = inc;
          highlightChips(incomeContainer, chip);
          updateCalculations();
        });
        incomeContainer.appendChild(chip);
      });
    }

    const mortContainer = document.getElementById('chips-mortgage-container');
    if (mortContainer) {
      mortContainer.innerHTML = '';
      mortBalances.forEach((bal) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = `${bal}万`;
        chip.addEventListener('click', () => {
          document.getElementById('input-mortgage-balance').value = bal;
          highlightChips(mortContainer, chip);
          updateCalculations();
        });
        mortContainer.appendChild(chip);
      });
    }
  }

  function syncChipsState(incomeVal, mortVal) {
    const incomeContainer = document.getElementById('chips-income-container');
    if (incomeContainer) {
      incomeContainer.querySelectorAll('.chip').forEach((c) => {
        const val = parseInt(c.textContent, 10);
        c.classList.toggle('active', val === incomeVal);
      });
    }
    const mortContainer = document.getElementById('chips-mortgage-container');
    if (mortContainer) {
      mortContainer.querySelectorAll('.chip').forEach((c) => {
        const val = parseInt(c.textContent, 10);
        c.classList.toggle('active', val === mortVal);
      });
    }
  }

  function highlightChips(container, activeChip) {
    container.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    if (activeChip) activeChip.classList.add('active');
  }

  /**
   * 绑定所有表单变更和操作按钮事件
   */
  function bindEvents() {
    // 监听所有输入框和下拉框
    document.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', updateCalculations);
      el.addEventListener('change', updateCalculations);
    });

    // 社保模式单选切换 (自动 vs 手动)
    document.querySelectorAll('input[name="si-mode"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const isManual = radio.value === 'manual';
        const wrap = document.getElementById('wrap-manual-si');
        if (wrap) wrap.style.display = isManual ? 'block' : 'none';
        updateCalculations();
      });
    });

    // 房贷开关联动
    const mortToggle = document.getElementById('input-enable-mortgage');
    if (mortToggle) {
      mortToggle.addEventListener('change', () => {
        const fields = document.getElementById('mortgage-details-fields');
        if (fields) fields.style.display = mortToggle.checked ? 'block' : 'none';
        updateCalculations();
      });
    }

    // 房屋环保类型 (自定义上限联动)
    const houseSelect = document.getElementById('select-house-type');
    if (houseSelect) {
      houseSelect.addEventListener('change', () => {
        const customWrap = document.getElementById('wrap-custom-limit');
        if (customWrap) customWrap.style.display = houseSelect.value === 'custom' ? 'block' : 'none';
        updateCalculations();
      });
    }

    // 故乡税推荐上限快速填入
    const btnFillFurusato = document.getElementById('btn-fill-furusato-max');
    if (btnFillFurusato) {
      btnFillFurusato.addEventListener('click', () => {
        const input = getFormData();
        const res = window.TaxEngine.calculateAll(input);
        const planInput = document.getElementById('input-furusato-planned');
        if (planInput) planInput.value = (res.baseFurusatoLimit / 10000).toFixed(1);
        updateCalculations();
      });
    }

    // 导出与打印
    const btnExport = document.getElementById('btn-export-csv');
    if (btnExport) btnExport.addEventListener('click', exportCSV);

    const btnPrint = document.getElementById('btn-print');
    if (btnPrint) btnPrint.addEventListener('click', () => window.print());

    // 主题切换按钮
    const themeBtn = document.querySelector('.theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const target = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', target);
        document.documentElement.style.colorScheme = target;
        try {
          localStorage.setItem('japan_tax_theme', target);
          localStorage.setItem('japan_mortgage_theme', target);
        } catch (e) {}
        updateCalculations();
      });
    }

    // 语言变更广播监听
    window.addEventListener('tax-lang-changed', () => {
      updateCalculations();
    });
  }

  /* ============================================================================ */
  /* 6. INIT BOOTSTRAP (应用加载与初始化入口)                                     */
  /* ============================================================================ */

  /**
   * 从 config.js 及 URL 参数加载初始默认值
   */
  function loadConfigDefaults() {
    const cfg = window.TAX_CONFIG || {};
    const reg = cfg.region || {};
    const profile = cfg.defaultProfile || {};
    const ins = cfg.defaultInsuranceDeductions || {};
    const mort = cfg.defaultMortgage || {};
    const furusato = cfg.defaultFurusato || {};

    if (reg.prefecture) {
      const el = document.getElementById('select-region');
      if (el) el.value = reg.prefecture;
    }

    if (profile.grossAnnualIncomeMan !== undefined) {
      const el = document.getElementById('input-income');
      if (el) el.value = profile.grossAnnualIncomeMan;
    }
    if (profile.ageOver40 !== undefined) {
      const el = document.getElementById('input-age-40');
      if (el) el.checked = profile.ageOver40;
    }
    if (profile.socialInsuranceMode) {
      const r = document.querySelector(`input[name="si-mode"][value="${profile.socialInsuranceMode}"]`);
      if (r) r.checked = true;
      const wrap = document.getElementById('wrap-manual-si');
      if (wrap) wrap.style.display = profile.socialInsuranceMode === 'manual' ? 'block' : 'none';
    }
    if (profile.manualSocialInsuranceMan) {
      const el = document.getElementById('input-manual-si');
      if (el) el.value = profile.manualSocialInsuranceMan;
    }
    if (profile.spouseStatus) {
      const el = document.getElementById('select-spouse');
      if (el) el.value = profile.spouseStatus;
    }
    if (profile.dependents16to18 !== undefined) {
      const el = document.getElementById('input-dep-1618');
      if (el) el.value = profile.dependents16to18;
    }
    if (profile.dependents19to22 !== undefined) {
      const el = document.getElementById('input-dep-1922');
      if (el) el.value = profile.dependents19to22;
    }
    if (profile.dependentsElderly !== undefined) {
      const el = document.getElementById('input-dep-elder');
      if (el) el.value = profile.dependentsElderly;
    }
    if (profile.idecoAnnualMan !== undefined) {
      const el = document.getElementById('input-ideco');
      if (el) el.value = profile.idecoAnnualMan;
    }

    // 商业保险
    if (ins.lifeInsuranceGeneralMan !== undefined) {
      const el = document.getElementById('input-life-general');
      if (el) el.value = ins.lifeInsuranceGeneralMan;
    }
    if (ins.lifeInsuranceMedicalMan !== undefined) {
      const el = document.getElementById('input-life-medical');
      if (el) el.value = ins.lifeInsuranceMedicalMan;
    }
    if (ins.lifeInsuranceAnnuityMan !== undefined) {
      const el = document.getElementById('input-life-annuity');
      if (el) el.value = ins.lifeInsuranceAnnuityMan;
    }
    if (ins.earthquakeInsuranceMan !== undefined) {
      const el = document.getElementById('input-eq-ins');
      if (el) el.value = ins.earthquakeInsuranceMan;
    }

    // 房贷
    if (mort.enabled !== undefined) {
      const el = document.getElementById('input-enable-mortgage');
      if (el) el.checked = mort.enabled;
      const fields = document.getElementById('mortgage-details-fields');
      if (fields) fields.style.display = mort.enabled ? 'block' : 'none';
    }
    if (mort.balanceMan !== undefined) {
      const el = document.getElementById('input-mortgage-balance');
      if (el) el.value = mort.balanceMan;
    }
    if (mort.deductionRate !== undefined) {
      const el = document.getElementById('input-deduction-rate');
      if (el) el.value = mort.deductionRate;
    }
    if (mort.houseType) {
      const el = document.getElementById('select-house-type');
      if (el) el.value = mort.houseType;
      const wrap = document.getElementById('wrap-custom-limit');
      if (wrap) wrap.style.display = mort.houseType === 'custom' ? 'block' : 'none';
    }
    if (mort.customLimitMan) {
      const el = document.getElementById('input-custom-limit');
      if (el) el.value = mort.customLimitMan;
    }
    if (mort.moveInYear) {
      const el = document.getElementById('select-move-in-year');
      if (el) el.value = mort.moveInYear;
    }

    // 故乡税
    if (furusato.preferredMethod) {
      const r = document.querySelector(`input[name="furusato-method"][value="${furusato.preferredMethod}"]`);
      if (r) r.checked = true;
    }
    if (furusato.plannedDonationMan !== undefined) {
      const el = document.getElementById('input-furusato-planned');
      if (el) el.value = furusato.plannedDonationMan;
    }

    // 跨页面 URL 查询参数解析 (例如: ?mortgage=3500&income=800)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('mortgage')) {
        const mVal = parseFloat(urlParams.get('mortgage'));
        if (!isNaN(mVal) && mVal > 0) {
          const mInput = document.getElementById('input-mortgage-balance');
          if (mInput) mInput.value = mVal;
          const mToggle = document.getElementById('input-enable-mortgage');
          if (mToggle) mToggle.checked = true;
          const fields = document.getElementById('mortgage-details-fields');
          if (fields) fields.style.display = 'block';
        }
      }
      if (urlParams.has('income')) {
        const incVal = parseFloat(urlParams.get('income'));
        if (!isNaN(incVal) && incVal > 0) {
          const incInput = document.getElementById('input-income');
          if (incInput) incInput.value = incVal;
        }
      }
    } catch (e) {}
  }

  function init() {
    loadConfigDefaults();
    renderChips();
    bindEvents();
    updateCalculations();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露调试对象
  window.TaxApp = {
    getFormData,
    updateCalculations
  };

})(window);
