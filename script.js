let EXCEL_DATA = [];

// ===== تحويل رابط Google Sheets إلى رابط CSV =====
function getCSVUrl(sheetUrl) {
  // استخراج الـ ID من الرابط
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const id = match[1];
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&usp=sharing`;
}

// ===== تحليل CSV إلى مصفوفة كائنات =====
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    // دعم الحقول التي تحتوي على فواصل داخل علامات اقتباس
    const cols = [];
    let inQuote = false, cur = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  });
}

// ===== تحميل البيانات من Google Sheets =====
async function loadData() {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvnwCdT-vz8BKffHrsIsQDE0_dYopHWM574KkI84Qn3iqVr2xxZvJ6s0Phd3sYjw/pub?output=csv';

  try {
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    EXCEL_DATA = parseCSV(text);
    console.log('✅ تم تحميل البيانات من Google Sheets:', EXCEL_DATA.length, 'سجل');
    if (EXCEL_DATA.length > 0) {
      console.log('📋 الأعمدة المتاحة:', Object.keys(EXCEL_DATA[0]));
    }
  } catch (e) {
    console.warn('⚠️ تعذّر تحميل البيانات من Google Sheets:', e.message);
  }
}
loadData();

var inp       = document.getElementById('inp');
var msgs      = document.getElementById('msgs');
var sendBtn   = document.getElementById('sendBtn');
var typingInd = document.getElementById('typingIndicator');

// ===== إضافة رسالة =====
function addMsg(html, cls) {
  var d = document.createElement('div');
  d.className = 'msg ' + cls;
  d.innerHTML = html;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}

// ===== إظهار / إخفاء مؤشر الكتابة =====
function showTyping(show) {
  typingInd.classList.toggle('active', show);
  sendBtn.disabled = show;
  inp.disabled = show;
  if (show) msgs.scrollTop = msgs.scrollHeight;
}

// ===== تحليل محلي سريع للبيانات =====
function smartAnswer(q) {
  if (!EXCEL_DATA.length) return null;

  const normalize = v => (parseFloat(v) || 0);
  const entities  = [...new Set(EXCEL_DATA.map(r => r['الجهة']))];

  // ---- رفض الوزارة ----
  if (q.includes('وزار')) {
    const total = EXCEL_DATA.reduce((s,r) => s + normalize(r['النماذج المرفوضة من الوزارة']), 0);
    const byEntity = {};
    EXCEL_DATA.forEach(r => {
      const v = normalize(r['النماذج المرفوضة من الوزارة']);
      if (v > 0) byEntity[r['الجهة']] = (byEntity[r['الجهة']] || 0) + v;
    });
    const details = Object.entries(byEntity)
      .sort((a,b) => b[1]-a[1])
      .map(([k,v]) => '• ' + k + ': <strong>' + v + '</strong>')
      .join('<br>');
    return 'إجمالي النماذج المرفوضة من الوزارة: <strong>' + total + '</strong><br><br>تفصيل حسب الجهة:<br>' + details;
  }

  // ---- رفض الإدارة ----
  if (q.includes('ادار') || q.includes('إدار')) {
    const total = EXCEL_DATA.reduce((s,r) => s + normalize(r['النماذج المرفوضة من الإدارة']), 0);
    const byEntity = {};
    EXCEL_DATA.forEach(r => {
      const v = normalize(r['النماذج المرفوضة من الإدارة']);
      if (v > 0) byEntity[r['الجهة']] = (byEntity[r['الجهة']] || 0) + v;
    });
    const details = Object.entries(byEntity)
      .sort((a,b) => b[1]-a[1])
      .map(([k,v]) => '• ' + k + ': <strong>' + v + '</strong>')
      .join('<br>');
    return 'إجمالي النماذج المرفوضة من الإدارة: <strong>' + total + '</strong><br><br>تفصيل حسب الجهة:<br>' + details;
  }

  // ---- ملخص / إجمالي ----
  if (q.includes('ملخص') || q.includes('اجمالي') || q.includes('إجمالي') || q.includes('كم')) {
    const totalAdmin = EXCEL_DATA.reduce((s,r) => s + normalize(r['النماذج المرفوضة من الإدارة']), 0);
    const totalMin   = EXCEL_DATA.reduce((s,r) => s + normalize(r['النماذج المرفوضة من الوزارة']), 0);
    return 'ملخص البيانات:<br>' +
      '• إجمالي السجلات: <strong>' + EXCEL_DATA.length + '</strong><br>' +
      '• إجمالي الرفض من الإدارة: <strong>' + totalAdmin + '</strong><br>' +
      '• إجمالي الرفض من الوزارة: <strong>' + totalMin + '</strong><br>' +
      '• عدد الجهات: <strong>' + entities.length + '</strong>';
  }

  // ---- قائمة الجهات ----
  if (q.includes('جهات') || q.includes('بلديات') || q.includes('قائمة')) {
    return 'الجهات المتاحة (<strong>' + entities.length + '</strong> جهة):<br>' +
      entities.map((e,i) => (i+1) + '. ' + e).join('<br>');
  }

  // ---- بحث عن جهة محددة ----
  const matched = entities.find(e => {
    const eName = e.replace('بلدية','').replace('محافظة','').replace('أمانة منطقة','').trim();
    return q.includes(eName) || q.includes(e);
  });
  if (matched) {
    const rows     = EXCEL_DATA.filter(r => r['الجهة'] === matched);
    const rejAdmin = rows.reduce((s,r) => s + normalize(r['النماذج المرفوضة من الإدارة']), 0);
    const rejMin   = rows.reduce((s,r) => s + normalize(r['النماذج المرفوضة من الوزارة']), 0);
    const models   = [...new Set(rows.map(r => r['النماذج']))].join('، ');
    return 'معلومات <strong>' + matched + '</strong>:<br>' +
      '• الرفض من الإدارة: <strong>' + rejAdmin + '</strong><br>' +
      '• الرفض من الوزارة: <strong>' + rejMin + '</strong><br>' +
      '• النماذج: ' + models;
  }

  // ---- تصنيف أحمر / أخضر ----
  if (q.includes('أحمر') || q.includes('احمر')) {
    const count = EXCEL_DATA.filter(r => r['تصنيف النماذج'] === 'أحمر').length;
    return 'عدد السجلات ذات التصنيف الأحمر: <strong>' + count + '</strong>';
  }
  if (q.includes('أخضر') || q.includes('اخضر')) {
    const count = EXCEL_DATA.filter(r => r['تصنيف النماذج'] === 'أخضر').length;
    return 'عدد السجلات ذات التصنيف الأخضر: <strong>' + count + '</strong>';
  }

  // ---- بحث نصي عام (جميع النتائج بلا تقليص) ----
  const words    = q.split(' ').filter(w => w.length > 2);
  const relevant = EXCEL_DATA.filter(r =>
    words.some(w => Object.values(r).join(' ').includes(w))
  );
  if (relevant.length) {
    return relevant.map(r =>
      '• الجهة: <strong>' + r['الجهة'] + '</strong> | النموذج: ' + r['النماذج'] +
      ' | رفض إدارة: <strong>' + r['النماذج المرفوضة من الإدارة'] + '</strong>' +
      ' | رفض وزارة: <strong>' + r['النماذج المرفوضة من الوزارة'] + '</strong>'
    ).join('<br>');
  }

  return null; // لا توجد إجابة محلية → أرسل للـ API
}

// ===== إرسال للـ Claude API =====
async function askClaude(userQuestion) {
  const dataContext = EXCEL_DATA.length
    ? 'البيانات الكاملة:\n' + JSON.stringify(EXCEL_DATA, null, 2)
    : 'لا توجد بيانات محملة حالياً.';

  const systemPrompt = `أنت محلل بيانات متخصص ومساعد ذكي لأمانة منطقة حائل.

قواعد صارمة يجب الالتزام بها في كل رد:
1. الرد دائماً باللغة العربية الفصحى فقط.
2. خاطب المستخدم دائماً بـ "سعادتك" في كل رد.
3. بعد كل إجابة، اطرح سؤالاً متابعاً ذا صلة لمواصلة الحوار.
4. عند عرض النتائج (جداول، قوائم، ملخصات)، أظهر جميع البيانات المتاحة بدون أي تقليص أو اختصار.
5. إذا لم يحدد سعادتك سنة أو ربعاً معيناً، فاجمع (sum) جميع القيم عبر كل السنوات والأرباع.
6. تأكد أن تفسيراتك واضحة ومنظمة ومهنية.
7. عند ذكر أرقام مهمة، أبرزها.

البيانات المحملة في النظام:
${dataContext}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userQuestion }]
    })
  });

  const data = await response.json();
  if (data.content && data.content[0]) {
    return data.content[0].text.replace(/\n/g, '<br>');
  }
  throw new Error('لا يوجد رد من الذكاء الاصطناعي');
}

// ===== الدالة الرئيسية للإرسال =====
async function sendMsg() {
  var text = inp.value.trim();
  if (!text || sendBtn.disabled) return;

  addMsg(text, 'user');
  inp.value = '';
  showTyping(true);

  try {
    // أولاً: جرب الإجابة المحلية السريعة
    const localAnswer = smartAnswer(text);

    if (localAnswer) {
      showTyping(false);
      addMsg(localAnswer, 'bot');
    } else {
      // ثانياً: أرسل للـ Claude API للأسئلة المعقدة
      const aiAnswer = await askClaude(text);
      showTyping(false);
      addMsg(aiAnswer, 'bot');
    }
  } catch (err) {
    showTyping(false);
    addMsg('عذراً، حدث خطأ أثناء معالجة طلب سعادتك. يرجى المحاولة مجدداً.', 'bot');
    console.error(err);
  }
}

inp.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMsg();
});

window.sendMsg = sendMsg;
