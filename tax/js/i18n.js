/**
 * ==============================================================================
 * 日本正社員税金計算器 - 多语言国际化系统 (tax/js/i18n.js)
 * 中日双语 (zh-CN / ja-JP) 完整翻译字典与动态切换控制器
 * ==============================================================================
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'japan_calc_lang';

  const dict = {
    'zh': {
      // 页面元信息
      'page_title': '税金・到手收入计算器 | 神奈川·横滨标准',
      'brand_title': '正社员税金·到手计算器',
      'brand_tag': '神奈川·横滨标准版',
      'brand_sub': '協会けんぽ神奈川支部 (5.01%) · 横浜市 住民税 (10.025% / 横浜みどり税) · 房贷减税 · 故乡税上限 · 保险控除',
      'nav_mortgage': '40年房贷计算器',
      'theme_btn': '外观',
      'lang_btn': '日本語',

      // 顶部标准横幅
      'region_yokohama_badge': '📍 <strong>神奈川県横浜市</strong> · 健保 5.01% · 住民税所得割 10.025% (含水源税+横浜みどり税)',
      'region_other_badge': '📍 <strong>神奈川県 (其他市町村)</strong> · 健保 5.01% · 住民税所得割 10.025% (含水源税)',
      'lbl_select_region': '切换地区标准：',
      'opt_yokohama': '神奈川県 横浜市 (均等割等 6,200円)',
      'opt_kanagawa_other': '神奈川県 その他市町村 (川崎市等 5,300円)',

      // 年收与社保
      'card_income_title': '💴 额面年收与社保 (給与条件)',
      'lbl_gross_income': '税前额面年收入 (支払金額)',
      'unit_man': '万円',
      'unit_year': '年',
      'lbl_age_40': '年满 40 岁 (介護保険対象)',
      'hint_age_40': '40~64岁加缴约 0.80% 介护保险料',
      'lbl_si_mode': '社会保险费估算方式',
      'si_mode_auto': '按神奈川支部标准估算 (约14.76%)',
      'si_mode_manual': '手动输入税单金额',
      'hint_manual_si': '填写源泉征收票上的「社会保険料等の金額」',

      // 商业保险料
      'card_insurance_title': '🛡️ 商业保险料控除 (新制三项+地震)',
      'badge_insurance_yearend': '年末调整真金节税',
      'desc_insurance': '正社员申报商业保费可享受所得税最高 <strong>12万</strong> + 住民税最高 <strong>7万</strong> 控除，有效提高到手现金：',
      'lbl_ins_general': '① 一般生命保险料 (死亡险/学资险)',
      'hint_ins_general': '年缴8万即拿满控除4万/2.8万',
      'lbl_ins_medical': '② 医疗介护保险料 (医疗险/癌症/重疾)',
      'hint_ins_medical': '最高控除所得税4万/住民2.8万',
      'lbl_ins_annuity': '③ 个人年金保险料 (商业养老定存年金)',
      'hint_ins_annuity': '最高控除所得税4万/住民2.8万',
      'lbl_ins_earthquake': '④ 地震保险料 (房屋火灾附带地震险)',
      'hint_ins_earthquake': '所得税最高5万/住民2.5万',

      // 人的控除
      'card_dependents_title': '👨‍👩‍👧 配偶与抚养亲属 (人的控除)',
      'lbl_spouse_status': '配偶者状况',
      'spouse_opt_none': '独身 / 无配偶',
      'spouse_opt_dep': '配偶专职主妇(夫) / 年收≤150万 (控除满额38万)',
      'spouse_opt_part': '配偶兼职年收 150~201万 (享部分控除)',
      'spouse_opt_indep': '配偶共计纳税 / 年收>201.6万 (无控除)',
      'lbl_dependents': '抚养亲属人数',
      'hint_dependents': '16岁以下由儿童手当覆盖不计',
      'lbl_dep_1618': '一般抚养(16~18岁)',
      'lbl_dep_1922': '特定抚养(19~22岁)',
      'lbl_dep_elder': '老人抚养(70岁以上同居)',
      'lbl_ideco': 'iDeCo / 确定拠出年金 年缴额',
      'hint_ideco': '全额所得控除',

      // 住宅减税
      'card_mortgage_title': '🏠 住宅借入金等特別控除 (房贷减税)',
      'lbl_mortgage_balance': '年末贷款余额 (借入残高)',
      'lbl_house_type': '房屋环保性能类别 (贷款上限)',
      'house_opt_energy': '省节能标准适配住宅 (上限 3,000~4,000万)',
      'house_opt_zeh': 'ZEH 水准省能住宅 (上限 3,500~4,500万)',
      'house_opt_cert': '认定长期优良/低碳住宅 (上限 4,500~5,000万)',
      'house_opt_gen': '一般其他住宅 (上限 2,000万)',
      'house_opt_custom': '自定义贷款上限额',
      'lbl_custom_limit': '自定义贷款上限额',
      'lbl_deduction_rate': '控除率',
      'ded_rate_07': '0.7% (2022年起现行)',
      'ded_rate_10': '1.0% (旧税制标准)',
      'lbl_movein_year': '入居年份',
      'movein_post2022': '2022年之后 (住民上限9.75万)',
      'movein_pre2022': '2021年之前 (住民上限13.65万)',

      // 故乡税
      'card_furusato_title': '🎁 ふるさと納税 购买规划',
      'lbl_furusato_mode': '申报抵扣制度选择',
      'hint_furusato_mode': '直接决定是否吃掉房贷减税',
      'furusato_onestop_title': 'ワンストップ特例 (One-Stop特例) · 推荐',
      'furusato_onestop_desc': '自治体≤5个，冲抵翌年横滨住民税，100%保全所得税房贷减税',
      'furusato_shinkoku_title': '確定申告 (买房第1年必须申告)',
      'furusato_shinkoku_desc': '冲减所得税，可能导致房贷减税被挤入住民税受9.75万上限卡死',
      'lbl_planned_furusato': '计划捐款金额 (寄附金額)',
      'btn_fill_furusato': '填入系统推荐上限 ⚡',
      'hint_furusato_zero': '输入 0 则默认按系统测算的上限额计算',

      // KPI 卡片
      'kpi_mortgage_title': '🏠 房贷减税实际减免',
      'kpi_furusato_title': '🎁 故乡税最佳上限额',
      'kpi_takehome_title': '💴 实到手年收入 (手取り)',
      'kpi_taxes_title': '📊 社保与实缴税金 (横浜)',
      'kpi_badge_full': '减税全额拿满',
      'kpi_badge_furusato_sub': '自负仅2,000円',
      'kpi_badge_takehome_sub': '税后可支配现金',
      'kpi_badge_taxes_sub': '年度扣除合计',

      // 保险看板
      'box_ins_savings_title': '🛡️ 商业保险料控除节税收益分析 (年末调整退税)',
      'ins_life_it_lbl': '生命保险 所得税控除额',
      'ins_life_rt_lbl': '生命保险 横滨住民税控除额',
      'ins_eq_it_lbl': '地震保险 所得税控除额',
      'ins_eq_rt_lbl': '地震保险 横滨住民税控除额',
      'max_12man': '(最高12万円)',
      'max_7man': '(最高7万円)',
      'max_5man': '(最高5万円)',
      'max_25man': '(最高2.5万円)',

      // 住宅减税进度条
      'card_mortgage_flow_title': '🏡 住宅ローン減税 抵扣进度与结构分析',
      'mortgage_flow_desc': '减税额按法定抵扣顺位消化：<strong>① 优先全额抵扣当年所得税</strong> → <strong>② 剩余部分转入翌年横滨住民税 (受9.75万法定上限限制)</strong> → <strong>③ 超出部分失效应额</strong>',
      'prog_lbl_it': '所得税直接抵扣：',
      'prog_lbl_rt': '翌年住民税转嫁抵扣：',
      'prog_lbl_waste': '未用尽浪费失效：',

      // One-Stop vs 確定申告 对比
      'card_compare_mode_title': '⚡ 故乡税申告方式对比：One-Stop 特例 vs 確定申告',
      'compare_mode_desc': '当同时拥有<strong>房贷减税</strong>与<strong>故乡税</strong>时，申报方式会直接影响所得税基数，进而影响房贷减税是否能被充分抵扣：',
      'badge_onestop_rec': '推荐 (买房第2年起)',
      'badge_shinkoku_req': '买房第1年必须办理',
      'desc_onestop': '适合自治体不超过5个的正社员。故乡税扣减全部在翌年横滨住民税中体现，完全不干扰所得税。',
      'desc_shinkoku': '故乡税走所得税寄附金控除，先扣减所得税所得，导致算出所得税下降，房贷减税可能被溢出挤压。',
      'row_lbl_mort_got': '房贷减税实际到手：',
      'row_lbl_fur_got': '故乡税实际减免税额：',
      'row_lbl_mort_waste': '房贷减税浪费失效额：',

      // 故乡税收益计划
      'card_furusato_plan_title': '🎁 故乡税购买计划与经济实惠测算',
      'lbl_plan_donation': '计划寄附金额',
      'lbl_plan_self_burden': '个人实际出资',
      'lbl_plan_tax_cut': '抵扣所得税/住民税',
      'lbl_plan_gift': '返礼品估算价值 (30%)',
      'lbl_plan_net_gain': '综合节税净收益',

      // 图表与源泉票
      'card_charts_title': '📊 数据可视化：税费构成与减税对比',
      'chart_title_comp': '收入流向与商业保费 (自由现金·保费·社保·税金)',
      'chart_title_compare': '减税前后实缴税金对比 (房贷减税+故乡税成效)',
      'card_ticket_title': '📄 源泉徴収票（日本年末调整税单）字段对照表',
      'hint_ticket': '包含商业保险料控除、房贷所得税抵扣与横滨住民税',
      'th_ticket_field': '票面指标名称 (源泉徴収票の項目)',
      'th_ticket_amount': '金额',
      'th_ticket_desc': '字段说明与税法依据',
      'btn_export_csv': '💾 导出 CSV 详细报表',
      'btn_print': '🖨️ 打印 / 保存 PDF 报告',
      'table_scroll_hint': '👈 可左右滑动查看完整明细表格 👉',

      // 页脚
      'footer_text': '日本正社員税金計算器 · 神奈川県横浜市标准对应 · 纯前端离线运行 · 数据安全不上传服务器',
      'footer_mort_link': '40年房贷模拟器',
      'footer_doc_link': '使用手册 & 税法原理',

      // 动态提示与看板模板
      'kpi_mortgage_sub_tpl': '理论减税上限 {max} (所得税抵 {it} + 住民税抵 {rt})',
      'kpi_mortgage_waste_badge': '⚠️ 未用尽浪费 {waste}',
      'kpi_mortgage_full_badge': '✅ 减税全额拿满',
      'kpi_mortgage_fallback_high': '所得超2000万或余额为0',
      'kpi_mortgage_fallback_none': '未开启房贷减税',
      'kpi_mortgage_badge_none': '无减免',
      'kpi_furusato_sub_tpl': '实际个人自负仅 <strong>¥2,000</strong> · 约获返礼品价值 <strong>{gift}</strong>',
      'kpi_takehome_sub_tpl': '月均到手约 <strong>{monthly}</strong>',
      'kpi_takehome_net_cash_tpl': ' · 扣除商业保费({prem})后净现金 <strong>{cash}</strong>',
      'kpi_taxes_sub_tpl': '社保 {si} · 所得税 {it} · 住民税 {rt}',
      'ins_total_saved_sub_tpl': '所得税减税 <strong>{it}</strong> + 住民税减税 <strong>{rt}</strong> (年末调整退税到账)',
      'mortgage_res_cap_tpl': '前年课税所得5%或{cap}封顶，当前住民税转嫁上限为 {amount}',
      'alert_loss_title': '注意：確定申告会造成房贷减税损失约 {loss}！',
      'alert_loss_reason': '原因：確定申告会将故乡税走所得税寄附金控除，减少所得税课税所得；房贷减税被挤入住民税时撞上了 <strong>{cap}</strong> 转移上限，多余减税额永久失效。',
      'alert_loss_advice': '💡 <strong>实战避坑建议</strong>：若处于买房第 2 年及以后，<strong>强烈推荐选择ワンストップ特例 (One-Stop)</strong>，可 100% 拿满全部房贷减税！若属于买房第 1 年必须確定申告，建议故乡税控制在 <strong>{safe}</strong> 以内以防亏损。',
      'alert_safe_title': '好消息：在此年收入和房贷余额下，两种申报模式均不会损失房贷减税！',
      'alert_safe_body': '您的所得税与住民税额度充裕，故乡税扣减后依然有足够空间消化房贷减税。若入居第 1 年可放心进行確定申告。',
      'alert_no_mortgage': '当前未启用房贷减税。ワンストップ特例与確定申告对故乡税的减免总额在数学上完全一致（均享受自己自负 2,000 円的上限福利）。',
      'chart_comp_labels': ['自由现金手取り', '商业保险保费', '社会保险费', '所得税', '横浜市民住民税', '故乡税捐款'],
      'chart_compare_labels': ['所得税', '横浜住民税', '二税合计'],
      'chart_dataset_before': '减税前原始税金',
      'chart_dataset_after': '实际应缴税金 (享房贷+故乡税)',
      'csv_filename_tpl': '横滨市正社员税金试算表_{income}万年收.csv',
      'csv_category': '指标分类',
      'csv_item': '指标项目',
      'csv_amount_desc': '金额 (円/或说明)',
      'csv_cat_standard': '计算标准',
      'csv_cat_base_income': '基本收入',
      'csv_cat_social_ins': '社会保险',
      'csv_cat_comm_ins': '商业保险',
      'csv_cat_comm_ins_ded': '商业保险控除',
      'csv_cat_income_tax': '所得税',
      'csv_cat_resident_tax': '住民税',
      'csv_cat_mortgage': '房贷减税',
      'csv_cat_furusato': '故乡税',
      'csv_cat_takehome': '实到手'
    },

    'ja': {
      // ページメタ情報
      'page_title': '税金・手取り計算機 | 神奈川・横浜基準',
      'brand_title': '正社員 税金・手取り計算機',
      'brand_tag': '神奈川・横浜基準',
      'brand_sub': '協会けんぽ神奈川支部 (5.01%) · 横浜市 住民税 (10.025% / 横浜みどり税) · 住宅ローン控除 · ふるさと納税限度額 · 保険料控除',
      'nav_mortgage': '40年住宅ローン計算機',
      'theme_btn': '外観切替',
      'lang_btn': '中文',

      // 地域バナー
      'region_yokohama_badge': '📍 <strong>神奈川県横浜市</strong> · 健保 5.01% · 住民税所得割 10.025% (水源税＋横浜みどり税含む)',
      'region_other_badge': '📍 <strong>神奈川県 (その他市町村)</strong> · 健保 5.01% · 住民税所得割 10.025% (水源税含む)',
      'lbl_select_region': '基準地域切替：',
      'opt_yokohama': '神奈川県 横浜市 (均等割等 6,200円)',
      'opt_kanagawa_other': '神奈川県 その他市町村 (川崎市等 5,300円)',

      // 給与条件
      'card_income_title': '💴 額面年収と社会保険料 (給与条件)',
      'lbl_gross_income': '額面年収 (支払金額)',
      'unit_man': '万円',
      'unit_year': '年',
      'lbl_age_40': '40歳以上 (介護保険第2号被保険者)',
      'hint_age_40': '40〜64歳は介護保険料（折半0.80%）が加算されます',
      'lbl_si_mode': '社会保険料の計算方式',
      'si_mode_auto': '協会けんぽ神奈川支部基準で概算 (約14.76%)',
      'si_mode_manual': '源泉徴収票の実額を手入力',
      'hint_manual_si': '源泉徴収票の「社会保険料等の金額」を記入',

      // 保険料控除
      'card_insurance_title': '🛡️ 商業保険料控除 (新制度3分類＋地震保険)',
      'badge_insurance_yearend': '年末調整で手取り増額',
      'desc_insurance': '民間保険料の申告により、所得税最大 <strong>12万円</strong> ＋ 住民税最大 <strong>7万円</strong> の控除が適用され、手取りが増加します：',
      'lbl_ins_general': '① 一般生命保険料 (死亡定期/終身/学資)',
      'hint_ins_general': '年8万支払で控除枠満額(所得4万/住民2.8万)',
      'lbl_ins_medical': '② 介護医療保険料 (医療/がん/三大疾病)',
      'hint_ins_medical': '控除上限：所得税4万/住民税2.8万',
      'lbl_ins_annuity': '③ 個人年金保険料 (個人年金保険料税制適格)',
      'hint_ins_annuity': '控除上限：所得税4万/住民税2.8万',
      'lbl_ins_earthquake': '④ 地震保険料 (火災保険付帯の地震危険補償)',
      'hint_ins_earthquake': '控除上限：所得税5万/住民税2.5万',

      // 人的控除
      'card_dependents_title': '👨‍👩‍👧 配偶者控除・扶養控除 (人的控除)',
      'lbl_spouse_status': '配偶者の状況',
      'spouse_opt_none': '独身 / 配偶者なし',
      'spouse_opt_dep': '配偶者控除対象 (専業主婦(夫)・年収150万円以下)',
      'spouse_opt_part': '配偶者特別控除対象 (パート年収150〜201万円)',
      'spouse_opt_indep': '共働き・控除対象外 (年収201.6万円超)',
      'lbl_dependents': '扶養親族の人数',
      'hint_dependents': '16歳未満は児童手当対象のため控除なし',
      'lbl_dep_1618': '一般扶養親族 (16〜18歳)',
      'lbl_dep_1922': '特定扶養親族 (19〜22歳 大学生)',
      'lbl_dep_elder': '老人扶養親族 (70歳以上 同居)',
      'lbl_ideco': 'iDeCo / 確定拠出年金 年間拠出額',
      'hint_ideco': '全額所得控除',

      // 住宅減税
      'card_mortgage_title': '🏠 住宅借入金等特別控除 (住宅ローン減税)',
      'lbl_mortgage_balance': '年末ローン残高 (借入残高)',
      'lbl_house_type': '住宅の省エネ性能区分',
      'house_opt_energy': '省エネ基準適合住宅 (借入上限 3,000〜4,000万円)',
      'house_opt_zeh': 'ZEH水準省エネ住宅 (借入上限 3,500〜4,500万円)',
      'house_opt_cert': '認定長期優良・低炭素住宅 (借入上限 4,500〜5,000万円)',
      'house_opt_gen': 'その他の一般住宅 (借入上限 2,000万円)',
      'house_opt_custom': '借入上限額を手動指定',
      'lbl_custom_limit': '借入上限額 (万円)',
      'lbl_deduction_rate': '控除率',
      'ded_rate_07': '0.7% (2022年以降現行制度)',
      'ded_rate_10': '1.0% (旧制度基準)',
      'lbl_movein_year': '入居年区分',
      'movein_post2022': '2022年以降入居 (住民税上限 9.75万円)',
      'movein_pre2022': '2021年以前入居 (住民税上限 13.65万円)',

      // ふるさと納税
      'card_furusato_title': '🎁 ふるさと納税 寄附計画',
      'lbl_furusato_mode': '申請方式の選択',
      'hint_furusato_mode': '住宅ローン控除への影響を決定づけます',
      'furusato_onestop_title': 'ワンストップ特例制度 (推奨)',
      'furusato_onestop_desc': '自治体5カ所以下。全額翌年住民税から控除され、所得税の住宅ローン控除枠を保全',
      'furusato_shinkoku_title': '確定申告 (1年目必須または6自治体以上)',
      'furusato_shinkoku_desc': '所得税寄附金控除により所得税が減少し、住宅ローン控除が住民税上限に衝突するリスクあり',
      'lbl_planned_furusato': '予定寄附金額',
      'btn_fill_furusato': '上限目安額を自動入力 ⚡',
      'hint_furusato_zero': '0を入力すると試算上限額を適用します',

      // KPI カード
      'kpi_mortgage_title': '🏠 住宅ローン控除 減税額',
      'kpi_furusato_title': '🎁 ふるさと納税 上限目安額',
      'kpi_takehome_title': '💴 手取り年収 (可処分所得)',
      'kpi_taxes_title': '📊 社会保険料・税金合計 (横浜)',
      'kpi_badge_full': '満額控除達成',
      'kpi_badge_furusato_sub': '実質負担わずか2,000円',
      'kpi_badge_takehome_sub': '税引後自由現金',
      'kpi_badge_taxes_sub': '年間差引合計',

      // 保険看板
      'box_ins_savings_title': '🛡️ 商業保険料控除による節税額 (年末調整還付)',
      'ins_life_it_lbl': '生命保険 所得税控除額',
      'ins_life_rt_lbl': '生命保険 横浜住民税控除額',
      'ins_eq_it_lbl': '地震保険 所得税控除額',
      'ins_eq_rt_lbl': '地震保険 横浜住民税控除額',
      'max_12man': '(上限12万円)',
      'max_7man': '(上限7万円)',
      'max_5man': '(上限5万円)',
      'max_25man': '(上限2.5万円)',

      // 住宅減税進捗
      'card_mortgage_flow_title': '🏡 住宅ローン減税 控除枠の消化・内訳分析',
      'mortgage_flow_desc': '減税額は法定順位に従って消化されます：<strong>① 当年所得税から優先全額控除</strong> → <strong>② 控除しきれない枠は翌年横浜住民税へ（上限9.75万円）</strong> → <strong>③ 上限超過分は切り捨て</strong>',
      'prog_lbl_it': '所得税直接控除：',
      'prog_lbl_rt': '翌年住民税転嫁控除：',
      'prog_lbl_waste': '未消化失効枠：',

      // 比較パネル
      'card_compare_mode_title': '⚡ ふるさと納税 申請方式比較：ワンストップ特例 vs 確定申告',
      'compare_mode_desc': '<strong>住宅ローン減税</strong>と<strong>ふるさと納税</strong>を併用する場合、申請方式により所得税課税標準が変わり、住宅ローン減税が切り捨てられる恐れがあります：',
      'badge_onestop_rec': '推奨 (2年目以降)',
      'badge_shinkoku_req': '住宅購入1年目は必須',
      'desc_onestop': '寄附先5自治体以内の正社員向け。全額が翌年の住民税から控除されるため、所得税側の減税枠を圧迫しません。',
      'desc_shinkoku': '所得税寄附金控除により算出所得税が低下。住宅ローン減税が住民税側に溢れ出し、9.75万円上限により失効するリスクがあります。',
      'row_lbl_mort_got': '住宅減税 実際の手取り効果：',
      'row_lbl_fur_got': 'ふるさと納税 減税効果：',
      'row_lbl_mort_waste': '住宅ローン減税の失効損失：',

      // 寄附計画
      'card_furusato_plan_title': '🎁 ふるさと納税 寄附計画と実質メリット試算',
      'lbl_plan_donation': '予定寄附金額',
      'lbl_plan_self_burden': '自己負担額',
      'lbl_plan_tax_cut': '税金控除合計額',
      'lbl_plan_gift': '返礼品相当価値 (約30%)',
      'lbl_plan_net_gain': '実質経済メリット',

      // グラフと源泉表
      'card_charts_title': '📊 グラフ分析：収入配分と節税効果',
      'chart_title_comp': '年収配分と保険料 (自由現金・保険料・社保・税金)',
      'chart_title_compare': '減税前後の納税額比較 (住宅減税・ふるさと納税効果)',
      'card_ticket_title': '📄 源泉徴収票 項目対照表 (年末調整対応)',
      'hint_ticket': '生命保険料・地震保険料控除、住宅借入金等特別控除、横浜市住民税を網羅',
      'th_ticket_field': '源泉徴収票の項目名',
      'th_ticket_amount': '金額',
      'th_ticket_desc': '項目の解説と税法根拠',
      'btn_export_csv': '💾 詳細CSV出力',
      'btn_print': '🖨️ 印刷 / PDF保存',
      'table_scroll_hint': '👈 横スクロールで全項目を表示できます 👉',

      // フッター
      'footer_text': '日本正社員の税金計算シミュレーター · 神奈川県横浜市基準対応 · ブラウザ完結オフライン動作 · 外部送信なし',
      'footer_mort_link': '40年住宅ローンシミュレーター',
      'footer_doc_link': '利用マニュアル＆税法解説',

      // 動的表示・バナーテンプレート
      'kpi_mortgage_sub_tpl': '理論上の減税上限 {max} (所得税控除 {it} ＋ 住民税控除 {rt})',
      'kpi_mortgage_waste_badge': '⚠️ 控除枠失効 {waste}',
      'kpi_mortgage_full_badge': '✅ 満額控除達成',
      'kpi_mortgage_fallback_high': '所得2000万円超または残高0',
      'kpi_mortgage_fallback_none': '住宅ローン控除未設定',
      'kpi_mortgage_badge_none': '控除なし',
      'kpi_furusato_sub_tpl': '実質自己負担わずか <strong>¥2,000</strong> · 返礼品相当価値 約 <strong>{gift}</strong>',
      'kpi_takehome_sub_tpl': '月平均手取り 約 <strong>{monthly}</strong>',
      'kpi_takehome_net_cash_tpl': ' · 保険料支払({prem})控除後自由現金 <strong>{cash}</strong>',
      'kpi_taxes_sub_tpl': '社保 {si} · 所得税 {it} · 住民税 {rt}',
      'ins_total_saved_sub_tpl': '所得税減税 <strong>{it}</strong> ＋ 住民税減税 <strong>{rt}</strong> (年末調整等で還付・減額)',
      'mortgage_res_cap_tpl': '前年課税所得の5%または{cap}上限、現在の住民税控除上限は {amount}',
      'alert_loss_title': '注意：確定申告を行うと住宅ローン控除が約 {loss} 失効します！',
      'alert_loss_reason': '原因：確定申告ではふるさと納税が所得税寄附金控除として課税所得を減らすため、算出所得税が低下します。住宅ローン控除が住民税側に溢れ出しますが、<strong>{cap}</strong> の住民税控除上限に衝突し、超過枠が切り捨てられます。',
      'alert_loss_advice': '💡 <strong>対策アドバイス</strong>：入居2年目以降の方は、<strong>ワンストップ特例の利用を強く推奨します</strong>。所得税枠を消費せず全額控除を受けられます。入居1年目で確定申告が必須の場合は、ふるさと納税を <strong>{safe}</strong> 以内に抑えると控除枠の失効を防げます。',
      'alert_safe_title': '良好：現在の年収とローン残高では、どちらの申請方式でも住宅ローン減税枠の損失はありません！',
      'alert_safe_body': '所得税・住民税ともに充分な税額があり、ふるさと納税を行っても住宅ローン控除枠を消化しきれます。入居1年目の確定申告も安心です。',
      'alert_no_mortgage': '現在、住宅ローン控除は未設定です。ワンストップ特例と確定申告のふるさと納税減税額は同一です（実質自己負担2,000円）。',
      'chart_comp_labels': ['自由現金手取り', '商業保険料', '社会保険料', '所得税', '横浜市住民税', 'ふるさと納税'],
      'chart_compare_labels': ['所得税', '横浜市住民税', '2税合計'],
      'chart_dataset_before': '減税前 税金',
      'chart_dataset_after': '減税後 実納税額 (住宅減税・ふるさと納税)',
      'csv_filename_tpl': '横浜市正社員税金計算結果_{income}万円年収.csv',
      'csv_category': '区分',
      'csv_item': '項目名',
      'csv_amount_desc': '金額（円）または詳細',
      'csv_cat_standard': '基準・制度',
      'csv_cat_base_income': '額面給与',
      'csv_cat_social_ins': '社会保険料',
      'csv_cat_comm_ins': '商業保険料',
      'csv_cat_comm_ins_ded': '保険料控除',
      'csv_cat_income_tax': '所得税',
      'csv_cat_resident_tax': '住民税',
      'csv_cat_mortgage': '住宅ローン控除',
      'csv_cat_furusato': 'ふるさと納税',
      'csv_cat_takehome': '手取り額'
    }
  };

  function safeGetStorage(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('[tax-i18n] localStorage access denied:', e);
    }
    return null;
  }

  function safeSetStorage(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('[tax-i18n] localStorage write denied:', e);
    }
  }

  function getInitialLang() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('lang')) {
        const l = params.get('lang').toLowerCase();
        if (l === 'ja' || l === 'jp') return 'ja';
        if (l === 'zh' || l === 'cn') return 'zh';
      }
    } catch (e) {}

    const saved = safeGetStorage(STORAGE_KEY);
    if (saved && (saved === 'ja' || saved === 'zh')) return saved;

    const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (navLang.startsWith('ja')) return 'ja';
    return 'zh';
  }

  let currentLang = getInitialLang();

  function t(key, lang = currentLang) {
    const l = dict[lang] || dict['zh'];
    return l[key] !== undefined ? l[key] : (dict['zh'][key] || key);
  }

  function setLanguage(newLang) {
    if (newLang !== 'zh' && newLang !== 'ja') return;
    currentLang = newLang;
    safeSetStorage(STORAGE_KEY, newLang);
    document.documentElement.setAttribute('lang', newLang === 'ja' ? 'ja' : 'zh-CN');

    // 1. 批量更新纯文本标签
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key, newLang);
      if (text !== undefined) {
        el.textContent = text;
      }
    });

    // 2. 批量更新含富文本标签
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const html = t(key, newLang);
      if (html !== undefined) {
        el.innerHTML = html;
      }
    });

    // 3. 页面标题更新
    document.title = t('page_title', newLang);

    // 4. 更新分段式/单按钮的显示状态与激活样式
    const btnZh = document.getElementById('btn-lang-zh');
    const btnJa = document.getElementById('btn-lang-ja');
    if (btnZh && btnJa) {
      btnZh.classList.toggle('active', newLang === 'zh');
      btnJa.classList.toggle('active', newLang === 'ja');
      btnZh.setAttribute('aria-pressed', newLang === 'zh' ? 'true' : 'false');
      btnJa.setAttribute('aria-pressed', newLang === 'ja' ? 'true' : 'false');
    }
    const langBtnText = document.getElementById('lang-btn-text');
    if (langBtnText) {
      langBtnText.textContent = newLang === 'zh' ? '日本語' : '中文';
    }

    // 5. 广播语言变更自定义事件
    try {
      window.dispatchEvent(new CustomEvent('tax-lang-changed', { detail: { lang: newLang } }));
    } catch (e) {
      const evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('tax-lang-changed', true, true, { lang: newLang });
      window.dispatchEvent(evt);
    }
  }

  function toggleLanguage() {
    const target = currentLang === 'zh' ? 'ja' : 'zh';
    setLanguage(target);
    return target;
  }

  function bindLangSwitchers() {
    const btnZh = document.getElementById('btn-lang-zh');
    const btnJa = document.getElementById('btn-lang-ja');
    if (btnZh) {
      btnZh.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLanguage('zh');
      });
    }
    if (btnJa) {
      btnJa.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLanguage('ja');
      });
    }
    const singleBtn = document.getElementById('lang-toggle-btn');
    if (singleBtn) {
      singleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleLanguage();
      });
    }
  }

  // 自主就绪初始化 (彻底脱离对外部异步脚本的依赖)
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setLanguage(currentLang);
        bindLangSwitchers();
      });
    } else {
      setLanguage(currentLang);
      bindLangSwitchers();
    }
  }

  window.TaxI18n = {
    t,
    getLang: () => currentLang,
    setLanguage,
    toggleLanguage,
    dict
  };

  // 全局无条件快捷函数
  window.setAppLanguage = setLanguage;
  window.toggleAppLanguage = toggleLanguage;

})(window);
