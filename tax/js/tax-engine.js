/**
 * ==============================================================================
 * 日本正社員税金計算・住宅ローン減税・ふるさと納税 核心算法引擎 (tax-engine.js)
 * 【神奈川県标准专版 · 協会けんぽ神奈川支部 & 水源環境保全税 对应】
 * ==============================================================================
 * 
 * 依据日本与神奈川県最新税法及社保标准（令和6年度/2024~2026年适用）：
 * 1. 給与所得控除 (令和2年改正后标准)
 * 2. 協会けんぽ 神奈川支部：健康保険料率 10.02% (折半 5.01%), 介護保険 1.60% (折半 0.80%)
 * 3. 商業保険料控除 (新制生命保険料控除：一般・介護医療・個人年金 各自階梯 + 地震保険料控除)
 * 4. 神奈川県特有の超過課税「水源環境保全税」：
 *    - 住民税所得割：通常10.0% -> 神奈川県 10.025% (+0.025%)
 *    - 住民税均等割：通常5,000円 -> 神奈川県 5,300円 (県民税超过课税+300円，横滨市加征横滨绿税900円为6,200円)
 * 5. 所得税 (累進税率 5%~45% + 復興特別所得税 2.1%)
 * 6. 住宅借入金等特別控除 (住宅ローン減税：所得税优先抵扣 + 翌年住民税转嫁上限 97,500円)
 * 7. ふるさと納税限度額 (自负2,000円上限额，精准适配神奈川 10.025% 税率)
 * 8. ワンストップ特例 vs 確定申告 联动推演 & 商业保险控除对到手收入(手取り)的精确贡献
 */

