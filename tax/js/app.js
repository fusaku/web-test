/**
 * ==============================================================================
 * 日本正社員税金・住宅ローン控除・ふるさと納税シミュレーター
 * 交互控制器与图表渲染 (app.js) - 神奈川·横浜市标准版
 * ==============================================================================
 */

(function() {
  'use strict';

  // 全局图表实例
  let taxCompositionChart = null;
  let taxComparisonChart = null;

  // 工具函数：货币格式化
  function formatYen(num) {
    if (isNaN(num)) return '¥0';
    return '¥' + Math.round(num).toLocaleString('ja-JP');
  }

  function formatManYen(num) {
    if (isNaN(num)) return '0.0 万円';
    return (num / 10000).toFixed(1) + ' 万円';
  }

  // 1. 获取表单数据
  function getFormData() {
    const regionPrefecture = document.getElementById('select-region').value || 'yokohama';
    const grossAnnualIncomeMan = parseFloat(document.getElementById('input-income').value) || 0;
    const ageOver40 = document.getElementById('input-age-40').checked;
    const socialInsuranceMode = document.querySelector('input[name="si-mode"]:checked').value;
    const manualSocialInsuranceMan = parseFloat(document.getElementById('input-manual-si').value) || 0;

    const spouseStatus = document.getElementById('select-spouse').value;
    const dependents16to18 = parseInt(document.getElementById('input-dep-1618').value, 10) || 0;
    const dependents19to22 = parseInt(document.getElementById('input-dep-1922').value, 10) || 0;
    const dependentsElderly = parseInt(document.getElementById('input-dep-elder').value, 10) || 0;

    const idecoAnnualMan = parseFloat(document.getElementById('input-ideco').value) || 0;

    // 商业保险料
    const lifeInsuranceGeneralMan = parseFloat(document.getElementById('input-life-general').value) || 0;
    const lifeInsuranceMedicalMan = parseFloat(document.getElementById('input-life-medical').value) || 0;
    const lifeInsuranceAnnuityMan = parseFloat(document.getElementById('input-life-annuity').value) || 0;
    const earthquakeInsuranceMan = parseFloat(document.getElementById('input-eq-ins').value) || 0;

    // 房贷相关
    const enableMortgage = document.getElementById('input-enable-mortgage').checked;
    const mortgageBalanceMan = parseFloat(document.getElementById('input-mortgage-balance').value) || 0;
    const deductionRate = parseFloat(document.getElementById('input-deduction-rate').value) || 0.7;
    const houseType = document.getElementById('select-house-type').value;
    const customLimitMan = parseFloat(document.getElementById('input-custom-limit').value) || 4000;
    const moveInYear = parseInt(document.getElementById('select-move-in-year').value, 10) || 2024;

    // 故乡税
    const preferredMethod = document.querySelector('input[name="furusato-method"]:checked').value;
    const plannedFurusatoMan = parseFloat(document.getElementById('input-furusato-planned').value) || 0;

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

  // 2. 核心渲染主流程
  function updateCalculations() {
    const input = getFormData();
    const result = window.TaxEngine.calculateAll(input);

    // 2.1 渲染表头动态日元提示
    const incomeYen = result.grossIncome;
    document.getElementById('display-income-yen').textContent = formatYen(incomeYen);

    const mortYen = input.enableMortgage ? (input.mortgageBalanceMan * 10000) : 0;
    document.getElementById('display-mortgage-yen').textContent = formatYen(mortYen);

    // 2.2 地区标签动态展示
    const regionBadge = document.getElementById('region-summary-badge');
    if (regionBadge) {
      if (input.regionPrefecture === 'yokohama') {
        regionBadge.innerHTML = '📍 神奈川県横浜市 · 健保 5.01% · 住民税 10.025% (含水源税+横浜みどり税)';
      } else {
        regionBadge.innerHTML = '📍 神奈川県 (その他市町村) · 健保 5.01% · 住民税 10.025% (含水源税)';
      }
    }

    // 2.3 渲染 KPI 核心指标看板
    // KPI 1: 住房减税
    if (input.enableMortgage && result.baseMortgageSim.isEligible && result.baseMortgageSim.maxDeduction > 0) {
      document.getElementById('kpi-mortgage-val').textContent = formatYen(result.activeMortgage.totalDeducted);
      document.getElementById('kpi-mortgage-sub').innerHTML = 
        `理论减税上限 ${formatYen(result.baseMortgageSim.maxDeduction)} (所得税抵 ${formatYen(result.activeMortgage.incomeTaxDeducted)} + 住民税抵 ${formatYen(result.activeMortgage.residentTaxDeducted)})`;

      if (result.activeMortgage.wastedDeduction > 0) {
        document.getElementById('kpi-mortgage-badge').className = 'kpi-badge badge-red';
        document.getElementById('kpi-mortgage-badge').textContent = `⚠️ 未用尽浪费 ${formatYen(result.activeMortgage.wastedDeduction)}`;
      } else {
        document.getElementById('kpi-mortgage-badge').className = 'kpi-badge badge-green';
        document.getElementById('kpi-mortgage-badge').textContent = '✅ 减税全额拿满';
      }
    } else {
      document.getElementById('kpi-mortgage-val').textContent = '¥0';
      document.getElementById('kpi-mortgage-sub').textContent = input.enableMortgage ? '所得超2000万或余额为0' : '未开启房贷减税';
      document.getElementById('kpi-mortgage-badge').className = 'kpi-badge badge-blue';
      document.getElementById('kpi-mortgage-badge').textContent = '无减免';
    }

    // KPI 2: 故乡税上限
    document.getElementById('kpi-furusato-val').textContent = formatYen(result.baseFurusatoLimit);
    document.getElementById('kpi-furusato-sub').innerHTML = 
      `实际个人自负仅 <strong>¥2,000</strong> · 约获返礼品价值 <strong>${formatYen(Math.floor(result.baseFurusatoLimit * 0.3))}</strong>`;

    // KPI 3: 手到手年收入 (手取り) - 包含商业保险扣除与自由现金流
    document.getElementById('kpi-takehome-val').textContent = formatYen(result.standardTakeHomePay);
    let takeHomeSubHtml = `月均到手约 <strong>${formatYen(result.monthlyTakeHome)}</strong>`;
    if (result.totalCommercialPremiumsPaid > 0) {
      takeHomeSubHtml += ` · 扣除商业保费(${formatYen(result.totalCommercialPremiumsPaid)})后净现金 <strong>${formatYen(result.netCashTakeHomePay)}</strong>`;
    }
    document.getElementById('kpi-takehome-sub').innerHTML = takeHomeSubHtml;

    // KPI 4: 每年社保与税金合计
    const totalTaxAndSocial = result.socialInsurance.total + result.totalTaxes;
    document.getElementById('kpi-taxes-val').textContent = formatYen(totalTaxAndSocial);
    document.getElementById('kpi-taxes-sub').innerHTML = 
      `社保 ${formatYen(result.socialInsurance.total)} · 所得税 ${formatYen(result.finalNetIncomeTax)} · 住民税 ${formatYen(result.finalResidentTax)}`;

    // 2.4 保险控除实际节税大看板
    renderInsuranceDeductionSummary(result, input);

    // 2.5 住房减税三段式进度条
    renderMortgageProgressBar(result, input);

    // 2.6 One-Stop 特例 vs 確定申告 深度联动分析
    renderComparisonSection(result, input);

    // 2.7 故乡税购买筹码模拟器
    renderFurusatoPlanner(result, input);

    // 2.8 日本源泉徴収票字段对照表
    renderSourceTaxTable(result, input);

    // 2.9 渲染 Chart.js 图表
    renderCharts(result, input);
  }

  // 3. 保险控除节税看板
  function renderInsuranceDeductionSummary(result, input) {
    const life = result.lifeDed;
    const eq = result.eqDed;
    const box = document.getElementById('insurance-summary-box');
    if (!box) return;

    document.getElementById('ins-life-it-ded').textContent = formatYen(life.incomeTaxTotal);
    document.getElementById('ins-life-rt-ded').textContent = formatYen(life.residentTaxTotal);
    document.getElementById('ins-eq-it-ded').textContent = formatYen(eq.incomeTax);
    document.getElementById('ins-eq-rt-ded').textContent = formatYen(eq.residentTax);

    document.getElementById('ins-total-saved-val').textContent = `+${formatYen(result.totalInsuranceTaxSavings)}`;
    document.getElementById('ins-total-saved-sub').innerHTML = 
      `所得税减税 <strong>${formatYen(result.insuranceIncomeTaxSaved)}</strong> + 住民税减税 <strong>${formatYen(result.insuranceResidentTaxSaved)}</strong> (年末调整退税到账)`;
  }

  // 4. 房贷减税进度条
  function renderMortgageProgressBar(result, input) {
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
      document.getElementById('mortgage-bar-container').style.display = 'block';

      document.getElementById('mortgage-res-cap-text').textContent = 
        `前年课税所得5%或${input.moveInYear >= 2022 ? '97,500円' : '136,500円'}封顶，当前住民税转嫁上限为 ${formatYen(result.baseMortgageSim.residentTaxCap)}`;
    } else {
      document.getElementById('mortgage-bar-container').style.display = 'none';
    }
  }

  // 5. 渲染 One-Stop vs 確定申告 对比
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
    if (input.enableMortgage) {
      if (loss > 0) {
        alertBox.className = 'alert-box alert-warning';
        alertBox.innerHTML = `
          <span class="alert-icon">⚠️</span>
          <div>
            <strong>注意：確定申告会造成房贷减税损失约 ${formatYen(loss)}！</strong><br>
            原因：確定申告会将故乡税走所得税寄附金控除，减少所得税课税所得；房贷减税被挤入住民税时撞上了 <strong>${formatYen(result.baseMortgageSim.residentTaxCap)}</strong> 转移上限，多余减税额永久失效。<br>
            💡 <strong>实战避坑建议</strong>：若处于买房第 2 年及以后，<strong>强烈推荐选择ワンストップ特例 (One-Stop)</strong>，可 100% 拿满全部房贷减税！若属于买房第 1 年必须確定申告，建议故乡税控制在 <strong>${formatYen(safeLimit)}</strong> 以内以防亏损。
          </div>
        `;
      } else {
        alertBox.className = 'alert-box alert-success';
        alertBox.innerHTML = `
          <span class="alert-icon">🎉</span>
          <div>
            <strong>好消息：在此年收入和房贷余额下，两种申报模式均不会损失房贷减税！</strong><br>
            您的所得税与住民税额度充裕，故乡税扣减后依然有足够空间消化房贷减税。若入居第 1 年可放心进行確定申告。
          </div>
        `;
      }
    } else {
      alertBox.className = 'alert-box alert-info';
      alertBox.innerHTML = `
        <span class="alert-icon">ℹ️</span>
        <div>
          当前未启用房贷减税。ワンストップ特例与確定申告对故乡税的减免总额在数学上完全一致（均享受自己自负 2,000 円的上限福利）。
        </div>
      `;
    }
  }

  // 6. 渲染故乡税购买计划与经济实惠
  function renderFurusatoPlanner(result, input) {
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

  // 7. 渲染源泉征收票字段对照表 (全面加入保险控除项)
  function renderSourceTaxTable(result, input) {
    const tbody = document.getElementById('source-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td><strong>支払金額 (税前年收入)</strong><span class="source-ticket-tag">① 票面最左上</span></td>
        <td class="num">${formatYen(result.grossIncome)}</td>
        <td style="color:var(--text-muted);font-size:12px;">税前额面年收入总和</td>
      </tr>
      <tr>
        <td><strong>給与所得控除後の金額</strong><span class="source-ticket-tag">② 所得额</span></td>
        <td class="num">${formatYen(result.employmentIncome)}</td>
        <td style="color:var(--text-muted);font-size:12px;">扣除给与所得控除 (${formatYen(result.employmentDeduction)}) 后的金额</td>
      </tr>
      <tr>
        <td><strong>社会保険料等の金額</strong><span class="source-ticket-tag">社保控除</span></td>
        <td class="num">${formatYen(result.socialInsurance.total)}</td>
        <td style="color:var(--text-muted);font-size:12px;">健保 5.01% (神奈川支部) + 厚生年金 9.15% + 雇佣 0.6%</td>
      </tr>
      <tr>
        <td><strong>生命保険料の控除額</strong><span class="source-ticket-tag">新制三分类</span></td>
        <td class="num">${formatYen(result.lifeDed.incomeTaxTotal)}</td>
        <td style="color:var(--text-muted);font-size:12px;">一般 (${formatYen(result.lifeDed.general.incomeTax)}) + 医疗 (${formatYen(result.lifeDed.medical.incomeTax)}) + 年金 (${formatYen(result.lifeDed.annuity.incomeTax)})</td>
      </tr>
      <tr>
        <td><strong>地震保険料の控除額</strong><span class="source-ticket-tag">地震险</span></td>
        <td class="num">${formatYen(result.eqDed.incomeTax)}</td>
        <td style="color:var(--text-muted);font-size:12px;">最高 50,000 円 (实缴保费: ${formatYen(result.eqDed.premium)})</td>
      </tr>
      <tr>
        <td><strong>所得控除の額の合計額</strong><span class="source-ticket-tag">③ 控除合计</span></td>
        <td class="num">${formatYen(result.incomeTaxDeductionsTotal)}</td>
        <td style="color:var(--text-muted);font-size:12px;">社保 + 基础控除 (${formatYen(result.basicDed.incomeTax)}) + 保险控除 + 抚养/配偶等</td>
      </tr>
      <tr>
        <td><strong>課税給与所得金額</strong><span class="source-ticket-tag">千円未满舍去</span></td>
        <td class="num">${formatYen(result.incomeTaxableIncome)}</td>
        <td style="color:var(--text-muted);font-size:12px;">计算税率的基准 (边际所得税率: ${result.incomeTaxBracket.label})</td>
      </tr>
      <tr>
        <td><strong>算出所得税額 (减税前)</strong><span class="source-ticket-tag">税率速算后</span></td>
        <td class="num">${formatYen(result.rawIncomeTax)}</td>
        <td style="color:var(--text-muted);font-size:12px;">房贷减税抵扣前的原始所得税</td>
      </tr>
      <tr>
        <td><strong>住宅借入金等特別控除の額</strong><span class="source-ticket-tag">④ 房贷所得税抵扣</span></td>
        <td class="num" style="color:var(--success);">- ${formatYen(result.activeMortgage.incomeTaxDeducted)}</td>
        <td style="color:var(--text-muted);font-size:12px;">直接在所得税中抵扣的金额</td>
      </tr>
      <tr>
        <td><strong>源泉徴収税額 (最终实缴所得税)</strong><span class="source-ticket-tag">⑤ 年末最终税额</span></td>
        <td class="num" style="color:var(--primary);font-weight:700;">${formatYen(result.finalNetIncomeTax)}</td>
        <td style="color:var(--text-muted);font-size:12px;">含 2.1% 振兴特别所得税 (${formatYen(result.finalReconstructionTax)})</td>
      </tr>
      <tr style="background:var(--bg-subtle);">
        <td><strong>翌年度 住民税所得割 房贷抵扣</strong><span class="source-ticket-tag">横浜市住民税转嫁</span></td>
        <td class="num" style="color:var(--primary);">- ${formatYen(result.activeMortgage.residentTaxDeducted)}</td>
        <td style="color:var(--text-muted);font-size:12px;">翌年6月起冲抵 (上限: ${formatYen(result.baseMortgageSim.residentTaxCap)})</td>
      </tr>
      <tr style="background:var(--bg-subtle);">
        <td><strong>翌年度 住民税納付年額 (概算)</strong><span class="source-ticket-tag">横浜市 10.025%</span></td>
        <td class="num" style="font-weight:700;">${formatYen(result.finalResidentTax)}</td>
        <td style="color:var(--text-muted);font-size:12px;">含所得割 10.025% + 均等割等 ${formatYen(result.residentPerCapitaLevy)} (含水源税+横浜みどり税)</td>
      </tr>
    `;
  }

  // 8. 渲染图表
  function renderCharts(result, input) {
    if (typeof Chart === 'undefined') return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    // 图表 1: 收入流向与商业保费 (环形饼图)
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

      if (taxCompositionChart) {
        taxCompositionChart.data.datasets[0].data = compData;
        taxCompositionChart.update();
      } else {
        taxCompositionChart = new Chart(ctxComp, {
          type: 'doughnut',
          data: {
            labels: ['自由现金手取り', '商业保险保费', '社会保险费', '所得税', '横浜市民住民税', '故乡税捐款'],
            datasets: [{
              data: compData,
              backgroundColor: ['#0284c7', '#14b8a6', '#818cf8', '#10b981', '#f59e0b', '#ec4899'],
              borderWidth: 0
            }]
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

      const compareData = {
        labels: ['所得税', '横浜住民税', '二税合计'],
        datasets: [
          {
            label: '减税前原始税金',
            data: [rawIT, rawRT, rawIT + rawRT],
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.6)',
            borderRadius: 6
          },
          {
            label: '实际应缴税金 (享房贷+故乡税)',
            data: [afterIT, afterRT, afterIT + afterRT],
            backgroundColor: '#10b981',
            borderRadius: 6
          }
        ]
      };

      if (taxComparisonChart) {
        taxComparisonChart.data = compareData;
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
                  callback: val => '¥' + (val / 10000).toFixed(0) + '万'
                },
                grid: { color: gridColor }
              }
            }
          }
        });
      }
    }
  }

  // 9. 导出 CSV 报告
  function exportCSV() {
    const input = getFormData();
    const result = window.TaxEngine.calculateAll(input);

    const rows = [
      ['指标分类', '指标项目', '金额 (円/或说明)'],
      ['计算标准', '所在地区与税制标准', result.region.name],
      ['计算标准', '健康保险率 (協会けんぽ神奈川支部)', result.region.healthRate],
      ['计算标准', '住民税所得割率 (含水源税)', result.region.residentTaxRate],
      ['计算标准', '住民税均等割等年额 (含横滨绿税等)', result.region.perCapitaLevy],
      ['基本收入', '额面年收入 (支払金額)', result.grossIncome],
      ['基本收入', '给与所得控除额', result.employmentDeduction],
      ['基本收入', '给与所得金额', result.employmentIncome],
      ['社会保险', '社会保险料年额合计', result.socialInsurance.total],
      ['社会保险', '健康保险料估算 (5.01%)', result.socialInsurance.health],
      ['社会保险', '厚生年金估算 (9.15%)', result.socialInsurance.pension],
      ['社会保险', '雇佣保险估算 (0.60%)', result.socialInsurance.employment],
      ['社会保险', '介护保险估算 (0.80%)', result.socialInsurance.nursing],
      ['商业保险', '一般生命保险料实缴年额', result.lifeDed.general.premium],
      ['商业保险', '医疗介护保险料实缴年额', result.lifeDed.medical.premium],
      ['商业保险', '个人年金保险料实缴年额', result.lifeDed.annuity.premium],
      ['商业保险', '地震保险料实缴年额', result.eqDed.premium],
      ['商业保险控除', '所得税生命保险料控除额', result.lifeDed.incomeTaxTotal],
      ['商业保险控除', '住民税生命保险料控除额', result.lifeDed.residentTaxTotal],
      ['商业保险控除', '所得税地震保险料控除额', result.eqDed.incomeTax],
      ['商业保险控除', '住民税地震保险料控除额', result.eqDed.residentTax],
      ['商业保险控除', '商业保险控除年度节税额', result.totalInsuranceTaxSavings],
      ['所得税', '课税给与所得金额', result.incomeTaxableIncome],
      ['所得税', '原始算出所得税额', result.rawIncomeTax],
      ['所得税', '房贷所得税抵扣额', result.activeMortgage.incomeTaxDeducted],
      ['所得税', '最终应缴所得税(含复兴特别税)', result.finalNetIncomeTax],
      ['住民税', '课税住民税所得金额', result.residentTaxableIncome],
      ['住民税', '原始所得割额 (10.025%)', result.rawResidentIncomeLevy],
      ['住民税', '调整控除额', result.adjustmentDeduction],
      ['住民税', '房贷住民税转嫁抵扣额', result.activeMortgage.residentTaxDeducted],
      ['住民税', '最终应缴住民税', result.finalResidentTax],
      ['房贷减税', '年末贷款余额', input.enableMortgage ? (input.mortgageBalanceMan * 10000) : 0],
      ['房贷减税', '理论最大减税额度', result.baseMortgageSim.maxDeduction],
      ['房贷减税', '实际总减税额', result.activeMortgage.totalDeducted],
      ['房贷减税', '未能用尽失效金额', result.activeMortgage.wastedDeduction],
      ['故乡税', '実質負担2000円上限额', result.baseFurusatoLimit],
      ['故乡税', '计划购买捐款额', result.actualDonation],
      ['故乡税', '预计返礼品总价值(按30%)', result.estimatedGiftValue],
      ['实到手', '法定税后年到手金额(手取り)', result.standardTakeHomePay],
      ['实到手', '扣减商业保费后净自由现金', result.netCashTakeHomePay],
      ['实到手', '月均法定到手金额(12薪)', result.monthlyTakeHome],
      ['实到手', '月均净自由现金(12薪)', result.monthlyNetCash]
    ];

    let csvContent = '\uFEFF';
    rows.forEach(row => {
      csvContent += row.map(col => `"${String(col).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `横滨市正社员税金试算表_${input.grossAnnualIncomeMan}万年收.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 10. 填充 Quick Chips
  function renderChips() {
    const config = window.TAX_CONFIG || {};
    const incomes = (config.quickChips && config.quickChips.incomes) || [400, 500, 600, 700, 800, 900, 1000, 1200, 1500];
    const mortBalances = (config.quickChips && config.quickChips.mortgageBalances) || [2000, 2500, 3000, 3190, 3500, 4000, 5000];

    const incomeContainer = document.getElementById('chips-income-container');
    if (incomeContainer) {
      incomeContainer.innerHTML = '';
      incomes.forEach(inc => {
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
      mortBalances.forEach(bal => {
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

  function highlightChips(container, activeChip) {
    container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (activeChip) activeChip.classList.add('active');
  }

  // 11. 事件绑定
  function bindEvents() {
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(el => {
      el.addEventListener('input', updateCalculations);
      el.addEventListener('change', updateCalculations);
    });

    document.querySelectorAll('input[name="si-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isManual = radio.value === 'manual';
        document.getElementById('wrap-manual-si').style.display = isManual ? 'block' : 'none';
        updateCalculations();
      });
    });

    const mortToggle = document.getElementById('input-enable-mortgage');
    if (mortToggle) {
      mortToggle.addEventListener('change', () => {
        document.getElementById('mortgage-details-fields').style.display = mortToggle.checked ? 'block' : 'none';
        updateCalculations();
      });
    }

    const houseSelect = document.getElementById('select-house-type');
    if (houseSelect) {
      houseSelect.addEventListener('change', () => {
        document.getElementById('wrap-custom-limit').style.display = houseSelect.value === 'custom' ? 'block' : 'none';
        updateCalculations();
      });
    }

    const btnFillFurusato = document.getElementById('btn-fill-furusato-max');
    if (btnFillFurusato) {
      btnFillFurusato.addEventListener('click', () => {
        const input = getFormData();
        const res = window.TaxEngine.calculateAll(input);
        document.getElementById('input-furusato-planned').value = (res.baseFurusatoLimit / 10000).toFixed(1);
        updateCalculations();
      });
    }

    const btnExport = document.getElementById('btn-export-csv');
    if (btnExport) {
      btnExport.addEventListener('click', exportCSV);
    }

    const btnPrint = document.getElementById('btn-print');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => window.print());
    }

    const themeBtn = document.querySelector('.theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const target = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', target);
        document.documentElement.style.colorScheme = target;
        localStorage.setItem('japan_tax_theme', target);
        updateCalculations();
      });
    }
  }

  // 12. 加载 config.js 预设值
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
      document.getElementById('input-income').value = profile.grossAnnualIncomeMan;
    }
    if (profile.ageOver40 !== undefined) {
      document.getElementById('input-age-40').checked = profile.ageOver40;
    }
    if (profile.socialInsuranceMode) {
      const r = document.querySelector(`input[name="si-mode"][value="${profile.socialInsuranceMode}"]`);
      if (r) r.checked = true;
      document.getElementById('wrap-manual-si').style.display = profile.socialInsuranceMode === 'manual' ? 'block' : 'none';
    }
    if (profile.manualSocialInsuranceMan) {
      document.getElementById('input-manual-si').value = profile.manualSocialInsuranceMan;
    }
    if (profile.spouseStatus) {
      document.getElementById('select-spouse').value = profile.spouseStatus;
    }
    if (profile.dependents16to18 !== undefined) {
      document.getElementById('input-dep-1618').value = profile.dependents16to18;
    }
    if (profile.dependents19to22 !== undefined) {
      document.getElementById('input-dep-1922').value = profile.dependents19to22;
    }
    if (profile.dependentsElderly !== undefined) {
      document.getElementById('input-dep-elder').value = profile.dependentsElderly;
    }
    if (profile.idecoAnnualMan !== undefined) {
      document.getElementById('input-ideco').value = profile.idecoAnnualMan;
    }

    // 保险控除
    if (ins.lifeInsuranceGeneralMan !== undefined) {
      document.getElementById('input-life-general').value = ins.lifeInsuranceGeneralMan;
    }
    if (ins.lifeInsuranceMedicalMan !== undefined) {
      document.getElementById('input-life-medical').value = ins.lifeInsuranceMedicalMan;
    }
    if (ins.lifeInsuranceAnnuityMan !== undefined) {
      document.getElementById('input-life-annuity').value = ins.lifeInsuranceAnnuityMan;
    }
    if (ins.earthquakeInsuranceMan !== undefined) {
      document.getElementById('input-eq-ins').value = ins.earthquakeInsuranceMan;
    }

    // 房贷
    if (mort.enabled !== undefined) {
      document.getElementById('input-enable-mortgage').checked = mort.enabled;
      document.getElementById('mortgage-details-fields').style.display = mort.enabled ? 'block' : 'none';
    }
    if (mort.balanceMan !== undefined) {
      document.getElementById('input-mortgage-balance').value = mort.balanceMan;
    }
    if (mort.deductionRate !== undefined) {
      document.getElementById('input-deduction-rate').value = mort.deductionRate;
    }
    if (mort.houseType) {
      document.getElementById('select-house-type').value = mort.houseType;
      document.getElementById('wrap-custom-limit').style.display = mort.houseType === 'custom' ? 'block' : 'none';
    }
    if (mort.customLimitMan) {
      document.getElementById('input-custom-limit').value = mort.customLimitMan;
    }
    if (mort.moveInYear) {
      document.getElementById('select-move-in-year').value = mort.moveInYear;
    }

    // 故乡税
    if (furusato.preferredMethod) {
      const r = document.querySelector(`input[name="furusato-method"][value="${furusato.preferredMethod}"]`);
      if (r) r.checked = true;
    }
    if (furusato.plannedDonationMan !== undefined) {
      document.getElementById('input-furusato-planned').value = furusato.plannedDonationMan;
    }
  }

  // DOM 就绪入口
  window.addEventListener('DOMContentLoaded', () => {
    loadConfigDefaults();
    renderChips();
    bindEvents();
    updateCalculations();
  });

})();
