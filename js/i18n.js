/**
 * ==============================================================================
 * 日本住宅ローンシミュレーター - 多语言国际化系统 (js/i18n.js)
 * 中日双语 (zh-CN / ja-JP) 完整翻译字典与动态切换控制器
 * ==============================================================================
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'japan_calc_lang';

  const dict = {
    'zh': {
      // 页面元信息
      'page_title': '日本房贷计算器 - 40年超长贷 / 5年规则与125%规则模拟 (日本住宅ローンシミュレーション)',
      'brand_title': '日本房贷模拟器',
      'brand_tag': '40年 / 5年·125%规则版',
      'brand_sub': '日本住宅ローンシミュレーター · 40年超長期ローン · 変動金利 · 未払利息リスク推計',
      'nav_tax': '正社员税金·故乡税',
      'theme_btn': '外观',
      'lang_btn': '日本語',

      // 贷款条件卡片
      'card_loan_cond': '贷款基本条件 (借入条件)',
      'config_loaded': '⚙️ 默认参数已从 config.js 加载',
      'lbl_principal': '借款本金金额 (借入金額)',
      'unit_man': '万円',
      'unit_year': '年',
      'lbl_term': '贷款期限 (返済期間 · 默认40年)',
      'lbl_term_hint': '可任意输入 1~50 年',
      'term_calc_hint': '💡 40年贷款共 <strong>480期</strong>，在降低初期月供的同时，利息对利率调整极为敏感。',
      'lbl_rate': '初始借款年利率 (適用金利)',
      'lbl_start_ym': '放款起始年月 (借入開始)',
      'lbl_start_ym_hint': '用于精确换算实际日历月份',
      'lbl_repay_method': '还款方式 (返済方式)',
      'repay_equal_pmt': '元利均等返済 (等额本息)',
      'repay_equal_prn': '元金均等返済 (等额本金)',
      'equal_prn_notice': '⚠️ 注意：元金均等返済每月本金固定，利息据实计算，<strong>不适用</strong> 5年规则与125%规则。',

      // 规则开关
      'card_rules': '核心机制开关 (ルール設定)',
      'rule_5yr_title': '5年规则 (5年ルール)',
      'rule_5yr_desc': '基准利率变动时，5年内实际月供金额固定不变',
      'rule_125_title': '125%规则 (125%ルール)',
      'rule_125_desc': '每5年重算时，新月供上限为上期月供的1.25倍',
      'rule_note': '💡 <strong>说明</strong>：开启后模拟三菱UFJ、三井住友、瑞穗、住信SBI、auじぶん等主流大行；关闭后模拟索尼银行 (Sony Bank)、PayPay银行等“无规则即时重算”模式。',

      // 场景选择
      'card_scenarios': '未来加息场景推演 (金利シミュレーション)',
      'scene_flat_title': '🟢 全期平稳 (利率不变)',
      'scene_flat_desc': '全程维持当前初始利率不变',
      'scene_flat_tag': '基准场景',
      'scene_mild_title': '🟡 温和加息 (+0.25%/5年)',
      'scene_mild_desc': '每5年递增0.25%，40年内平稳走高',
      'scene_mild_tag': '主流预测',
      'scene_steep_title': '🟠 阶梯快速加息',
      'scene_steep_desc': '第6年起提速加息 (每5年递增 0.5%~0.6%)',
      'scene_steep_tag': '加速加息',
      'scene_extreme_title': '🔴 剧烈暴涨 (压力测试)',
      'scene_extreme_desc': '第6年飙升至3.0%，第11年飙至4.5% (观察125%封顶与未付利息)',
      'scene_extreme_tag': '极端测试',
      'scene_custom_title': '⚙️ 自定义时间轴节点',
      'scene_custom_desc': '自由设定各个年份节点的利率变化',
      'scene_custom_tag': '自由定制',
      'custom_box_title': '各阶段加息节点设定 (精确到月)：',
      'custom_box_hint': '🏦 <strong>三菱UFJ调息规律</strong>：每年4月1日/10月1日检讨基准利率，分别反映在7月/1月的还款扣款中。你可在此自由设置具体第几年第几月生效。',
      'btn_add_step': '＋ 添加精确月份加息节点',

      // KPI 卡片
      'kpi_initial_title': '初期月供 (第1~5年)',
      'kpi_max_title': '最高月供 (最高返済額)',
      'kpi_total_title': '累计总还款额',
      'kpi_total_hint': '本金与利息总和',
      'kpi_balloon_title': '期末清偿状态',
      'kpi_settled': '¥0 (顺利结清)',
      'kpi_settled_hint': '✅ 第{term}年贷款如期还清',
      'kpi_balloon_hint': '⚠️ 期末一笔还清 (本金: {bal})',
      'kpi_peak_hint': '在第 {year} 年达到峰值',

      // 对比面板
      'comp_title': '📊 机制对照分析：有 5年/125% 规则 (大行) vs 无规则即时调整 (索尼/PayPay)',
      'comp_term_info': '期限：{term}年 (共{months}期)',
      'comp_current_mode': '🛡️ 当前模式 (5年 & 125%规则{status})',
      'comp_instant_mode': '⚡ 即时变动模式 (如索尼银行)',
      'comp_status_on': '开启',
      'comp_status_off': '关闭',
      'comp_balloon_risk': '期末需补款',
      'comp_smooth': '平稳过渡',
      'comp_guaranteed': '保证{term}年还清',
      'comp_lbl_max_pay': '最高月供支出:',
      'comp_lbl_interest': '总利息支出:',
      'comp_lbl_balloon': '期末补款 (一括返済):',
      'comp_lbl_stability': '还款月供稳定性:',
      'comp_stab_high': '★★★★★ (5年内固定)',
      'comp_stab_low': '★★★☆☆ (加息立即涨月供)',
      'comp_diff_more': '多支付 {val}',
      'comp_diff_less': '少支付 {val}',
      'comp_diff_equal': '持平',

      // 图表与选项卡
      'tab_payment': '📊 每月还款额与本金/利息构成',
      'tab_balance': '📉 贷款本金残高与未付利息走势',
      'chart_legend_pmt': '实还月供 (円/月)',
      'chart_legend_prn': '全年偿还本金 (万円)',
      'chart_legend_int': '全年支付利息 (万円)',
      'chart_legend_bal': '贷款本金余额 (万円)',
      'chart_legend_unpaid': '未付利息累积 (万円)',
      'chart_axis_pmt': '每月还款额 (円)',
      'chart_axis_year_total': '全年总额 (万円)',
      'chart_axis_man': '金额 (万円)',

      // 表格
      'table_title': '📋 还款计划明细表 (償還スケジュール)',
      'btn_expand_all': '展开全部月份',
      'btn_collapse_all': '收起全部明细',
      'btn_export_csv': '导出 CSV 表格',
      'th_year': '年份',
      'th_rate': '适用利率',
      'th_monthly_pmt': '月供金额',
      'th_year_pmt': '全年还款总额',
      'th_year_prn': '本年偿还本金',
      'th_year_int': '本年支付利息',
      'th_end_bal': '年末本金余额',
      'th_unpaid': '未付利息挂账',
      'th_details': '逐月明细',
      'btn_detail_open': '详情 ▾',
      'btn_detail_close': '收起 ▴',
      'sub_month_header': '第 {year} 年逐月还款明细 ({start} ~ {end})：',
      'sub_th_month': '还款期数与日历月',
      'sub_th_rate': '适用年利率',
      'sub_th_pmt': '当月还款额',
      'sub_th_prn': '偿还本金',
      'sub_th_int': '支付利息',
      'sub_th_bal': '月末本金余额',
      'sub_th_unpaid': '未付利息挂账',
      'sub_th_status': '状态说明',
      'pill_cap': '⚡ 125%封顶',
      'pill_unpaid': '⚠️ 未付利息',
      'pill_cycle': '🔄 5年调价',
      'table_scroll_hint': '👈 可左右滑动查看完整明细表格 👉',

      // FAQ
      'faq_heading': '40年超长房贷与“5年/125%规则”深度解析与避坑指南',
      'faq_q1': '1. 为什么 40 年超长贷款更需要警惕 125% 规则？',
      'faq_a1': '<p>40 年（480 期）超长房贷在初期每月的本金扣还比例极低（大部分月供都在付利息）。一旦遇到加息，月供中本金被压缩的空间比 35 年期更加有限！</p><p>受到 125% 上限保护时，月供无法足额增加，会导致<strong>本金偿还进度被大幅拖后</strong>，利息雪球效应在 40 年的超长时间跨度下会被进一步放大。</p>',
      'faq_q2': '2. 什么是“5年规则” (5年ルール)？',
      'faq_a2': '<p>在选择<strong>变动金利 (元利均等返済)</strong> 时，尽管银行通常每半年 (每年 4 月和 10 月) 评估一次基准利率，但<strong>借款人每月的实际扣款金额在 5年内 (60个月) 严格保持不变</strong>。</p><p><strong>注意内幕</strong>：月供金额虽然不变，但内部的<strong>“本金 vs 利息”比例会立即变化</strong>！加息后每月利息增加，本金偿还变慢。</p>',
      'faq_q3': '3. 什么是“125%规则” (125%ルール)？',
      'faq_a3': '<p>在第 6 年、第 11 年、第 16 年…等每个 5 年周期节点，银行会按最新利率重新核算月供。但银行规定：<strong>新的月供金额不得超过上一个 5 年月供金额的 1.25 倍 (125%)</strong>。</p><p><strong>本质</strong>：125% 规则保护的是借款人当期的现金流不至于因加息断供，但<strong>绝非免除利息</strong>，少还的部分全部延后。</p>',
      'faq_q4': '4. 什么是“未付利息 (未払利息)”？',
      'faq_a4': '<p>当利率出现暴涨时，若每月产生的利息金额<strong>超过了受到 125% 上限封顶的月供金额</strong>，超出部分的利息就会变成“未払利息 (挂账未付利息)”。</p><p>此时月供全被利息吞噬，<strong>本金一分钱都不减</strong>，反而倒欠银行利息。未付利息将在未来优先扣除，若到期未能还清，将在第 40 年末面临巨额一次性清偿。</p>',
      'faq_q5': '5. 日本各大银行规则采用情况一览',
      'faq_a5': '<p>并非所有日本银行都采用 5 年与 125% 规则，借款前务必核对银行合同约定：</p><div class="bank-chips"><span class="bank-chip has-rule">✓ 三菱UFJ银行 (有规则)</span> <span class="bank-chip has-rule">✓ 三井住友银行 (有规则)</span> <span class="bank-chip has-rule">✓ 瑞穗银行 (有规则)</span> <span class="bank-chip has-rule">✓ auじぶん銀行 (有规则)</span> <span class="bank-chip has-rule">✓ 住信SBIネット銀行 (有规则)</span> <span class="bank-chip no-rule">✗ 索尼银行 Sony Bank (无此规则)</span> <span class="bank-chip no-rule">✗ PayPay银行 (无此规则)</span> <span class="bank-chip no-rule">✗ SBI新生银行 (部分方案无规则)</span></div><p style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">*无规则的银行在加息时月供即刻调整，保证 40 年末绝对清零，不会产生未付利息。</p>',
      'faq_q6': '6. 40年期房贷的 3 大实战避坑建议',
      'faq_a6': '<p><strong>① 储备流动资金</strong>：不要把现金耗尽，留出 1~2 年的生活备用金与提前还款储备。<br><strong>② 适时提前还款 (繰り上げ返済)</strong>：在加息周期来临时，优先做“期间缩短型”提前还款，大幅削减 40 年后期的利息负担。<br><strong>③ 关注总利息而非仅看月供</strong>：40 年贷款月供虽低，但总支付利息远超 30~35 年期，务必结合推演图表做好全周期规划。</p>',

      // 页脚
      'footer_text': '日本住宅ローンシミュレーター · 40年超長期ローン · 変動金利5年/125%规则对应 · 纯前端离线运行 · 数据安全不上传',
      'footer_tax_link': '正社员税金·房贷减税·故乡税计算器',
      'footer_doc_link': '使用手册 & 算法原理'
    },

    'ja': {
      // ページメタ情報
      'page_title': '日本住宅ローンシミュレーター - 40年超長期ローン / 5年ルール・125%ルール推計',
      'brand_title': '住宅ローンシミュレーター',
      'brand_tag': '40年超長期 / 5年・125%ルール対応版',
      'brand_sub': '日本住宅ローンシミュレーター · 40年超長期ローン · 変動金利 · 未払利息リスク推計',
      'nav_tax': '正社員税金・ふるさと納税',
      'theme_btn': '外観切替',
      'lang_btn': '中文',

      // 借入条件カード
      'card_loan_cond': '借入基本条件 (住宅ローン条件)',
      'config_loaded': '⚙️ config.js より初期設定を読込済',
      'lbl_principal': '借入金額 (借入元金)',
      'unit_man': '万円',
      'unit_year': '年',
      'lbl_term': '返済期間 (借入期間 · デフォルト40年)',
      'lbl_term_hint': '1〜50年まで自由に指定可能',
      'term_calc_hint': '💡 40年ローンは全 <strong>480回返済</strong>。初期返済額を抑えられる一方、金利上昇時の利息総額への影響が極めて大きくなります。',
      'lbl_rate': '当初借入金利 (適用金利)',
      'lbl_start_ym': '融資実行年月 (返済開始時期)',
      'lbl_start_ym_hint': '三菱UFJ等の金利見直し月に対応',
      'lbl_repay_method': '返済方式',
      'repay_equal_pmt': '元利均等返済 (5年・125%ルール適用)',
      'repay_equal_prn': '元金均等返済 (元金固定・毎月見直し)',
      'equal_prn_notice': '⚠️ ご注意：元金均等返済は元金部分が毎月固定で利息が実額計算されるため、5年ルール・125%ルールは<strong>適用されません</strong>。',

      // ルール設定カード
      'card_rules': '金利変動ルール設定 (セーフティ機能)',
      'rule_5yr_title': '5年ルール (5年固定返済)',
      'rule_5yr_desc': '金利が見直されても、5年間は毎月の返済額が変わりません',
      'rule_125_title': '125%ルール (上限キャップ)',
      'rule_125_desc': '5年ごとの見直し時、新返済額は前回の1.25倍が上限となります',
      'rule_note': '💡 <strong>補足</strong>：オン時は三菱UFJ・三井住友・みずほ・住信SBI・auじぶん等の大手銀行を再現。オフ時はソニー銀行・PayPay銀行等の「即時見直し型」を再現します。',

      // シナリオカード
      'card_scenarios': '将来の金利推移シナリオ (金利シミュレーション)',
      'scene_flat_title': '🟢 全期間一定 (金利変動なし)',
      'scene_flat_desc': '完済まで当初金利を維持するベースシナリオ',
      'scene_flat_tag': '基準シナリオ',
      'scene_mild_title': '🟡 緩やかな利上げ (+0.25%/5年)',
      'scene_mild_desc': '5年ごとに0.25%上昇、緩やかな利上げを想定',
      'scene_mild_tag': '主流予測',
      'scene_steep_title': '🟠 段階的利上げ (加速型)',
      'scene_steep_desc': '6年目以降加速 (5年ごとに約0.5〜0.6%上昇)',
      'scene_steep_tag': '加速シナリオ',
      'scene_extreme_title': '🔴 急激な金利上昇 (ストレステスト)',
      'scene_extreme_desc': '6年目3.0%、11年目4.5%へ急騰 (125%上限と未払利息の検証)',
      'scene_extreme_tag': 'ストレステスト',
      'scene_custom_title': '⚙️ カスタム金利推移 (月単位指定)',
      'scene_custom_desc': '各年・月の金利変動ノードを自由に設定',
      'scene_custom_tag': '自由設定',
      'custom_box_title': '各段階の金利見直しノード設定 (月単位)：',
      'custom_box_hint': '🏦 <strong>三菱UFJ等の見直し基準</strong>：4月1日/10月1日の店頭金利見直しが7月/1月の返済に反映されます。第何年・第何月に改定されるか高精度に指定できます。',
      'btn_add_step': '＋ 金利見直しノードを追加',

      // KPI カード
      'kpi_initial_title': '当初月次返済額 (1〜5年目)',
      'kpi_max_title': '最高月次返済額 (ピーク時)',
      'kpi_total_title': '総返済額 (元利合計)',
      'kpi_total_hint': '借入元金＋利息総額',
      'kpi_balloon_title': '満期時 完済状況',
      'kpi_settled': '¥0 (正常完済)',
      'kpi_settled_hint': '✅ 第{term}年目に予定通り完済',
      'kpi_balloon_hint': '⚠️ 期末一括返済 (元金残高: {bal})',
      'kpi_peak_hint': '第 {year} 年目にピーク到達',

      // 比較パネル
      'comp_title': '📊 仕組み比較：5年・125%ルールあり（大手行） vs 即時見直し型（ソニー・PayPay等）',
      'comp_term_info': '期間：{term}年 (全{months}回返済)',
      'comp_current_mode': '🛡️ 現在のモード (5年・125%ルール {status})',
      'comp_instant_mode': '⚡ 即時見直し型 (ソニー銀行等)',
      'comp_status_on': '適用',
      'comp_status_off': '未適用',
      'comp_balloon_risk': '期末残債あり',
      'comp_smooth': '正常完済',
      'comp_guaranteed': '{term}年で完全完済',
      'comp_lbl_max_pay': '最高月次返済額:',
      'comp_lbl_interest': '支払利息総額:',
      'comp_lbl_balloon': '期末一括返済額:',
      'comp_lbl_stability': '返済額の安定性:',
      'comp_stab_high': '★★★★★ (5年間固定)',
      'comp_stab_low': '★★★☆☆ (金利上昇時即増額)',
      'comp_diff_more': '{val} 増加',
      'comp_diff_less': '{val} 削減',
      'comp_diff_equal': '同額',

      // グラフ
      'tab_payment': '📊 毎月の返済額と元金・利息内訳',
      'tab_balance': '📉 ローン残高と未払利息の推移',
      'chart_legend_pmt': '毎月返済額 (円/月)',
      'chart_legend_prn': '年間元金充当額 (万円)',
      'chart_legend_int': '年間支払利息 (万円)',
      'chart_legend_bal': 'ローン元金残高 (万円)',
      'chart_legend_unpaid': '未払利息累計 (万円)',
      'chart_axis_pmt': '毎月返済額 (円)',
      'chart_axis_year_total': '年間返済額 (万円)',
      'chart_axis_man': '金額 (万円)',

      // 表
      'table_title': '📋 償還スケジュール明細表 (返済計画表)',
      'btn_expand_all': 'すべての月を展開',
      'btn_collapse_all': '月次明細を閉じる',
      'btn_export_csv': 'CSVダウンロード',
      'th_year': '年次',
      'th_rate': '適用金利',
      'th_monthly_pmt': '毎月返済額',
      'th_year_pmt': '年間返済合計',
      'th_year_prn': '元金充当額',
      'th_year_int': '支払利息額',
      'th_end_bal': '年末残高',
      'th_unpaid': '未払利息',
      'th_details': '月次内訳',
      'btn_detail_open': '詳細 ▾',
      'btn_detail_close': '閉じる ▴',
      'sub_month_header': '第 {year} 年目 月次返済明細 ({start} 〜 {end})：',
      'sub_th_month': '返済回・年月',
      'sub_th_rate': '適用金利',
      'sub_th_pmt': '当月返済額',
      'sub_th_prn': '元金充当',
      'sub_th_int': '支払利息',
      'sub_th_bal': '月末残高',
      'sub_th_unpaid': '未払利息',
      'sub_th_status': '状態備考',
      'pill_cap': '⚡ 125%上限',
      'pill_unpaid': '⚠️ 未払利息',
      'pill_cycle': '🔄 5年見直し',
      'table_scroll_hint': '👈 横スクロールで全項目を表示できます 👉',

      // FAQ
      'faq_heading': '40年超長期ローンと「5年・125%ルール」徹底解説＆リスク対策ガイド',
      'faq_q1': '1. なぜ40年超長期ローンでは「125%ルール」に一層の警戒が必要なのか？',
      'faq_a1': '<p>40年（全480回）超長期ローンは、返済初期における毎月の元金充当割合が極めて低く（返済の大半が利息）、金利上昇時に元金を圧迫する余地が35年ローンより狭くなります。</p><p>125%ルールの保護下で返済額の上昇が抑えられると、<strong>元金の減るペースが大幅に遅延</strong>し、40年という超長期間で利息の雪だるま効果が急速に拡大します。</p>',
      'faq_q2': '2. 「5年ルール」とは何か？',
      'faq_a2': '<p>変動金利（元利均等返済）において、銀行は通常年2回（4月・10月）基準金利を見直しますが、<strong>毎月の実際の返済額は5年間（60回分）変更されません</strong>。</p><p><strong>注意点</strong>：返済額自体は変わりませんが、内訳である<strong>「元金と利息の比率」は即座に変化</strong>します。金利が上がれば利息支払が増加し、元金の減少ペースが鈍化します。</p>',
      'faq_q3': '3. 「125%ルール」とは何か？',
      'faq_a3': '<p>6年目、11年目、16年目など5年ごとの見直し期において、銀行は最新金利で返済額を再計算します。ただし、<strong>新返済額は従前の返済額の1.25倍（125%）を上限</strong>と定めています。</p><p><strong>本質</strong>：急激な家計負担増による破綻を防ぐ仕組みですが、<strong>利息が免除されるわけではありません</strong>。返済が繰り延べられた分は後で支払う必要があります。</p>',
      'faq_q4': '4. 「未払利息」とは何か？',
      'faq_a4': '<p>金利が急騰し、毎月発生する利息額が<strong>125%上限でキャップされた毎月返済額を上回った場合</strong>、払い切れなかった利息は「未払利息」として繰り延べ計上されます。</p><p>この状態では返済額全額が利息に消え、<strong>元金が一切減らない</strong>どころか利息残債が膨らみます。未払利息は将来優先清算され、完済期日までに解消されない場合は満期時に一括返済が請求されます。</p>',
      'faq_q5': '5. 主要銀行のルール適用状況一覧',
      'faq_a5': '<p>すべての金融機関が5年・125%ルールを採用しているわけではありません。契約前に約款を必ず確認してください：</p><div class="bank-chips"><span class="bank-chip has-rule">✓ 三菱UFJ銀行 (適用)</span> <span class="bank-chip has-rule">✓ 三井住友銀行 (適用)</span> <span class="bank-chip has-rule">✓ みずほ銀行 (適用)</span> <span class="bank-chip has-rule">✓ auじぶん銀行 (適用)</span> <span class="bank-chip has-rule">✓ 住信SBIネット銀行 (適用)</span> <span class="bank-chip no-rule">✗ ソニー銀行 (ルールなし)</span> <span class="bank-chip no-rule">✗ PayPay銀行 (ルールなし)</span> <span class="bank-chip no-rule">✗ SBI新生銀行 (一部プラン適用外)</span></div><p style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">※ルール非適用の銀行は金利改定時に返済額が即時連動し、40年満期時に未払利息が生じることなく残高ゼロで完済されます。</p>',
      'faq_q6': '6. 40年ローン実践における3大防衛アドバイス',
      'faq_a6': '<p><strong>① 流動資金の確保</strong>：手元現金を使い果たさず、1〜2年分の生活防衛資金と繰り上げ返済予備費を維持する。<br><strong>② 適切な繰り上げ返済</strong>：金利上昇局面では「期間短縮型」繰り上げ返済を活用し、40年超長期の後期利息負担を圧縮する。<br><strong>③ 返済額だけでなく総支払利息を直視する</strong>：毎月返済額の低さに惑わされず、30〜35年ローン比で利息総額がどれほど膨らむかを把握して返済計画を立てる。</p>',

      // フッター
      'footer_text': '日本住宅ローンシミュレーター · 40年超長期ローン · 変動金利5年/125%ルール対応 · オフライン完全動作 · データ送信なし',
      'footer_tax_link': '正社員の税金・住宅ローン控除・ふるさと納税シミュレーター',
      'footer_doc_link': '利用マニュアル＆計算原理'
    }
  };

  // 获取当前语言 (优先级: URL ?lang= -> localStorage -> 浏览器语言 -> 'zh')
  function getInitialLang() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('lang')) {
        const l = params.get('lang').toLowerCase();
        if (l === 'ja' || l === 'jp') return 'ja';
        if (l === 'zh' || l === 'cn') return 'zh';
      }
    } catch (e) {}

    const saved = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, newLang);
    document.documentElement.setAttribute('lang', newLang === 'ja' ? 'ja' : 'zh-CN');

    // 动态替换带有 data-i18n 的 DOM 元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key, newLang);
      if (text !== undefined) {
        el.textContent = text;
      }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const html = t(key, newLang);
      if (html !== undefined) {
        el.innerHTML = html;
      }
    });

    // 网页标题
    document.title = t('page_title', newLang);

    // 语言切换按钮文案
    const langBtnText = document.getElementById('lang-btn-text');
    if (langBtnText) {
      langBtnText.textContent = newLang === 'zh' ? '日本語' : '中文';
    }

    // 广播语言变化事件
    window.dispatchEvent(new CustomEvent('mortgage-lang-changed', { detail: { lang: newLang } }));
  }

  function toggleLanguage() {
    const target = currentLang === 'zh' ? 'ja' : 'zh';
    setLanguage(target);
    return target;
  }

  window.MortgageI18n = {
    t,
    getLang: () => currentLang,
    setLanguage,
    toggleLanguage,
    dict
  };

})(window);