(function(window) {
  'use strict';

  const TaxEngine = {
    // --------------------------------------------------------------------------
    // 1. 給与所得控除 计算
    // --------------------------------------------------------------------------
    calcEmploymentIncomeDeduction(grossIncome) {
      if (grossIncome <= 0) return 0;
      if (grossIncome <= 550000) return grossIncome;
      if (grossIncome <= 1625000) return 550000;
      if (grossIncome <= 1800000) return Math.floor(grossIncome * 0.40 - 100000);
      if (grossIncome <= 3600000) return Math.floor(grossIncome * 0.30 + 80000);
      if (grossIncome <= 6600000) return Math.floor(grossIncome * 0.20 + 440000);
      if (grossIncome <= 8500000) return Math.floor(grossIncome * 0.10 + 1100000);
      return 1950000; // 上限 195 万円
    },

    // --------------------------------------------------------------------------
    // 2. 社会保険料 估算 (全国健康保険協会 協会けんぽ 神奈川支部 令和6年度标准)
    // --------------------------------------------------------------------------
    estimateSocialInsurance(grossIncome, isOver40) {
      if (grossIncome <= 0) {
        return { total: 0, health: 0, pension: 0, employment: 0, nursing: 0 };
      }

      // 神奈川支部 健康保険料率: 10.02% -> 员工个人承担 5.01%
      // 标准报酬月额上限 139万 (年额约 1668万)
      const healthIncomeBase = Math.min(grossIncome, 16680000);
      const health = Math.round(healthIncomeBase * 0.0501);

      // 厚生年金：全国统一 18.30% -> 员工个人承担 9.15%
      // 标准报酬月额上限 65万 (年薪+奖金上限约 980万)
      const pensionIncomeBase = Math.min(grossIncome, 9800000);
      const pension = Math.round(pensionIncomeBase * 0.0915);

      // 雇佣保险：一般事业员工个人承担 0.60%
      const employment = Math.round(grossIncome * 0.0060);

      // 介护保险 (40岁~64岁)：全国统一 1.60% -> 员工个人承担 0.80%
      const nursing = isOver40 ? Math.round(healthIncomeBase * 0.0080) : 0;

      const total = health + pension + employment + nursing;

      return {
        total,
        health,
        pension,
        employment,
        nursing,
        rates: {
          healthRateStr: '5.01% (神奈川支部)',
          pensionRateStr: '9.15%',
          employmentRateStr: '0.60%',
          nursingRateStr: isOver40 ? '0.80%' : '0%'
        }
      };
    },

    // --------------------------------------------------------------------------
    // 3. 基礎控除 计算
    // --------------------------------------------------------------------------
    calcBasicDeduction(totalIncome) {
      if (totalIncome <= 24000000) {
        return { incomeTax: 480000, residentTax: 430000, humanDiff: 50000 };
      } else if (totalIncome <= 24500000) {
        return { incomeTax: 320000, residentTax: 290000, humanDiff: 30000 };
      } else if (totalIncome <= 25000000) {
        return { incomeTax: 160000, residentTax: 150000, humanDiff: 10000 };
      }
      return { incomeTax: 0, residentTax: 0, humanDiff: 0 };
    },

    // --------------------------------------------------------------------------
    // 4. 配偶者控除 / 配偶者特別控除
    // --------------------------------------------------------------------------
    calcSpouseDeduction(taxpayerIncome, spouseStatus) {
      if (taxpayerIncome > 10000000 || spouseStatus === 'none' || spouseStatus === 'independent') {
        return { incomeTax: 0, residentTax: 0, humanDiff: 0 };
      }

      if (taxpayerIncome <= 9000000) {
        if (spouseStatus === 'dependent') {
          return { incomeTax: 380000, residentTax: 330000, humanDiff: 50000 };
        } else if (spouseStatus === 'part_time') {
          return { incomeTax: 210000, residentTax: 210000, humanDiff: 0 };
        }
      } else if (taxpayerIncome <= 9500000) {
        if (spouseStatus === 'dependent') {
          return { incomeTax: 260000, residentTax: 220000, humanDiff: 40000 };
        }
      } else if (taxpayerIncome <= 10000000) {
        if (spouseStatus === 'dependent') {
          return { incomeTax: 130000, residentTax: 110000, humanDiff: 20000 };
        }
      }

      return { incomeTax: 0, residentTax: 0, humanDiff: 0 };
    },

    // --------------------------------------------------------------------------
    // 5. 扶養控除 计算 (16岁以上亲属)
    // --------------------------------------------------------------------------
    calcDependentDeduction(dependents16to18, dependents19to22, dependentsElderly) {
      const genCount = Math.max(0, parseInt(dependents16to18 || 0, 10));
      const specCount = Math.max(0, parseInt(dependents19to22 || 0, 10));
      const elderCount = Math.max(0, parseInt(dependentsElderly || 0, 10));

      const incomeTax = genCount * 380000 + specCount * 630000 + elderCount * 580000;
      const residentTax = genCount * 330000 + specCount * 450000 + elderCount * 450000;
      const humanDiff = genCount * 50000 + specCount * 180000 + elderCount * 130000;

      return { incomeTax, residentTax, humanDiff };
    },

    // --------------------------------------------------------------------------
    // 6. 新制生命保険料控除 (三项独立阶梯测算)
    //    ① 一般生命保険料 / ② 介護医療保険料 / ③ 個人年金保険料
    // --------------------------------------------------------------------------
    calcSingleLifeInsuranceCategory(premium) {
      if (premium <= 0) return { it: 0, rt: 0 };

      // 所得税控除额 (最高 40,000 円)
      let it = 0;
      if (premium <= 20000) {
        it = premium;
      } else if (premium <= 40000) {
        it = Math.floor(premium * 0.5 + 10000);
      } else if (premium <= 80000) {
        it = Math.floor(premium * 0.25 + 20000);
      } else {
        it = 40000;
      }

      // 住民税控除额 (最高 28,000 円)
      let rt = 0;
      if (premium <= 12000) {
        rt = premium;
      } else if (premium <= 32000) {
        rt = Math.floor(premium * 0.5 + 6000);
      } else if (premium <= 56000) {
        rt = Math.floor(premium * 0.25 + 14000);
      } else {
        rt = 28000;
      }

      return { it, rt };
    },

    calcFullLifeInsuranceDeduction(generalPrem, medicalPrem, annuityPrem) {
      const g = this.calcSingleLifeInsuranceCategory(generalPrem);
      const m = this.calcSingleLifeInsuranceCategory(medicalPrem);
      const a = this.calcSingleLifeInsuranceCategory(annuityPrem);

      // 所得税合计上限：120,000 円 (4万 × 3)
      const rawIT = g.it + m.it + a.it;
      const itTotal = Math.min(120000, rawIT);

      // 住民税合计上限：法定封顶 70,000 円 (即使 2.8万 × 3 = 8.4万，税法上限仍为 70,000 円)
      const rawRT = g.rt + m.rt + a.rt;
      const rtTotal = Math.min(70000, rawRT);

      return {
        general: { premium: generalPrem, incomeTax: g.it, residentTax: g.rt },
        medical: { premium: medicalPrem, incomeTax: m.it, residentTax: m.rt },
        annuity: { premium: annuityPrem, incomeTax: a.it, residentTax: a.rt },
        incomeTaxTotal: itTotal,
        residentTaxTotal: rtTotal,
        totalPremiumsPaid: generalPrem + medicalPrem + annuityPrem
      };
    },

    // --------------------------------------------------------------------------
    // 7. 地震保険料控除
    // --------------------------------------------------------------------------
    calcEarthquakeInsuranceDeduction(premium) {
      if (premium <= 0) return { incomeTax: 0, residentTax: 0, premium: 0 };
      // 所得税：全额，最高 50,000 円
      const it = Math.min(50000, premium);
      // 住民税：50%，最高 25,000 円
      const rt = Math.min(25000, Math.floor(premium * 0.5));
      return { incomeTax: it, residentTax: rt, premium };
    },

    // --------------------------------------------------------------------------
    // 8. 所得税税率表 (累进税率及速算控除)
    // --------------------------------------------------------------------------
    getIncomeTaxRateAndDeduction(taxableIncome) {
      if (taxableIncome <= 0) return { rate: 0, deduction: 0, label: '0%' };
      if (taxableIncome <= 1950000) return { rate: 0.05, deduction: 0, label: '5%' };
      if (taxableIncome <= 3300000) return { rate: 0.10, deduction: 97500, label: '10%' };
      if (taxableIncome <= 6950000) return { rate: 0.20, deduction: 427500, label: '20%' };
      if (taxableIncome <= 9000000) return { rate: 0.23, deduction: 636000, label: '23%' };
      if (taxableIncome <= 18000000) return { rate: 0.33, deduction: 1536000, label: '33%' };
      if (taxableIncome <= 40000000) return { rate: 0.40, deduction: 2796000, label: '40%' };
      return { rate: 0.45, deduction: 4796000, label: '45%' };
    },

    calcRawIncomeTax(taxableIncome) {
      if (taxableIncome <= 0) return 0;
      const bracket = this.getIncomeTaxRateAndDeduction(taxableIncome);
      const raw = Math.floor(taxableIncome * bracket.rate - bracket.deduction);
      return Math.max(0, raw);
    },

    // --------------------------------------------------------------------------
    // 9. 住民税调整控除 (調整控除)
    // --------------------------------------------------------------------------
    calcAdjustmentDeduction(residentTaxableIncome, totalHumanDiff) {
      if (residentTaxableIncome <= 0 || totalHumanDiff <= 0) return 0;
      if (residentTaxableIncome <= 2000000) {
        return Math.floor(Math.min(totalHumanDiff, residentTaxableIncome) * 0.05);
      } else {
        const excess = residentTaxableIncome - 2000000;
        const diffAfterExcess = totalHumanDiff - excess;
        return Math.floor(Math.max(2500, diffAfterExcess * 0.05));
      }
    },

    // --------------------------------------------------------------------------
    // 10. 住宅借入金等特別控除 限额与推演
    // --------------------------------------------------------------------------
    getMortgageBorrowingLimit(houseType, customLimit) {
      if (houseType === 'custom') {
        return (customLimit || 4000) * 10000;
      }
      switch (houseType) {
        case 'certified':
          return 45000000;
        case 'zeh':
          return 35000000;
        case 'energy_saving':
          return 30000000;
        case 'general':
          return 20000000;
        default:
          return 40000000;
      }
    },

    simulateMortgageDeduction(options) {
      const {
        mortgageBalanceYen,
        borrowingLimitYen,
        deductionRate = 0.007,
        totalIncomeYen,
        incomeTaxBeforeDeduction,
        incomeTaxableIncome,
        residentTaxIncomeLevyBeforeDeduction,
        moveInYear = 2024
      } = options;

      if (totalIncomeYen > 20000000 || mortgageBalanceYen <= 0) {
        return {
          applicableBalance: 0,
          maxDeduction: 0,
          incomeTaxDeducted: 0,
          residentTaxDeducted: 0,
          totalDeducted: 0,
          wastedDeduction: 0,
          residentTaxCap: 0,
          isEligible: totalIncomeYen <= 20000000
        };
      }

      const applicableBalance = Math.min(mortgageBalanceYen, borrowingLimitYen);
      const maxDeduction = Math.floor(applicableBalance * deductionRate);

      // 第一步：当年所得税抵扣
      const incomeTaxDeducted = Math.min(incomeTaxBeforeDeduction, maxDeduction);
      const remainingAfterIncomeTax = maxDeduction - incomeTaxDeducted;

      // 第二步：转入翌年住民税抵扣 (现行2022年起入居为课税所得5%或最高97,500円)
      let residentTaxCapRate = moveInYear >= 2022 ? 0.05 : 0.07;
      let residentTaxCapMax = moveInYear >= 2022 ? 97500 : 136500;
      const residentTaxCap = Math.min(Math.floor(incomeTaxableIncome * residentTaxCapRate), residentTaxCapMax);

      const residentTaxDeducted = Math.min(
        remainingAfterIncomeTax,
        residentTaxIncomeLevyBeforeDeduction,
        residentTaxCap
      );

      const totalDeducted = incomeTaxDeducted + residentTaxDeducted;
      const wastedDeduction = maxDeduction - totalDeducted;

      return {
        applicableBalance,
        maxDeduction,
        incomeTaxDeducted,
        residentTaxDeducted,
        totalDeducted,
        wastedDeduction,
        residentTaxCap,
        isEligible: true
      };
    },

    // --------------------------------------------------------------------------
    // 11. ふるさと納税 上限额精准公式 (适配神奈川 10.025% 所得割税率)
    // --------------------------------------------------------------------------
    calcFurusatoLimit(residentTaxIncomeLevyAdjusted, incomeTaxRate, residentTaxRate = 0.10025) {
      if (residentTaxIncomeLevyAdjusted <= 0) return 2000;
      // 住民税特例分上限 = 住民税所得割額(調整控除後) × 20%
      // 上限額 = (住民税所得割額 × 0.20) / (1.00 - 神奈川住民税率 - 所得税率 × 1.021) + 2,000円
      const denominator = (1.00 - residentTaxRate) - (incomeTaxRate * 1.021);
      if (denominator <= 0) return 2000;

      const limit = Math.floor((residentTaxIncomeLevyAdjusted * 0.20) / denominator) + 2000;
      return Math.max(2000, Math.floor(limit / 100) * 100);
    },

    // --------------------------------------------------------------------------
    // 12. 综合主计算引擎 (Main Calculation Flow)
    // --------------------------------------------------------------------------
    calculateAll(input) {
      const grossIncome = Math.max(0, Math.round((parseFloat(input.grossAnnualIncomeMan) || 0) * 10000));
      const isOver40 = !!input.ageOver40;

      // 神奈川県税率与均等割设定
      const isYokohama = input.regionPrefecture === 'yokohama';
      // 神奈川县所得割率：10.025% (県民税4.025% 含水源环境税0.025% + 市町村民税6.0%)
      const residentTaxRate = 0.10025;
      // 均等割：神奈川一般市町村 5,300円 (県1300+市3000+森林1000)；横浜市 6,200円 (含横滨绿税900)
      const residentPerCapitaLevy = isYokohama ? 6200 : 5300;

      // 1. 給与所得控除与给与所得
      const employmentDeduction = this.calcEmploymentIncomeDeduction(grossIncome);
      const employmentIncome = Math.max(0, grossIncome - employmentDeduction);

      // 2. 社会保险料 (神奈川支部 10.02% 费率)
      let socialInsurance = { total: 0, health: 0, pension: 0, employment: 0, nursing: 0 };
      if (input.socialInsuranceMode === 'manual') {
        const manualVal = Math.round((parseFloat(input.manualSocialInsuranceMan) || 0) * 10000);
        socialInsurance.total = manualVal;
      } else {
        socialInsurance = this.estimateSocialInsurance(grossIncome, isOver40);
      }

      // 3. 基础、配偶、抚养控除
      const basicDed = this.calcBasicDeduction(employmentIncome);
      const spouseDed = this.calcSpouseDeduction(employmentIncome, input.spouseStatus);
      const dependentDed = this.calcDependentDeduction(
        input.dependents16to18,
        input.dependents19to22,
        input.dependentsElderly
      );

      // 4. iDeCo 控除
      const idecoYen = Math.round((parseFloat(input.idecoAnnualMan) || 0) * 10000);

      // 5. 商业保险料控除 (新制生命保险三细分 + 地震保险)
      const generalPrem = Math.round((parseFloat(input.lifeInsuranceGeneralMan) || 0) * 10000);
      const medicalPrem = Math.round((parseFloat(input.lifeInsuranceMedicalMan) || 0) * 10000);
      const annuityPrem = Math.round((parseFloat(input.lifeInsuranceAnnuityMan) || 0) * 10000);
      const eqPrem = Math.round((parseFloat(input.earthquakeInsuranceMan) || 0) * 10000);

      const lifeDed = this.calcFullLifeInsuranceDeduction(generalPrem, medicalPrem, annuityPrem);
      const eqDed = this.calcEarthquakeInsuranceDeduction(eqPrem);

      // 商业保险保费实付合计 (Out-of-pocket premium expense)
      const totalCommercialPremiumsPaid = lifeDed.totalPremiumsPaid + eqDed.premium;

      // 所得税所得控除合计
      const incomeTaxDeductionsTotal =
        socialInsurance.total +
        basicDed.incomeTax +
        spouseDed.incomeTax +
        dependentDed.incomeTax +
        idecoYen +
        lifeDed.incomeTaxTotal +
        eqDed.incomeTax;

      // 住民税所得控除合计
      const residentTaxDeductionsTotal =
        socialInsurance.total +
        basicDed.residentTax +
        spouseDed.residentTax +
        dependentDed.residentTax +
        idecoYen +
        lifeDed.residentTaxTotal +
        eqDed.residentTax;

      // 人的控除差额
      const totalHumanDiff = basicDed.humanDiff + spouseDed.humanDiff + dependentDed.humanDiff;

      // 6. 课税所得金额 (千円未满舍去)
      const incomeTaxableIncome = Math.max(0, Math.floor((employmentIncome - incomeTaxDeductionsTotal) / 1000) * 1000);
      const residentTaxableIncome = Math.max(0, Math.floor((employmentIncome - residentTaxDeductionsTotal) / 1000) * 1000);

      // 7. 初始所得税 (税额控除前)
      const incomeTaxBracket = this.getIncomeTaxRateAndDeduction(incomeTaxableIncome);
      const rawIncomeTax = this.calcRawIncomeTax(incomeTaxableIncome);

      // 8. 初始住民税 (按神奈川 10.025% 超过课税计算)
      const rawResidentIncomeLevy = Math.floor(residentTaxableIncome * residentTaxRate);
      const adjustmentDeduction = this.calcAdjustmentDeduction(residentTaxableIncome, totalHumanDiff);
      const adjustedResidentIncomeLevy = Math.max(0, rawResidentIncomeLevy - adjustmentDeduction);

      // 9. ふるさと納税 基准上限额 (神奈川所得割精准公式)
      const baseFurusatoLimit = this.calcFurusatoLimit(adjustedResidentIncomeLevy, incomeTaxBracket.rate, residentTaxRate);

      // 10. 住宅ローン減税 基准模拟
      const enableMortgage = !!input.enableMortgage;
      const mortgageBalanceYen = enableMortgage ? Math.round((parseFloat(input.mortgageBalanceMan) || 0) * 10000) : 0;
      const borrowingLimitYen = this.getMortgageBorrowingLimit(input.houseType, parseFloat(input.customLimitMan));
      const deductionRate = (parseFloat(input.deductionRate) || 0.7) / 100;
      const moveInYear = parseInt(input.moveInYear || 2024, 10);

      const baseMortgageSim = this.simulateMortgageDeduction({
        mortgageBalanceYen,
        borrowingLimitYen,
        deductionRate,
        totalIncomeYen: employmentIncome,
        incomeTaxBeforeDeduction: rawIncomeTax,
        incomeTaxableIncome,
        residentTaxIncomeLevyBeforeDeduction: adjustedResidentIncomeLevy,
        moveInYear
      });

      // 11. 故乡税联动分析 (One-Stop vs 確定申告)
      const plannedFurusatoDonation = Math.round((parseFloat(input.plannedFurusatoMan) || 0) * 10000);
      const actualDonation = plannedFurusatoDonation > 0 ? plannedFurusatoDonation : baseFurusatoLimit;

      // 11.A: One-Stop
      const onestopIncomeTaxDeducted = baseMortgageSim.incomeTaxDeducted;
      const onestopRemainingMortgage = baseMortgageSim.maxDeduction - onestopIncomeTaxDeducted;
      const onestopResidentTaxMortgageDeducted = Math.min(
        onestopRemainingMortgage,
        adjustedResidentIncomeLevy,
        baseMortgageSim.residentTaxCap
      );
      const onestopTotalMortgageDeducted = onestopIncomeTaxDeducted + onestopResidentTaxMortgageDeducted;
      const onestopWastedMortgage = baseMortgageSim.maxDeduction - onestopTotalMortgageDeducted;

      // 11.B: 確定申告
      const furusatoDeductionFromIncome = Math.max(0, actualDonation - 2000);
      const shinkokuNewIncomeTaxable = Math.max(0, Math.floor((incomeTaxableIncome - furusatoDeductionFromIncome) / 1000) * 1000);
      const shinkokuNewRawIncomeTax = this.calcRawIncomeTax(shinkokuNewIncomeTaxable);

      const shinkokuMortgageSim = this.simulateMortgageDeduction({
        mortgageBalanceYen,
        borrowingLimitYen,
        deductionRate,
        totalIncomeYen: employmentIncome,
        incomeTaxBeforeDeduction: shinkokuNewRawIncomeTax,
        incomeTaxableIncome: shinkokuNewIncomeTaxable,
        residentTaxIncomeLevyBeforeDeduction: adjustedResidentIncomeLevy,
        moveInYear
      });

      const mortgageLossFromShinkoku = Math.max(0, baseMortgageSim.totalDeducted - shinkokuMortgageSim.totalDeducted);

      let safeFurusatoLimitShinkoku = baseFurusatoLimit;
      if (enableMortgage && baseMortgageSim.maxDeduction > 0) {
        if (rawIncomeTax < baseMortgageSim.maxDeduction) {
          if (baseMortgageSim.residentTaxDeducted >= baseMortgageSim.residentTaxCap) {
            safeFurusatoLimitShinkoku = 2000;
          } else {
            const remainingCapRoom = baseMortgageSim.residentTaxCap - baseMortgageSim.residentTaxDeducted;
            const maxAllowableIncomeTaxDrop = Math.min(rawIncomeTax, remainingCapRoom);
            if (incomeTaxBracket.rate > 0) {
              const maxDonationRoom = Math.floor(maxAllowableIncomeTaxDrop / incomeTaxBracket.rate) + 2000;
              safeFurusatoLimitShinkoku = Math.min(baseFurusatoLimit, Math.max(2000, maxDonationRoom));
            }
          }
        } else {
          const margin = rawIncomeTax - baseMortgageSim.maxDeduction;
          if (incomeTaxBracket.rate > 0) {
            const totalBuffer = margin + baseMortgageSim.residentTaxCap;
            const totalMaxDonation = Math.floor(totalBuffer / incomeTaxBracket.rate) + 2000;
            safeFurusatoLimitShinkoku = Math.min(baseFurusatoLimit, Math.max(2000, totalMaxDonation));
          }
        }
      }

      // 12. 最终实缴税金
      const isOneStop = input.preferredMethod === 'onestop';
      const activeMortgage = isOneStop ? {
        incomeTaxDeducted: onestopIncomeTaxDeducted,
        residentTaxDeducted: onestopResidentTaxMortgageDeducted,
        totalDeducted: onestopTotalMortgageDeducted,
        wastedDeduction: onestopWastedMortgage
      } : {
        incomeTaxDeducted: shinkokuMortgageSim.incomeTaxDeducted,
        residentTaxDeducted: shinkokuMortgageSim.residentTaxDeducted,
        totalDeducted: shinkokuMortgageSim.totalDeducted,
        wastedDeduction: shinkokuMortgageSim.wastedDeduction
      };

      let finalNetIncomeTax = 0;
      let finalReconstructionTax = 0;
      let finalResidentTax = 0;

      if (isOneStop) {
        const baseIT = Math.max(0, rawIncomeTax - activeMortgage.incomeTaxDeducted);
        finalReconstructionTax = Math.floor(baseIT * 0.021);
        finalNetIncomeTax = baseIT + finalReconstructionTax;

        const furusatoResidentDeduction = Math.max(0, actualDonation - 2000);
        const netResidentIncomeLevy = Math.max(
          0,
          adjustedResidentIncomeLevy - activeMortgage.residentTaxDeducted - furusatoResidentDeduction
        );
        finalResidentTax = netResidentIncomeLevy + residentPerCapitaLevy;
      } else {
        const baseIT = Math.max(0, shinkokuNewRawIncomeTax - activeMortgage.incomeTaxDeducted);
        finalReconstructionTax = Math.floor(baseIT * 0.021);
        finalNetIncomeTax = baseIT + finalReconstructionTax;

        // 確定申告 下住民税控除合計 = 基本分 (10%) + 特例分 (90% - 所得税率 × 1.021)
        // 合计抵扣 = (寄附金 - 2000) × (1.00 - 所得税率 × 1.021)
        const furusatoResidentPortion = Math.max(0, actualDonation - 2000) * (1.00 - incomeTaxBracket.rate * 1.021);
        const netResidentIncomeLevy = Math.max(
          0,
          adjustedResidentIncomeLevy - activeMortgage.residentTaxDeducted - Math.floor(furusatoResidentPortion)
        );
        finalResidentTax = netResidentIncomeLevy + residentPerCapitaLevy;
      }

      // 13. 保险控除的精确节税额 (Tax Savings from Life & Earthquake Insurance)
      // 若不申报商业保险控除，税金会增加多少：
      const totalInsuranceITDed = lifeDed.incomeTaxTotal + eqDed.incomeTax;
      const totalInsuranceRTDed = lifeDed.residentTaxTotal + eqDed.residentTax;
      const insuranceIncomeTaxSaved = Math.floor(totalInsuranceITDed * incomeTaxBracket.rate * 1.021);
      const insuranceResidentTaxSaved = Math.floor(totalInsuranceRTDed * residentTaxRate);
      const totalInsuranceTaxSavings = insuranceIncomeTaxSaved + insuranceResidentTaxSaved;

      // 14. 到手收入 (手取り / Take-Home Pay) 的双层计算
      // 层级 A: 法定标准税后到手 (年收 - 社保 - 所得税 - 住民税，包含已享受保险控除减免的税负)
      const baseNetIncomeTax = Math.floor(Math.max(0, rawIncomeTax - baseMortgageSim.incomeTaxDeducted) * 1.021);
      const baseNetResidentTax = Math.max(0, adjustedResidentIncomeLevy - baseMortgageSim.residentTaxDeducted) + residentPerCapitaLevy;
      const standardTakeHomePay = Math.max(0, grossIncome - socialInsurance.total - baseNetIncomeTax - baseNetResidentTax);

      // 层级 B: 扣除商业保险实付保费后的实际净自由现金 (Net Cash after Insurance Premiums)
      const netCashTakeHomePay = Math.max(0, standardTakeHomePay - totalCommercialPremiumsPaid);

      // 若执行故乡税捐款后的手头现金流
      const actualTakeHomePay = Math.max(0, grossIncome - socialInsurance.total - finalNetIncomeTax - finalResidentTax - actualDonation - totalCommercialPremiumsPaid);
      const estimatedGiftValue = Math.floor(actualDonation * 0.30);
      const totalEconomicBenefit = actualTakeHomePay + estimatedGiftValue;

      return {
        region: {
          name: isYokohama ? '神奈川県 横浜市 (含横浜みどり税)' : '神奈川県 (含水源環境保全税超過課税)',
          prefecture: input.regionPrefecture,
          residentTaxRate: '10.025%',
          perCapitaLevy: residentPerCapitaLevy,
          healthRate: '5.01%'
        },
        grossIncome,
        employmentDeduction,
        employmentIncome,
        socialInsurance,
        basicDed,
        spouseDed,
        dependentDed,
        idecoYen,
        lifeDed,
        eqDed,
        totalCommercialPremiumsPaid,
        totalInsuranceITDed,
        totalInsuranceRTDed,
        insuranceIncomeTaxSaved,
        insuranceResidentTaxSaved,
        totalInsuranceTaxSavings,
        incomeTaxDeductionsTotal,
        residentTaxDeductionsTotal,
        totalHumanDiff,
        incomeTaxableIncome,
        residentTaxableIncome,
        incomeTaxBracket,
        rawIncomeTax,
        rawResidentIncomeLevy,
        adjustmentDeduction,
        adjustedResidentIncomeLevy,
        residentPerCapitaLevy,
        baseFurusatoLimit,
        baseMortgageSim,
        plannedFurusatoDonation,
        actualDonation,
        onestop: {
          mortgageDeducted: onestopTotalMortgageDeducted,
          incomeTaxDeducted: onestopIncomeTaxDeducted,
          residentTaxDeducted: onestopResidentTaxMortgageDeducted,
          wastedMortgage: onestopWastedMortgage
        },
        shinkoku: {
          mortgageSim: shinkokuMortgageSim,
          mortgageLossFromShinkoku,
          safeFurusatoLimitShinkoku
        },
        activeMortgage,
        finalNetIncomeTax,
        finalReconstructionTax,
        finalResidentTax,
        totalTaxes: finalNetIncomeTax + finalResidentTax,
        standardTakeHomePay,
        netCashTakeHomePay,
        actualTakeHomePay,
        estimatedGiftValue,
        totalEconomicBenefit,
        monthlyTakeHome: Math.floor(standardTakeHomePay / 12),
        monthlyNetCash: Math.floor(netCashTakeHomePay / 12),
        monthlyTakeHome16: Math.floor(standardTakeHomePay / 16)
      };
    }
  };

  window.TaxEngine = TaxEngine;
})(window);
