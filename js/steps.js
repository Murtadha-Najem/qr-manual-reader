// Turns a decoder analysis into the visual walkthrough: one step per idea, each with its
// explanation (English and Arabic), the cells to box or tint on the grid, and where to zoom.
(function (root) {
  const QRT = (root.QRT = root.QRT || {});
  const S = QRT.spec;

  const C = {
    finder: '#7c3aed', separator: '#a78bfa', timing: '#ea580c', alignment: '#0d9488', dark: '#db2777',
    format: '#ca8a04', version: '#4f46e5', focus: '#dc2626', mode: '#dc2626', count: '#2563eb',
    data: '#16a34a', ecc: '#64748b', term: '#475569', pad: '#a16207', mask: '#0891b2', error: '#f97316',
    path: '#e11d48', eci: '#9333ea',
  };
  const BLOCK_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#65a30d', '#db2777', '#4f46e5', '#0d9488'];
  const blockColor = (b) => BLOCK_COLORS[b % BLOCK_COLORS.length];

  const CHAPTERS = [
    { key: 'source', ar: 'من الصورة', en: 'From the image' },
    { key: 'intro', ar: 'بنية الكود', en: 'Structure' },
    { key: 'format', ar: 'التنسيق', en: 'Format' },
    { key: 'version', ar: 'النسخة', en: 'Version' },
    { key: 'mask', ar: 'القناع', en: 'Mask' },
    { key: 'order', ar: 'ترتيب القراءة', en: 'Reading order' },
    { key: 'ecc', ar: 'الكتل والتصحيح', en: 'Blocks and correction' },
    { key: 'message', ar: 'فك الرسالة', en: 'The message' },
    { key: 'done', ar: 'النتيجة', en: 'Result' },
  ];

  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const bin = (v, len) => v.toString(2).padStart(len, '0');
  const hex = (v, len = 2) => '0x' + v.toString(16).toUpperCase().padStart(len, '0');
  const ltr = (s) => `<span class="ltr" dir="ltr">${s}</span>`;
  // A term the walkthrough relies on, linked to the fundamentals lesson that explains it.
  const learn = (id, page, text) => `<a class="concept" href="#learn=${id}&page=${page}">${text}</a>`;

  function bitRow(parts) {
    const inner = parts
      .map((p) => [...p.bits].map((b) => `<span class="bit${p.muted ? ' muted' : ''}" style="--c:${p.color}">${b}</span>`).join(''))
      .join('<span class="bitgap"></span>');
    return `<span class="bits" dir="ltr">${inner}</span>`;
  }

  function sumOfPowers(bits) {
    const terms = [];
    const len = bits.length;
    for (let i = 0; i < len; i++) if (bits[i] === '1') terms.push(2 ** (len - 1 - i));
    return terms.length ? terms.join(' + ') : '0';
  }

  function weightsTable(bits, color) {
    const len = bits.length;
    let head = '';
    let row = '';
    for (let i = 0; i < len; i++) {
      head += `<th>${2 ** (len - 1 - i)}</th>`;
      row += `<td class="${bits[i] === '1' ? 'on' : ''}" style="--c:${color}">${bits[i]}</td>`;
    }
    return `<div class="scroll-x"><table class="weights" dir="ltr"><tr>${head}</tr><tr>${row}</tr></table></div>`;
  }

  function preview(text, max = 60) {
    const t = [...text];
    return esc(t.length > max ? t.slice(0, max).join('') + '…' : t.join(''));
  }

  function build(d, ctx) {
    ctx = ctx || {};
    const lang = ctx.lang || (QRT.i18n ? QRT.i18n.lang : 'en');
    const T = (ar, en) => (lang === 'en' ? en : ar);
    const comma = T('، ', ', ');

    const charName = (ch) => {
      if (ch === ' ') return T('مسافة', 'space');
      if (ch === '\n') return T('سطر جديد', 'new line');
      if (ch === '\t') return 'Tab';
      const code = ch.codePointAt(0);
      if (code < 32 || code === 127) return T('رمز تحكم ', 'control character ') + hex(code);
      return ch;
    };
    const charChip = (ch) => `<span class="char" dir="auto">${esc(charName(ch))}</span>`;

    const steps = [];
    const n = d.size;
    const v = d.version;
    const cat = d.cat;
    const f = d.format;
    const info = d.info;
    const ecl = f.ecl;
    const mask = f.mask;

    const cells = (pred) => {
      const out = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (pred(cat[r][c], r, c)) out.push([r, c]);
      return out;
    };
    const add = (chapter, title, body, view, extra) => {
      // Any box of bit values also shows its reading order in the corner of each cell.
      for (const b of (view && view.boxes) || []) {
        if (b.seq === undefined && b.labels && b.cells.length > 1 && b.labels.every((x) => x === '0' || x === '1')) b.seq = true;
      }
      steps.push(Object.assign({ chapter, title, body, view: Object.assign({ grid: 'raw' }, view || {}), legend: [] }, extra || {}));
    };
    const dataCells = cells((k) => k === null);

    // ---------- Source ----------
    if (ctx.source && ctx.source.kind === 'image') {
      add('source', T('من الصورة إلى شبكة', 'From the image to a grid'), T(`
        <p>البرنامج تكفّل بجزء <b>الرؤية</b> فقط: وجد مربعات التحديد الثلاثة في الصورة، وصحّح الميلان والمنظور، ثم أخذ لون مركز كل مربع صغير وقرر هل هو أسود أم أبيض.</p>
        <figure class="photo"><img src="${ctx.source.previewUrl}" alt="الصورة الأصلية مع حدود الكود"></figure>
        <p>النتيجة شبكة من الأصفار والآحاد، وهي المعروضة الآن. من هنا تبدأ القراءة اليدوية.</p>`, `
        <p>The software only handled the <b>seeing</b>: it found the three finder patterns in the photo, corrected the tilt and perspective, then took the colour at the centre of every small square and decided whether it is black or white.</p>
        <figure class="photo"><img src="${ctx.source.previewUrl}" alt="The original photo with the code outlined"></figure>
        <p>The result is a grid of ones and zeros, shown now. Reading by hand starts here.</p>`) +
        (ctx.source.note ? `<p class="note">${ctx.source.note}</p>` : ''));
    }

    // ---------- Structure ----------
    add('intro', T('هذا هو الكود', 'This is the code'), T(`
      <p>الكود شبكة من <b>${ltr(n + ' × ' + n)}</b> مربعاً صغيراً. كل مربع اسمه <b>وحدة</b> (module).</p>
      <p>المربع الأسود يعني <b>1</b>، والأبيض يعني <b>0</b>، أي أن كل مربع ${learn('bits', 1, 'بت')} واحد. كل ما سنفعله هو قراءة هذه الآحاد والأصفار بالترتيب الصحيح وفهم معناها.</p>
      <p>${learn('versions', 1, 'النسخة')} (Version) رقم من 1 إلى 40 يعبّر عن حجم الكود، ونعرفها من عدد المربعات:</p>
      <div class="calc"><div class="calc-title">الحجم يكشف رقم النسخة</div>
        <div class="calc-line" dir="ltr">Version = (${n} − 17) ÷ 4 = <b>${v}</b></div></div>
      <p class="note">النسخ من 1 (21×21) إلى 40 (177×177)، وكل نسخة تزيد 4 مربعات في الطول والعرض.</p>
      <p class="note">نرقّم الصفوف من الأعلى والأعمدة من اليسار، ونبدأ العد من 0. الأرقام تظهر على حافة الشبكة عند التكبير.</p>`, `
      <p>The code is a grid of <b>${n} × ${n}</b> small squares. Each square is called a <b>module</b>.</p>
      <p>A black module means <b>1</b> and a white one means <b>0</b>, so every module is one ${learn('bits', 1, 'bit')}. All we will do is read these ones and zeros in the right order and understand what they mean.</p>
      <p>The ${learn('versions', 1, 'version')} is a number from 1 to 40 that describes the size of the code. We can work it out by counting modules:</p>
      <div class="calc"><div class="calc-title">The size gives away the version</div>
        <div class="calc-line" dir="ltr">Version = (${n} − 17) ÷ 4 = <b>${v}</b></div></div>
      <p class="note">Versions run from 1 (21×21) to 40 (177×177), and each version adds 4 modules to the width and height.</p>
      <p class="note">Rows are numbered from the top and columns from the left, counting from 0. The numbers appear along the edge of the grid when you zoom in.</p>`));

    add('intro', T('مربعات التحديد (Finder)', 'Finder patterns'), T(`
      <p>ثلاثة مربعات كبيرة في ثلاث زوايا، شكلها ثابت في كل كود: إطار أسود 7×7، داخله إطار أبيض، وفي الوسط مربع أسود 3×3.</p>
      <p>الماسح يبحث عنها أولاً ليعرف مكان الكود واتجاهه. <b>الزاوية التي ليس فيها مربع تحديد هي دائماً الأسفل يمين.</b></p>
      <p>حول كل مربع خط أبيض بعرض وحدة واحدة (separator) يفصله عن باقي الكود.</p>
      <p class="note">هذه الأشكال لا تحمل بيانات، وسنتجاهلها عند القراءة. ${learn('anatomy', 1, 'درس أجزاء الكود')} يشرحها كلها.</p>`, `
      <p>Three large squares in three corners, identical in every code: a 7×7 black frame, a white frame inside it, and a 3×3 black square in the middle.</p>
      <p>A scanner looks for these first to find the code and its orientation. <b>The corner without a finder pattern is always the bottom right.</b></p>
      <p>Each one is surrounded by a white line one module wide (the separator) that keeps it apart from the rest of the code.</p>
      <p class="note">These shapes carry no data, so we skip them when reading. The ${learn('anatomy', 1, 'parts of a code')} lesson explains all of them.</p>`),
      { boxes: [{ cells: cells((k) => k === 'finder'), color: C.finder, fill: 0.15 }], tints: [{ cells: cells((k) => k === 'separator'), color: C.separator, alpha: 0.45 }] },
      { legend: [[C.finder, T('مربع تحديد', 'Finder pattern')], [C.separator, T('فاصل أبيض', 'Separator')]] });

    add('intro', T('خطا التوقيت (Timing)', 'Timing patterns'), T(`
      <p>خطان متقطعان يتناوب فيهما الأسود والأبيض: واحد أفقي في <b>الصف 6</b>، وواحد عمودي في <b>العمود 6</b>، ويصلان بين مربعات التحديد.</p>
      <p>يستعملهما الماسح ليعرف عرض المربع الواحد ويعد الصفوف والأعمدة بدقة. ويفيداننا نحن أيضاً: كل مربع فيهما يساوي عموداً أو صفاً واحداً.</p>
      ${v === 1 ? '<p class="note">النسخة 1 صغيرة، لذلك لا تحتوي مربعات محاذاة. تبدأ من النسخة 2.</p>' : ''}`, `
      <p>Two dotted lines of alternating black and white: one horizontal in <b>row 6</b> and one vertical in <b>column 6</b>, running between the finder patterns.</p>
      <p>A scanner uses them to measure the width of one module and count rows and columns accurately. They help us too: each module in them is exactly one row or column.</p>
      ${v === 1 ? '<p class="note">Version 1 is small, so it has no alignment patterns. They start at version 2.</p>' : ''}`),
      { boxes: [{ cells: cells((k, r, c) => k === 'timing' && (r === 6 ? c > 7 && c < n - 8 : r > 7 && r < n - 8)), color: C.timing, fill: 0.15 }] },
      { legend: [[C.timing, T('خط توقيت', 'Timing pattern')]] });

    if (v >= 2) {
      const pos = d.alignment;
      const last = pos.length - 1;
      let count = 0;
      for (let i = 0; i < pos.length; i++) for (let j = 0; j < pos.length; j++) if (!((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0))) count++;
      add('intro', T('مربعات المحاذاة (Alignment)', 'Alignment patterns'), T(`
        <p>مربعات صغيرة 5×5: إطار أسود، ثم إطار أبيض، ثم نقطة سوداء في الوسط.</p>
        <p>تساعد الماسح على تصحيح الصورة إذا كانت منحنية أو مائلة، وعددها يزيد مع حجم الكود.</p>
        <p>في النسخة ${v} يوجد <b>${count}</b> ${count === 1 ? 'مربع' : 'مربعات'}. مراكزها على تقاطعات الصفوف والأعمدة ${ltr(pos.join(', '))}، ما عدا التقاطعات التي تقع فوق مربعات التحديد.</p>`, `
        <p>Small 5×5 squares: a black frame, then a white frame, then a black dot in the middle.</p>
        <p>They help a scanner correct an image that is curved or tilted, and there are more of them as the code grows.</p>
        <p>Version ${v} has <b>${count}</b>. Their centres sit where rows and columns ${pos.join(', ')} cross, except the crossings that fall on a finder pattern.</p>`),
        { boxes: [{ cells: cells((k) => k === 'alignment'), color: C.alignment, fill: 0.15 }] },
        { legend: [[C.alignment, T('مربع محاذاة', 'Alignment pattern')]] });
    }

    add('intro', T('الوحدة الداكنة الثابتة', 'The dark module'), T(`
      <p>مربع واحد أسود دائماً، عند الزاوية العليا اليمنى لمربع التحديد السفلي، في العمود 8 والصف:</p>
      <div class="calc"><div class="calc-line" dir="ltr">4 × ${v} + 9 = <b>${4 * v + 9}</b></div></div>
      <p>موجود في كل كود ولا يحمل أي معلومة.</p>`, `
      <p>A single module that is always black, at the top right corner of the bottom finder pattern, in column 8 and row:</p>
      <div class="calc"><div class="calc-line" dir="ltr">4 × ${v} + 9 = <b>${4 * v + 9}</b></div></div>
      <p>Every code has it, and it carries no information.</p>`),
      { boxes: [{ cells: [[n - 8, 8]], color: C.dark, fill: 0.2 }], focus: [[n - 8, 8], [n - 9, 0], [n - 1, 10]] },
      { legend: [[C.dark, T('الوحدة الداكنة', 'Dark module')]] });

    const fmtCells = cells((k) => k === 'format');
    const verCells = cells((k) => k === 'version');
    add('intro', T('مناطق محجوزة للمعلومات', 'Areas reserved for information'), T(`
      <p>الشريط الذهبي حول مربعات التحديد محجوز لـ<b>معلومات التنسيق</b> (Format): مستوى تصحيح الأخطاء ورقم القناع.</p>
      <p>مكتوب مرتين للأمان: مرة حول المربع العلوي الأيسر، ومرة مقسومة بين المربعين الآخرين.</p>
      ${v >= 7 ? '<p>والكتلتان البنفسجيتان (6×3) تحملان <b>رقم النسخة</b>. توجدان فقط من النسخة 7 فما فوق.</p>' : ''}`, `
      <p>The gold strip around the finder patterns is reserved for the <b>format information</b>: the error correction level and the mask number.</p>
      <p>It is written twice for safety: once around the top left finder, and once split between the other two.</p>
      ${v >= 7 ? '<p>The two purple 6×3 blocks hold the <b>version number</b>. They only exist from version 7 upward.</p>' : ''}`),
      { boxes: [{ cells: fmtCells, color: C.format, fill: 0.25 }].concat(v >= 7 ? [{ cells: verCells, color: C.version, fill: 0.25 }] : []) },
      { legend: [[C.format, T('معلومات التنسيق', 'Format information')]].concat(v >= 7 ? [[C.version, T('معلومات النسخة', 'Version information')]] : []) });

    add('intro', T('كل ما تبقى بيانات', 'Everything else is data'), T(`
      <p>بعد استبعاد الأشكال الثابتة (صارت رمادية)، تبقى <b>${dataCells.length}</b> وحدة للبيانات، وهي المنطقة الخضراء.</p>
      <p>تكفي لـ<b>${info.totalCodewords}</b> بايت، أي ${ltr(info.totalCodewords + ' × 8 = ' + info.totalCodewords * 8)} بت${info.remainderBits ? `، وتبقى ${info.remainderBits} وحدات زائدة لا تُستعمل` : ''}.</p>
      <p>لكن قبل قراءتها نحتاج أمرين مكتوبين في معلومات التنسيق: <b>مستوى التصحيح</b> و<b>القناع</b>.</p>`, `
      <p>Once the fixed shapes are set aside (now grey), <b>${dataCells.length}</b> modules remain for data: the green area.</p>
      <p>That is room for <b>${info.totalCodewords}</b> bytes, or ${info.totalCodewords} × 8 = ${info.totalCodewords * 8} bits${info.remainderBits ? `, with ${info.remainderBits} spare modules left unused` : ''}.</p>
      <p>Before reading them we need two things written in the format information: the <b>error correction level</b> and the <b>mask</b>.</p>`),
      { dim: true, tints: [{ cells: dataCells, color: C.data, alpha: 0.3 }] },
      { legend: [[C.data, T('منطقة البيانات', 'Data area')]] });

    // ---------- Format ----------
    const c1 = f.cells.copy1;
    const c2 = f.cells.copy2;
    const fOrder = (list, from, to) => {
      const out = [];
      for (let i = from; i >= to; i--) out.push(list[i]);
      return out;
    };
    const readOrder1 = fOrder(c1, 14, 0);
    const rawStr = bin(f.raw1, 15);
    const raw2Str = bin(f.raw2, 15);
    const wordUm = f.word ^ S.FORMAT_XOR;
    const umStr = bin(wordUm, 15);
    const labelsOf = (str) => [...str];
    const fmtOverride = (str) => ({ cells: readOrder1, values: [...str].map(Number) });

    add('format', T('أين نقرأ معلومات التنسيق؟', 'Where to read the format information'), T(`
      <p>${learn('format', 1, 'معلومات التنسيق')} 15 بت تحمل مستوى التصحيح ورقم القناع. نقرأ النسخة الأولى الموجودة حول مربع التحديد العلوي الأيسر.</p>
      <p>نبدأ من <b>الصف 8</b> من اليسار إلى اليمين، ونقفز فوق خط التوقيت، ثم نصعد في <b>العمود 8</b> إلى الأعلى. الأرقام على المربعات تبين ترتيب القراءة.</p>
      <p class="note">النسخة الثانية (الذهبية الفاتحة) مقسومة بين المربعين الآخرين، ونرجع إليها إذا تلفت الأولى.</p>`, `
      <p>The ${learn('format', 1, 'format information')} is 15 bits holding the error correction level and the mask number. We read the first copy, around the top left finder pattern.</p>
      <p>Start in <b>row 8</b> from left to right, hop over the timing pattern, then climb <b>column 8</b> upward. The numbers on the modules show the reading order.</p>
      <p class="note">The second copy (light gold) is split between the other two finders. We fall back on it if the first one is damaged.</p>`),
      { boxes: [{ cells: readOrder1, color: C.format, fill: 0.2, labels: readOrder1.map((_, i) => String(i + 1)) }], tints: [{ cells: c2, color: C.format, alpha: 0.3 }], focus: readOrder1 },
      { legend: [[C.format, T('معلومات التنسيق', 'Format information')]] });

    add('format', T('نقرأ الـ15 بت', 'Reading the 15 bits'), T(`
      <p>الآن نكتب قيمة كل مربع بنفس الترتيب: الأسود 1 والأبيض 0.</p>
      <div class="calc">${bitRow([{ bits: rawStr, color: C.format }])}</div>
      <p>لكن هذه ليست القيمة الحقيقية بعد: المُرمِّز دمجها مع ${learn('format', 2, 'النمط الثابت')} قبل كتابتها، فنحتاج أن نزيله أولاً.</p>`, `
      <p>Now write down each module's value in the same order: black is 1, white is 0.</p>
      <div class="calc">${bitRow([{ bits: rawStr, color: C.format }])}</div>
      <p>This is not the real value yet: the encoder combined it with the ${learn('format', 2, 'fixed pattern')} before writing it, so we have to remove that first.</p>`),
      { boxes: [{ cells: readOrder1, color: C.format, fill: 0.2, labels: labelsOf(rawStr) }], focus: readOrder1 });

    const xorNote = f.distance1 > 0
      ? T(`<p class="warn">في هذه النسخة ${f.distance1} بت تالف. أقرب قيمة صحيحة هي ${bitRow([{ bits: umStr, color: C.format }])} وسنعتمدها.${f.distance2 === 0 ? ' والنسخة الثانية تؤكدها.' : ''}</p>`,
        `<p class="warn">This copy has ${f.distance1} damaged ${f.distance1 === 1 ? 'bit' : 'bits'}. The nearest valid value is ${bitRow([{ bits: umStr, color: C.format }])}, and that is what we use.${f.distance2 === 0 ? ' The second copy confirms it.' : ''}</p>`)
      : '';
    add('format', T('نزيل النمط الثابت (XOR)', 'Removing the fixed pattern (XOR)'), T(`
      <p>${learn('format', 2, 'النمط الثابت')} هو الرقم <b dir="ltr">101010000010010</b>. مكتوب في مواصفات QR وهو نفسه في كل كود. المُرمِّز دمجه مع البتات بعملية ${learn('xor', 1, 'XOR')}، ونحن ندمجه مرة ثانية فترجع القيمة الأصلية.</p>
      <p>القاعدة: نقارن كل بت بالبت الذي تحته، إذا تشابها نكتب 0، وإذا اختلفا نكتب 1.</p>`, `
      <p>The ${learn('format', 2, 'fixed pattern')} is the number <b>101010000010010</b>. It is written in the QR specification and is the same in every code. The encoder combined it with the bits using ${learn('xor', 1, 'XOR')}; we combine it once more and the original value comes back.</p>
      <p>The rule: compare each bit with the one below it. If they are the same, write 0; if they differ, write 1.</p>`) + `
      <table class="xor">
        <tr><th>${T('المقروء', 'Read')}</th><td>${bitRow([{ bits: rawStr, color: C.format }])}</td></tr>
        <tr><th>${T('النمط الثابت', 'Fixed pattern')}</th><td>${bitRow([{ bits: bin(S.FORMAT_XOR, 15), color: '#94a3b8' }])}</td></tr>
        <tr class="sum"><th>${T('النتيجة', 'Result')}</th><td>${bitRow([{ bits: bin(f.unmasked1, 15), color: C.focus }])}</td></tr>
      </table>
      ${xorNote}` + T(`
      <p class="note">لماذا يوجد النمط الثابت؟ بدونه، الكود بالمستوى M والقناع 0 تكون بتاته الـ15 كلها أصفاراً، فيظهر الشريط أبيض ولا يميزه الماسح عن مساحة فارغة.</p>
      <p>النتيجة مقسومة إلى ثلاثة أجزاء: <b>2</b> بت لمستوى التصحيح، ثم <b>3</b> بتات لرقم القناع، ثم <b>10</b> بتات للتحقق.</p>`, `
      <p class="note">Why does the fixed pattern exist? Without it, a code at level M with mask 0 would have all 15 bits set to zero, the strip would be entirely white, and a scanner could not tell it from empty space.</p>
      <p>The result splits into three parts: <b>2</b> bits for the error correction level, <b>3</b> bits for the mask number, and <b>10</b> check bits.</p>`) + `
      <div class="calc">${bitRow([{ bits: umStr.slice(0, 2), color: C.focus }, { bits: umStr.slice(2, 5), color: C.mask }, { bits: umStr.slice(5), color: '#94a3b8' }])}</div>
      <p class="note">${T('الشبكة تعرض الآن النتيجة بعد XOR. اضغط «قبل» تحت الشبكة لترى البتات كما قرأناها.', 'The grid now shows the result after XOR. Press "Before" under the grid to see the bits as we read them.')}</p>`,
      { boxes: [{ cells: readOrder1, color: C.format, fill: 0.2, labels: labelsOf(bin(f.unmasked1, 15)) }], override: fmtOverride(bin(f.unmasked1, 15)), focus: readOrder1 },
      { tools: ['compare'] });

    const eclRows = [['01', 'L', 7], ['00', 'M', 15], ['11', 'Q', 25], ['10', 'H', 30]];
    add('format', T('أول بتين: مستوى تصحيح الأخطاء', 'First two bits: error correction level'), T(`
      <p>البتان ${bitRow([{ bits: umStr.slice(0, 2), color: C.focus }])} يحددان ${learn('ecc', 2, 'مستوى تصحيح الأخطاء')}، أي كم يتحمل الكود من التلف:</p>`, `
      <p>The two bits ${bitRow([{ bits: umStr.slice(0, 2), color: C.focus }])} give the ${learn('ecc', 2, 'error correction level')}, meaning how much damage the code can survive:</p>`) + `
      <table class="tbl"><tr><th>${T('البتات', 'Bits')}</th><th>${T('المستوى', 'Level')}</th><th>${T('يمكن استرجاع الرسالة إذا تلف حتى', 'Message recoverable with damage up to')}</th></tr>
        ${eclRows.map(([b, l, p]) => `<tr class="${l === ecl ? 'hit' : ''}"><td dir="ltr">${b}</td><td>${l}</td><td>${T(`${p}% تقريباً`, `about ${p}%`)}</td></tr>`).join('')}</table>` + T(`
      <p>قيمتنا تعني المستوى <b>${ecl}</b>. هذا يحدد لاحقاً كم بايت من الكود بيانات وكم منها للتصحيح.</p>
      <p class="note">انتبه: الترتيب ليس أبجدياً. 00 تعني M وليس L.</p>`, `
      <p>Our value means level <b>${ecl}</b>. Later this decides how many bytes of the code are data and how many are for correction.</p>
      <p class="note">Watch out: the order is not alphabetical. 00 means M, not L.</p>`),
      { boxes: [{ cells: [c1[14], c1[13]], color: C.focus, fill: 0.25, labels: labelsOf(umStr.slice(0, 2)) }], tints: [{ cells: fOrder(c1, 12, 0), color: C.format, alpha: 0.3 }], override: fmtOverride(umStr), focus: readOrder1 });

    const maskStr = umStr.slice(2, 5);
    add('format', T('البتات 3 إلى 5: رقم القناع', 'Bits 3 to 5: the mask number'), T(`
      <p>البتات الثلاث التالية ${bitRow([{ bits: maskStr, color: C.mask }])} رقم بالنظام الثنائي:</p>`, `
      <p>The next three bits ${bitRow([{ bits: maskStr, color: C.mask }])} are a binary number:</p>`) + `
      ${weightsTable(maskStr, C.mask)}
      <div class="calc"><div class="calc-line" dir="ltr">${sumOfPowers(maskStr)} = <b>${mask}</b></div></div>` + T(`
      <p>إذن استُعمل ${learn('mask', 2, 'القناع')} <b>رقم ${mask}</b>، وقاعدته:</p>`, `
      <p>So ${learn('mask', 2, 'mask')} <b>number ${mask}</b> was used. Its rule:</p>`) + `
      <div class="calc"><div class="calc-line" dir="ltr">${S.MASK_FORMULAS[mask]}</div></div>
      <p>${T('سنشرح معنى هذا في فصل القناع.', 'The mask chapter explains what this means.')}</p>`,
      { boxes: [{ cells: [c1[12], c1[11], c1[10]], color: C.mask, fill: 0.25, labels: labelsOf(maskStr) }], tints: [{ cells: fOrder(c1, 9, 0).concat([c1[14], c1[13]]), color: C.format, alpha: 0.3 }], override: fmtOverride(umStr), focus: readOrder1 },
      { legend: [[C.mask, T('بتات القناع', 'Mask bits')]] });

    const copiesSame = f.raw1 === f.raw2;
    add('format', T('آخر 10 بتات: للتحقق', 'Last 10 bits: the check'), T(`
      <p>آخر 10 بتات لا تحمل معلومة جديدة. هي رمز تحقق (BCH) محسوب من البتات الخمس الأولى، ويستعمله الماسح ليتأكد أن القراءة سليمة أو ليصلح بتاً أو اثنين.</p>`, `
      <p>The last 10 bits carry no new information. They are a check code (BCH) computed from the first five bits, which a scanner uses to confirm the reading or repair a bit or two.</p>`) + `
      <table class="xor">
        <tr><th>${T('النسخة الأولى', 'First copy')}</th><td>${bitRow([{ bits: rawStr, color: C.format }])}</td></tr>
        <tr><th>${T('النسخة الثانية', 'Second copy')}</th><td>${bitRow([{ bits: raw2Str, color: C.format }])}</td></tr>
      </table>
      <p>${copiesSame
        ? T('النسختان متطابقتان، والتحقق سليم. نعتمد القيم التي قرأناها.', 'The two copies match and the check passes. We keep the values we read.')
        : T(`النسختان مختلفتان، فاخترنا القيمة الصحيحة الأقرب إليهما (الفرق ${f.distance1} بت في الأولى و${f.distance2} بت في الثانية).`, `The copies differ, so we took the nearest valid value (${f.distance1} bits off in the first, ${f.distance2} in the second).`)}</p>
      <p class="note">${T('النسخة الثانية تُقرأ هكذا: البتات 1 إلى 7 في العمود 8 من الأسفل إلى الأعلى، ثم البتات 8 إلى 15 في الصف 8 من اليسار إلى اليمين.', 'The second copy reads like this: bits 1 to 7 up column 8 from the bottom, then bits 8 to 15 along row 8 from left to right.')}</p>`,
      { boxes: [{ cells: fOrder(c1, 9, 0), color: '#64748b', fill: 0.2 }, { cells: fOrder(c2, 14, 0), color: C.format, fill: 0.2, labels: fOrder(c2, 14, 0).map((_, i) => String(i + 1)) }] });

    // ---------- Version ----------
    if (v >= 7 && d.versionInfo) {
      const vi = d.versionInfo;
      const topRight = vi.cells.topRight;
      const readV = fOrder(topRight, 17, 0);
      const vStr = bin(vi.raw1, 18);
      add('version', T('معلومات النسخة', 'Version information'), T(`
        <p>${learn('versions', 2, 'معلومات النسخة')} كتلة فوق مربع التحديد الأيمن من 6 صفوف × 3 أعمدة، أي 18 بت.</p>
        <p>نقرأها بالترتيب المرقّم: نبدأ من الصف السفلي ونصعد، وداخل كل صف من اليمين إلى اليسار.</p>
        <p class="note">نسخة مطابقة موجودة فوق مربع التحديد السفلي، لكن مدوّرة: صفوفها أعمدة هناك.</p>`, `
        <p>The ${learn('versions', 2, 'version information')} is a block above the top right finder, 6 rows by 3 columns: 18 bits.</p>
        <p>Read it in the numbered order: start at the bottom row and move up, and within each row go from right to left.</p>
        <p class="note">An identical copy sits above the bottom finder, but rotated: its rows are columns there.</p>`),
        { boxes: [{ cells: readV, color: C.version, fill: 0.2, labels: readV.map((_, i) => String(i + 1)) }], tints: [{ cells: vi.cells.bottomLeft, color: C.version, alpha: 0.3 }], focus: readV },
        { legend: [[C.version, T('معلومات النسخة', 'Version information')]] });
      const first6 = vStr.slice(0, 6);
      add('version', T('قراءة رقم النسخة', 'Reading the version number'), `
        <p>${T('القيم بنفس الترتيب:', 'The values in the same order:')}</p>
        <div class="calc">${bitRow([{ bits: first6, color: C.focus }, { bits: vStr.slice(6), color: '#94a3b8' }])}</div>
        <p>${T('أول 6 بتات هي رقم النسخة بالثنائي، والـ12 الباقية للتحقق:', 'The first 6 bits are the version number in binary; the other 12 are a check:')}</p>
        ${weightsTable(first6, C.focus)}
        <div class="calc"><div class="calc-line" dir="ltr">${sumOfPowers(first6)} = <b>${parseInt(first6, 2)}</b></div></div>
        <p>${vi.exact1 && vi.matchesSize
          ? T(`النسخة ${vi.value}، وهذا يطابق حجم الكود ${ltr(n + '×' + n)}.`, `Version ${vi.value}, which matches the ${n}×${n} size of the code.`)
          : T(`القراءة المباشرة فيها تلف؛ أقرب قيمة صحيحة تعطي النسخة ${vi.value}${vi.matchesSize ? '، وهي تطابق حجم الكود' : ''}.`, `The direct reading is damaged; the nearest valid value gives version ${vi.value}${vi.matchesSize ? ', which matches the size of the code' : ''}.`)}</p>
        <p class="note">${T('هنا لا يوجد نمط ثابت نخلطه، القيمة تُقرأ مباشرة.', 'There is no fixed pattern to remove here: the value is read directly.')}</p>`,
        { boxes: [{ cells: readV.slice(0, 6), color: C.focus, fill: 0.25, labels: labelsOf(first6) }, { cells: readV.slice(6), color: '#64748b', fill: 0.15 }], focus: readV });
    }

    // ---------- Mask ----------
    add('mask', T('لماذا يوجد قناع؟', 'Why is there a mask?'), T(`
      <p>لو كُتبت البيانات كما هي، قد تظهر مساحات بيضاء أو سوداء كبيرة، أو أشكال تشبه مربعات التحديد، فتربك الماسح.</p>
      <p>لذلك يقلب المُرمِّز بعض مربعات البيانات حسب قاعدة ثابتة. عنده <b>8 قواعد</b>، يجرّبها كلها ويختار التي تعطي أنظف شكل، ثم يكتب رقمها في معلومات التنسيق.</p>`, `
      <p>If the data were written as is, large white or black areas, or shapes resembling finder patterns, could appear and confuse a scanner.</p>
      <p>So the encoder flips some data modules according to a fixed rule. It has <b>8 rules</b>, tries them all, picks the one giving the cleanest result, and writes its number into the format information.</p>`) + `
      <div class="mini-masks">${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<figure class="${k === mask ? 'on' : ''}"><canvas data-mini-mask="${k}" width="84" height="84"></canvas><figcaption>${k === mask ? T('قناعنا: ', 'Ours: ') : ''}${k}</figcaption></figure>`).join('')}</div>` + T(`
      <p>المربعات الملونة في كل شكل هي التي تُقلب. القناع يُطبّق على منطقة البيانات فقط، والأشكال الثابتة لا تتأثر.</p>
      <p class="note">${learn('mask', 1, 'درس القناع')} يشرح الفكرة بالتجربة.</p>`, `
      <p>The coloured modules in each pattern are the ones that get flipped. The mask applies to the data area only; the fixed shapes are left alone.</p>
      <p class="note">The ${learn('mask', 1, 'mask lesson')} lets you try the idea yourself.</p>`),
      { dim: true });

    add('mask', T(`القناع رقم ${mask}`, `Mask number ${mask}`), `
      <div class="calc"><div class="calc-title">${T('القاعدة', 'The rule')}</div><div class="calc-line" dir="ltr">${S.MASK_FORMULAS[mask]}</div></div>` + T(`
      <p>نحسب القاعدة لكل مربع بيانات حسب رقم صفه (row) ورقم عموده (col). إذا تحققت القاعدة نقلب المربع.</p>
      <p>النقاط الزرقاء تبين كل المربعات التي تتحقق فيها القاعدة: <b>${d.maskCells.length}</b> مربعاً.</p>`, `
      <p>The rule is evaluated for every data module using its row and column. Where the rule holds, the module is flipped.</p>
      <p>The blue dots mark every module where the rule holds: <b>${d.maskCells.length}</b> modules.</p>`),
      { grid: 'raw', dim: true, maskDots: true },
      { legend: [[C.mask, T('مربع سيُقلب', 'Module to flip')]] });

    const maskFn = S.MASKS[mask];
    let exA = null;
    let exB = null;
    outer: for (let r = 9; r < n; r++) {
      for (let c = 9; c < n; c++) {
        if (cat[r][c] !== null || !maskFn(r, c)) continue;
        for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && cc >= 0 && rr < n && cc < n && cat[rr][cc] === null && !maskFn(rr, cc)) {
            exA = [r, c];
            exB = [rr, cc];
            break outer;
          }
        }
      }
    }
    if (exA) {
      const calcText = (r, c) => {
        const p = r * c;
        switch (mask) {
          case 0: return `(${r} + ${c}) mod 2 = ${r + c} mod 2 = <b>${(r + c) % 2}</b>`;
          case 1: return `${r} mod 2 = <b>${r % 2}</b>`;
          case 2: return `${c} mod 3 = <b>${c % 3}</b>`;
          case 3: return `(${r} + ${c}) mod 3 = ${r + c} mod 3 = <b>${(r + c) % 3}</b>`;
          case 4: return `(floor(${r} / 2) + floor(${c} / 3)) mod 2 = (${Math.floor(r / 2)} + ${Math.floor(c / 3)}) mod 2 = <b>${(Math.floor(r / 2) + Math.floor(c / 3)) % 2}</b>`;
          case 5: return `(${r} × ${c}) mod 2 + (${r} × ${c}) mod 3 = ${p % 2} + ${p % 3} = <b>${(p % 2) + (p % 3)}</b>`;
          case 6: return `(${p} mod 2 + ${p} mod 3) mod 2 = (${p % 2} + ${p % 3}) mod 2 = <b>${((p % 2) + (p % 3)) % 2}</b>`;
          default: return `((${r} + ${c}) mod 2 + (${r} × ${c}) mod 3) mod 2 = (${(r + c) % 2} + ${p % 3}) mod 2 = <b>${(((r + c) % 2) + (p % 3)) % 2}</b>`;
        }
      };
      const nameA = T('أ', 'A');
      const nameB = T('ب', 'B');
      add('mask', T('مثال: هل نقلب هذا المربع؟', 'Example: do we flip this module?'), `
        <div class="calc"><div class="calc-title">${T(`المربع (أ): الصف ${exA[0]}، العمود ${exA[1]}`, `Module A: row ${exA[0]}, column ${exA[1]}`)}</div>
          <div class="calc-line" dir="ltr">${calcText(exA[0], exA[1])}</div>
          <div class="calc-result yes">${T('الناتج 0، القاعدة تتحقق: <b>نقلب</b> هذا المربع.', 'The result is 0, so the rule holds: we <b>flip</b> this module.')}</div></div>
        <div class="calc"><div class="calc-title">${T(`المربع (ب): الصف ${exB[0]}، العمود ${exB[1]}`, `Module B: row ${exB[0]}, column ${exB[1]}`)}</div>
          <div class="calc-line" dir="ltr">${calcText(exB[0], exB[1])}</div>
          <div class="calc-result no">${T('الناتج ليس 0، القاعدة لا تتحقق: يبقى كما هو.', 'The result is not 0, so the rule does not hold: it stays as it is.')}</div></div>
        <p>${T('نفس الحساب يُعاد لكل مربع بيانات. لا داعي لحسابه يدوياً مربعاً مربعاً: النمط يتكرر، وبعد قليل تراه بعينك.', 'The same calculation is repeated for every data module. There is no need to do it one by one: the pattern repeats, and soon you see it at a glance.')}</p>`,
        { dim: true, maskDots: true, boxes: [{ cells: [exA], color: C.mask, fill: 0.3, labels: [nameA] }, { cells: [exB], color: '#64748b', fill: 0.2, labels: [nameB] }], focus: [exA, exB] });
    }

    add('mask', T('نطبّق القناع', 'Applying the mask'), T(`
      <p>كل مربع عليه نقطة ينقلب: <b>الأسود يصبح أبيض، والأبيض يصبح أسود</b>. باقي المربعات لا تتغير.</p>
      <p>شاهد الحركة على الشبكة. يمكنك إعادتها، أو التبديل بين <b>قبل</b> و<b>بعد</b> للمقارنة.</p>
      <p class="note">القلب هنا هو ${learn('xor', 3, 'XOR')}: تطبيق نفس القاعدة مرتين يرجع الشكل الأصلي، لهذا نزيل القناع بنفس القاعدة التي وضعته.</p>`, `
      <p>Every module with a dot flips: <b>black becomes white and white becomes black</b>. All other modules stay the same.</p>
      <p>Watch the animation on the grid. You can replay it, or switch between <b>Before</b> and <b>After</b> to compare.</p>
      <p class="note">This flip is ${learn('xor', 3, 'XOR')}: applying the same rule twice restores the original, which is why the rule that put the mask on also takes it off.</p>`),
      { grid: 'maskAnim', dim: true },
      { tools: ['replay', 'compare'] });

    add('mask', T('الشكل الجديد بعد إزالة القناع', 'The grid without the mask'), T(`
      <p>هذه هي البتات الحقيقية كما كتبها المُرمِّز. من الآن فصاعداً نقرأ من هذه الشبكة.</p>
      <p class="note">إذا نظرت جيداً قد ترى أجزاء منتظمة، خاصة قرب نهاية المسار: هذا الحشو الذي يملأ المساحة الفارغة، وسنصل إليه.</p>`, `
      <p>These are the real bits as the encoder wrote them. From here on we read from this grid.</p>
      <p class="note">Look closely and you may see regular patches, especially near the end of the path: that is the padding that fills empty space, and we will get to it.</p>`),
      { grid: 'unmasked', dim: true },
      { tools: ['compare'] });

    // ---------- Reading order ----------
    const U = { grid: 'unmasked', dim: true };
    add('order', T('مسار القراءة', 'The reading path'), T(`
      <p>نتبع ${learn('order', 1, 'مسار الأفعى')}: نبدأ من <b>الزاوية السفلى اليمنى</b>. نقرأ عمودين معاً: المربع الأيمن ثم الأيسر، ونصعد صفاً بعد صف.</p>
      <p>عند الوصول إلى الأعلى ننتقل إلى العمودين التاليين على اليسار <b>وننزل</b>، ثم نصعد، وهكذا مثل الأفعى.</p>
      <p>نتخطى كل مربع رمادي ثابت، ونتخطى عمود التوقيت (العمود 6) بالكامل.</p>`, `
      <p>We follow the ${learn('order', 1, 'snake path')}: start at the <b>bottom right corner</b>. Read two columns together, right module then left, moving up one row at a time.</p>
      <p>At the top, shift to the next two columns on the left and <b>go down</b>, then up again, winding like a snake.</p>
      <p>Skip every fixed grey module, and skip the timing column (column 6) entirely.</p>`),
      Object.assign({ path: d.order, boxes: [{ cells: [d.order[0]], color: C.path, fill: 0.4 }] }, U),
      { legend: [[C.path, T('مسار القراءة', 'Reading path')]] });

    const cw = d.codewords;
    const cwGroups = cw.map((c) => c.cells);
    const cwBits = (k) => bin(cw[k].read, 8);
    const first = cwBits(0);
    add('order', T('أول 8 مربعات = أول بايت', 'The first 8 modules are the first byte'), `
      <p>${T('أول 8 مربعات على المسار تشكل البايت الأول (codeword). الأرقام على الشبكة تبين الترتيب.', 'The first 8 modules on the path form the first byte (a codeword). The numbers on the grid show the order.')}</p>
      <div class="calc">${bitRow([{ bits: first, color: C.data }])}</div>
      <p>${T('المربع 1 أكبر قيمة (128) والمربع 8 أصغر قيمة (1). نجمع قيم الخانات التي فيها 1:', 'Module 1 is worth the most (128) and module 8 the least (1). Add up the places holding a 1:')}</p>
      ${weightsTable(first, C.data)}
      <div class="calc"><div class="calc-line" dir="ltr">${sumOfPowers(first)} = <b>${cw[0].read}</b> (${hex(cw[0].read)})</div></div>`,
      Object.assign({ boxes: [{ cells: cw[0].cells, color: C.data, fill: 0.25, labels: cw[0].cells.map((_, i) => String(i + 1)) }], path: d.order.slice(0, 8), pathStyle: 'fine', focus: cw[0].cells }, U));

    const nb = Math.min(3, cw.length - 1);
    const shades = ['#2563eb', '#d97706', '#9333ea'];
    add('order', T('البايتات التالية', 'The next bytes'), `
      <p>${T('نكمل على نفس المسار: كل 8 مربعات بايت جديد. شكل البايت على الشبكة يتغير عندما يغيّر المسار اتجاهه عند الحافة أو يلتف حول مربع ثابت، لكن الترتيب نفسه لا يتغير.', 'Continue along the same path: every 8 modules make a new byte. The shape of a byte on the grid changes when the path turns at an edge or wraps around a fixed pattern, but the order itself never changes.')}</p>
      <table class="tbl">
        <tr><th>${T('البايت', 'Byte')}</th><th>${T('البتات', 'Bits')}</th><th>${T('القيمة', 'Value')}</th></tr>
        ${[1, 2, 3].slice(0, nb).map((k) => `<tr><td><span class="swatch" style="--c:${shades[k - 1]}"></span>${k + 1}</td><td>${bitRow([{ bits: cwBits(k), color: shades[k - 1] }])}</td><td dir="ltr">${cw[k].read}</td></tr>`).join('')}
      </table>`,
      Object.assign({ boxes: [1, 2, 3].slice(0, nb).map((k) => ({ cells: cw[k].cells, color: shades[k - 1], fill: 0.22, labels: cw[k].cells.map((_, i) => String(i + 1)) })), tints: [{ cells: cw[0].cells, color: C.data, alpha: 0.25 }], focus: [1, 2, 3].slice(0, nb).flatMap((k) => cw[k].cells) }, U));

    const chipList = (arr, max, fmt) => `<div class="chips" dir="ltr">${arr.slice(0, max).map(fmt).join('')}${arr.length > max ? `<span class="chip more">+${arr.length - max}</span>` : ''}</div>`;
    add('order', T(`كل البايتات: ${info.totalCodewords} بايت`, `All the bytes: ${info.totalCodewords}`), `
      <p>${T(`بنفس الطريقة نقرأ الشبكة كلها، فنحصل على <b>${info.totalCodewords}</b> بايت. على الشبكة: كل قطعة محاطة بخط هي بايت واحد، والألوان تتناوب لتفصل البايتات عن بعضها.`, `Reading the whole grid the same way gives <b>${info.totalCodewords}</b> bytes. On the grid, each outlined piece is one byte, and the colours alternate to tell neighbouring bytes apart.`)}</p>
      ${chipList(cw, 48, (c) => `<span class="chip">${c.read}</span>`)}
      ${d.remainderCells.length ? `<p class="note">${T(`في النهاية بقيت ${d.remainderCells.length} مربعات (المؤطرة بالرمادي) لا تكفي لبايت كامل، فتُترك ولا معنى لها.`, `At the very end, ${d.remainderCells.length} modules (outlined in grey) are left over. They are not enough for a byte, so they are ignored.`)}</p>` : ''}`,
      Object.assign({ solid: true, groups: cwGroups, tints: cw.map((c, k) => ({ cells: c.cells, color: k % 2 ? '#2563eb' : '#16a34a', alpha: 0.45 })), boxes: d.remainderCells.length ? [{ cells: d.remainderCells, color: '#64748b', fill: 0.3 }] : [] }, U));

    // ---------- Blocks and error correction ----------
    const blocks = d.blocks;
    const totalEcc = info.eccPerBlock * info.numBlocks;
    const blockName = (bi) => T(`الكتلة ${bi + 1}`, `Block ${bi + 1}`);
    if (info.numBlocks === 1) {
      add('ecc', T('بيانات أم تصحيح؟', 'Data or correction?'), `
        <p>${T(`ليست كل البايتات رسالة. جزء منها ${learn('ecc', 1, 'بايتات تصحيح')} (Error Correction) تُستعمل لإصلاح الكود إذا اتسخ أو تمزق.`, `Not every byte is message. Some are ${learn('ecc', 1, 'error correction bytes')}, used to repair the code if it gets dirty or torn.`)}</p>
        <table class="tbl"><tr><th>${T(`النسخة ${v}، المستوى ${ecl}`, `Version ${v}, level ${ecl}`)}</th><th>${T('عدد البايتات', 'Bytes')}</th></tr>
          <tr><td><span class="swatch" style="--c:${C.data}"></span>${T('بيانات', 'Data')}</td><td>${info.dataCodewords}</td></tr>
          <tr><td><span class="swatch" style="--c:${C.ecc}"></span>${T('تصحيح', 'Correction')}</td><td>${totalEcc}</td></tr>
          <tr class="sum"><td>${T('المجموع', 'Total')}</td><td>${info.totalCodewords}</td></tr></table>
        <p>${T('هذه الأعداد لا تُحسب، بل تؤخذ من جدول ثابت في مواصفات الـQR لكل نسخة ومستوى.', 'These numbers are not calculated: they come from a fixed table in the QR specification for each version and level.')}</p>
        <p>${T(`هنا <b>كتلة واحدة</b>: أول ${info.dataCodewords} بايت على المسار بيانات، والباقي تصحيح.`, `Here there is <b>a single block</b>: the first ${info.dataCodewords} bytes on the path are data and the rest are correction.`)}</p>`,
        Object.assign({ solid: true, groups: cwGroups, tints: [{ cells: blocks[0].dataStream.flatMap((s) => cw[s].cells), color: C.data, alpha: 0.6 }, { cells: blocks[0].eccStream.flatMap((s) => cw[s].cells), color: C.ecc, alpha: 0.3 }] }, U),
        { legend: [[C.data, T('بايتات البيانات', 'Data bytes')], [C.ecc, T('بايتات التصحيح', 'Correction bytes')]] });
    } else {
      const blockTints = [];
      blocks.forEach((b, bi) => {
        blockTints.push({ cells: b.dataStream.flatMap((s) => cw[s].cells), color: blockColor(bi), alpha: 0.72 });
        blockTints.push({ cells: b.eccStream.flatMap((s) => cw[s].cells), color: blockColor(bi), alpha: 0.22 });
      });
      add('ecc', T(`الكود مقسوم إلى ${info.numBlocks} كتل`, `The code is split into ${info.numBlocks} blocks`), `
        <p>${T(`ليست كل البايتات رسالة. جزء منها ${learn('ecc', 1, 'بايتات تصحيح')} تُستعمل لإصلاح الكود إذا تلف.`, `Not every byte is message. Some are ${learn('ecc', 1, 'error correction bytes')}, used to repair the code if it is damaged.`)}</p>
        <p>${T(`في الأكواد الكبيرة لا تُحسب بايتات التصحيح على الرسالة كلها مرة واحدة، بل تُقسم الرسالة إلى <b>كتل</b>، ولكل كتلة بايتات تصحيح خاصة بها. من جدول المواصفات للنسخة ${v} والمستوى ${ecl}:`, `In larger codes the correction bytes are not computed over the whole message at once. The message is split into <b>blocks</b>, each with its own correction bytes. From the specification table for version ${v} at level ${ecl}:`)}</p>
        <table class="tbl"><tr><th>${T('عدد الكتل', 'Blocks')}</th><th>${T('بيانات لكل كتلة', 'Data per block')}</th><th>${T('تصحيح لكل كتلة', 'Correction per block')}</th></tr>
          <tr><td>${info.shortCount}</td><td>${info.shortDataLen}</td><td>${info.eccPerBlock}</td></tr>
          ${info.longCount ? `<tr><td>${info.longCount}</td><td>${info.longDataLen}</td><td>${info.eccPerBlock}</td></tr>` : ''}
          <tr class="sum"><td>${info.numBlocks}</td><td>${T(`${info.dataCodewords} بيانات`, `${info.dataCodewords} data`)}</td><td>${T(`${totalEcc} تصحيح`, `${totalEcc} correction`)}</td></tr></table>
        ${info.longCount ? `<p class="note">${T('الكتل ليست متساوية: بعضها أطول ببايت واحد حتى يتسع المجموع.', 'The blocks are not equal: some are one byte longer so that the total fits.')}</p>` : ''}
        <p>${T('على الشبكة: كل لون كتلة. الغامق بياناتها، والفاتح بايتات تصحيحها. لاحظ أن الألوان مخلوطة، وهذا موضوع الخطوة التالية.', 'On the grid each colour is a block: dark for its data, light for its correction bytes. Notice that the colours are mixed together; that is the subject of the next step.')}</p>`,
        Object.assign({ solid: true, groups: cwGroups, tints: blockTints }, U),
        { legend: blocks.slice(0, 10).map((b, bi) => [blockColor(bi), blockName(bi)]) });

      const round = blocks.map((b) => b.dataStream[0]);
      const maxCols = Math.min(6, info.longCount ? info.longDataLen : info.shortDataLen);
      const diagram = `<div class="scroll-x"><table class="tbl interleave"><tr><th></th>${Array.from({ length: maxCols }, (_, i) => `<th>${T(`البايت ${i + 1}`, `Byte ${i + 1}`)}</th>`).join('')}<th></th></tr>
        ${blocks.slice(0, 8).map((b, bi) => `<tr><th><span class="swatch" style="--c:${blockColor(bi)}"></span>${blockName(bi)}</th>${Array.from({ length: maxCols }, (_, i) => `<td style="--c:${blockColor(bi)}" class="cellpos">${i < b.dataLen ? '#' + (b.dataStream[i] + 1) : ''}</td>`).join('')}<td>…</td></tr>`).join('')}
        </table></div>`;
      add('ecc', T('التداخل (Interleaving)', 'Interleaving'), `
        <p>${T(`البايتات لم تُكتب كتلة بعد كتلة. كُتبت ${learn('order', 2, 'بالتناوب')}: البايت الأول من كل كتلة، ثم البايت الثاني من كل كتلة، وهكذا. وبعد انتهاء البيانات تأتي بايتات التصحيح بنفس الطريقة.`, `The bytes were not written block after block. They were ${learn('order', 2, 'interleaved')}: the first byte of every block, then the second byte of every block, and so on. After the data, the correction bytes follow the same way.`)}</p>
        <p>${T('المؤطر على الشبكة هو الجولة الأولى: البايت 1 من الكتلة 1، ثم البايت 1 من الكتلة 2، إلى آخر كتلة. الرقم في كل مربع رقم الكتلة.', 'The outlined bytes on the grid are the first round: byte 1 of block 1, then byte 1 of block 2, up to the last block. The number in each module is its block number.')}</p>
        <p>${T('الجدول يبين رقم كل بايت على مسار القراءة:', 'The table shows where each byte falls on the reading path:')}</p>
        ${diagram}
        <p class="note">${T('الفائدة: لو تلفت بقعة من الكود، يتوزع التلف على كتل مختلفة بدل أن يدمر كتلة واحدة.', 'The benefit: if one patch of the code is damaged, the damage spreads over several blocks instead of destroying one.')}</p>`,
        Object.assign({ tints: blockTints.filter((_, i) => i % 2 === 0).map((t) => Object.assign({}, t, { alpha: 0.28 })), solid: true, groups: cwGroups, boxes: round.map((s) => ({ cells: cw[s].cells, color: blockColor(cw[s].block), fill: 0.35, seq: false, labels: cw[s].cells.map(() => String(cw[s].block + 1)) })), focus: round.flatMap((s) => cw[s].cells) }, U));

      add('ecc', T('نعيد ترتيب الكتل', 'Putting the blocks back together'), `
        <p>${T('نفك التداخل: نأخذ البايتات من المسار ونرجع كل واحد إلى كتلته، ثم نضع بيانات الكتل وراء بعضها بالترتيب.', 'Undo the interleaving: take the bytes from the path, return each to its block, then place the blocks\' data one after another in order.')}</p>
        ${blocks.slice(0, 6).map((b, bi) => `<div class="block-line"><span class="bl-name"><span class="swatch" style="--c:${blockColor(bi)}"></span>${blockName(bi)}</span>${chipList(b.dataStream.map((s) => cw[s].read), 12, (x) => `<span class="chip" style="--c:${blockColor(bi)}">${x}</span>`)}</div>`).join('')}
        ${blocks.length > 6 ? `<p class="note">${T(`و${blocks.length - 6} كتل أخرى بنفس الطريقة.`, `And ${blocks.length - 6} more blocks the same way.`)}</p>` : ''}
        ${info.longCount ? `<p class="note">${T('الكتل الأطول لها بايت أخير زائد، يأتي على المسار بعد انتهاء بيانات الكتل القصيرة.', 'The longer blocks have one extra last byte, which comes on the path after the short blocks\' data has run out.')}</p>` : ''}`,
        Object.assign({ solid: true, groups: cwGroups, tints: blockTints }, U),
        { legend: blocks.slice(0, 10).map((b, bi) => [blockColor(bi), blockName(bi)]) });
    }

    const corrected = cw.filter((c) => c.corrected);
    if (d.errorCount > 0) {
      add('ecc', T(`فحص الأخطاء: ${d.errorCount} بايت تالف`, `Error check: ${d.errorCount} damaged ${d.errorCount === 1 ? 'byte' : 'bytes'}`), `
        <p>${T(`بايتات التصحيح (Reed-Solomon) كشفت أن <b>${d.errorCount}</b> بايت قُرئت خطأ، وهي البرتقالية على الشبكة. غالباً بسبب شعار أو بقعة أو تلف.`, `The correction bytes (Reed-Solomon) revealed that <b>${d.errorCount}</b> bytes were read wrongly: the orange ones on the grid. Usually this comes from a logo, a stain or damage.`)}</p>
        <table class="tbl"><tr><th>${T('البايت على المسار', 'Byte on the path')}</th><th>${T('قُرئ', 'Read')}</th><th>${T('الصحيح', 'Correct')}</th></tr>
          ${corrected.slice(0, 12).map((c) => `<tr><td>#${c.stream + 1}</td><td dir="ltr">${c.read}</td><td dir="ltr"><b>${c.value}</b></td></tr>`).join('')}</table>
        ${corrected.length > 12 ? `<p class="note">${T(`و${corrected.length - 12} بايت أخرى.`, `And ${corrected.length - 12} more.`)}</p>` : ''}
        <p>${T('هذا هو الجزء الوحيد الذي يحتاج حساباً معقداً (رياضيات حقل غالوا). أجراه البرنامج، وسنكمل بالقيم المصححة.', 'This is the only part that needs heavy maths (Galois field arithmetic). The software did it, and we continue with the corrected values.')}</p>
        ${d.rsOk ? '' : `<p class="warn">${T('بعض الكتل فيها تلف أكثر مما يمكن إصلاحه، لذلك قد تظهر أجزاء من الرسالة خطأ.', 'Some blocks have more damage than can be repaired, so parts of the message may come out wrong.')}</p>`}`,
        Object.assign({ boxes: [{ cells: corrected.flatMap((c) => c.cells), color: C.error, fill: 0.45 }] }, U),
        { legend: [[C.error, T('بايت مصحح', 'Corrected byte')]] });
    } else {
      add('ecc', T('فحص الأخطاء: الكود سليم', 'Error check: the code is intact'), `
        <p>${T('بايتات التصحيح (Reed-Solomon) تسمح بالتأكد من سلامة البيانات: نحسبها من البيانات التي قرأناها ونقارنها بالمكتوب.', 'The correction bytes (Reed-Solomon) let us confirm the data is intact: compute them from the data we read and compare with what is written.')}</p>
        <p>${d.rsOk ? T('<b>تطابقت</b>، إذن لا يوجد أي بايت تالف، والبيانات صحيحة كما قرأناها.', 'They <b>match</b>, so no byte is damaged and the data is correct as read.') : `<span class="warn">${T('لم تتطابق ولم يمكن الإصلاح.', 'They do not match, and the damage could not be repaired.')}</span>`}</p>
        <p class="note">${T('هذه الخطوة تحتاج رياضيات معقدة (حقل غالوا)، لكن مع كود سليم يمكن تجاوزها عند القراءة اليدوية. بايتات التصحيح لا تحمل جزءاً من الرسالة، فنتركها الآن.', 'This step needs heavy maths (Galois fields), but with an undamaged code you can skip it when reading by hand. Correction bytes carry no part of the message, so we set them aside now.')}</p>`,
        Object.assign({ tints: blocks.flatMap((b) => [{ cells: b.eccStream.flatMap((s) => cw[s].cells), color: C.ecc, alpha: 0.35 }]) }, U),
        { legend: [[C.ecc, T('بايتات التصحيح (لا نحتاجها للرسالة)', 'Correction bytes (not needed for the message)')]] });
    }

    // ---------- Message ----------
    const bits = d.bits;
    const bitsStr = (start, len) => bits.slice(start, start + len).join('');
    const fieldCells = (start, len) => d.bitCells(start, len);
    const dataStreamCells = d.dataStreams.flatMap((s) => cw[s].cells);
    const done = [];
    const addDone = (start, len, color) => done.push({ cells: fieldCells(start, len), color, alpha: 0.38 });
    const M = (extra) => Object.assign({ grid: 'unmasked', dim: true }, extra);
    const groups = [];
    for (let i = 0; i < Math.min(bits.length, 64); i += 8) groups.push(bitsStr(i, 8));
    const spreadNote = info.numBlocks > 1
      ? `<p class="note">${T('لأن الكتل متداخلة، قد تتوزع بتات الحقل الواحد على أماكن متباعدة في الشبكة. الرقم الصغير في زاوية كل مربع يبين ترتيب قراءته.', 'Because the blocks are interleaved, the bits of a single field can be scattered across the grid. The small number in the corner of each module shows its reading order.')}</p>`
      : '';

    add('message', T('سلسلة البتات', 'The bit stream'), `
      <p>${T(`نضع بايتات البيانات (${info.dataCodewords} بايت، بعد التصحيح) وراء بعضها، فنحصل على سلسلة من <b>${bits.length}</b> بت:`, `Place the data bytes (${info.dataCodewords}, after correction) one after another to get a stream of <b>${bits.length}</b> bits:`)}</p>
      <div class="calc stream" dir="ltr">${groups.map((g) => `<span class="grp">${g}</span>`).join(' ')}${bits.length > 64 ? ' …' : ''}</div>
      <p>${T('الرسالة داخل هذه السلسلة مكتوبة على شكل أجزاء متتالية، كل جزء هكذا:', 'Inside this stream the message is written as a series of segments, each shaped like this:')}</p>
      <div class="schema"><span style="--c:${C.mode}">${T('النوع: 4 بت', 'Mode: 4 bits')}</span><span style="--c:${C.count}">${T('العدد', 'Count')}</span><span style="--c:${C.data}">${T('البيانات', 'Data')}</span></div>
      <p>${T('وبعد آخر جزء تأتي علامة النهاية ثم الحشو.', 'After the last segment come the terminator and then padding.')}</p>
      <p class="note">${T('الرسالة لا تلتزم بحدود البايت: الحرف قد يبدأ في بايت وينتهي في البايت الذي بعده.', 'The message ignores byte boundaries: a character can start in one byte and end in the next.')}</p>
      ${spreadNote}`,
      M({ tints: [{ cells: dataStreamCells, color: C.data, alpha: 0.25 }] }),
      { legend: [[C.data, T('بايتات البيانات', 'Data bytes')]] });

    const MODE_ROWS = [
      ['0001', 'numeric', T('أرقام فقط (Numeric)', 'Numeric: digits only')],
      ['0010', 'alphanumeric', T('أرقام وحروف إنجليزية كبيرة (Alphanumeric)', 'Alphanumeric: digits and capital letters')],
      ['0100', 'byte', T('بايتات: نص عادي، روابط، عربي (Byte)', 'Byte: ordinary text, links, any language')],
      ['1000', 'kanji', T('حروف يابانية (Kanji)', 'Kanji: Japanese characters')],
      ['0111', 'eci', T('تحديد مجموعة الأحرف (ECI)', 'ECI: choose the character set')],
      ['0011', 'structuredAppend', T('جزء من سلسلة أكواد (Structured Append)', 'Structured Append: part of a series of codes')],
      ['0101', 'fnc1First', T('بيانات GS1 (FNC1)', 'FNC1: GS1 data')],
      ['0000', 'terminator', T('نهاية الرسالة', 'Terminator: end of message')],
    ];
    const MODE_MEANING = {
      numeric: (cb) => T(`الرسالة في هذا الجزء <b>أرقام فقط</b>. كل 3 أرقام تُخزن معاً في 10 بتات. البتات الـ<b>${cb}</b> التالية تعطينا عدد الأرقام.`, `This segment is <b>digits only</b>. Every 3 digits are stored together in 10 bits. The next <b>${cb}</b> bits give the number of digits.`),
      alphanumeric: (cb) => T(`الرسالة في هذا الجزء من <b>45 رمزاً</b> فقط:</p><div class="calc"><div class="calc-line" dir="ltr">0-9  A-Z  space  $ % * + - . / :</div></div><p>كل حرفين يُخزنان معاً في 11 بت. البتات الـ<b>${cb}</b> التالية تعطينا عدد الأحرف.`, `This segment uses only <b>45 symbols</b>:</p><div class="calc"><div class="calc-line" dir="ltr">0-9  A-Z  space  $ % * + - . / :</div></div><p>Every two characters are stored together in 11 bits. The next <b>${cb}</b> bits give the number of characters.`),
      byte: (cb) => T(`الرسالة في هذا الجزء <b>بايتات</b>: كل 8 بتات بايت واحد. يُستعمل للنصوص العادية والروابط والعربية. البتات الـ<b>${cb}</b> التالية تعطينا عدد البايتات.`, `This segment is <b>bytes</b>: every 8 bits are one byte. It is used for ordinary text, links and non-English scripts. The next <b>${cb}</b> bits give the number of bytes.`),
      kanji: (cb) => T(`الرسالة في هذا الجزء <b>حروف يابانية</b>: كل حرف 13 بت. البتات الـ<b>${cb}</b> التالية تعطينا عدد الحروف.`, `This segment is <b>Japanese characters</b>: 13 bits each. The next <b>${cb}</b> bits give the number of characters.`),
      eci: () => T('هذا الجزء لا يحتوي نصاً. يحدد <b>مجموعة الأحرف</b> (الترميز) التي تُقرأ بها الأجزاء التالية.', 'This segment holds no text. It sets the <b>character set</b> used to read the segments that follow.'),
      structuredAppend: () => T('هذا الكود جزء من رسالة مقسومة على عدة أكواد. البتات التالية تقول رقم هذا الجزء وعدد الأجزاء.', 'This code is one part of a message split across several codes. The next bits give this part\'s number and the total.'),
      fnc1First: () => T('الكود بصيغة GS1 المستعملة في المنتجات والشحن. لا يتبعه عدد، والأجزاء التالية تُقرأ عادياً.', 'The code uses the GS1 format common on products and shipping. No count follows, and the next segments are read normally.'),
      fnc1Second: () => T('صيغة خاصة بتطبيق معين (AIM). يتبعها 8 بتات لرقم التطبيق.', 'An application specific format (AIM). It is followed by 8 bits for the application number.'),
    };
    const UNIT = { numeric: T('رقماً', 'digits'), alphanumeric: T('حرفاً', 'characters'), byte: T('بايت', 'bytes'), kanji: T('حرفاً', 'characters') };

    let message = '';
    d.segments.forEach((seg, si) => {
      const mb = seg.modeBits;
      const modeStr = bitsStr(mb.start, 4);
      const isLater = si > 0;
      const modeTable = `<table class="tbl modes">${MODE_ROWS.map(([b, key, label]) => `<tr class="${key === seg.mode ? 'hit' : ''}"><td dir="ltr">${b}</td><td>${label}</td></tr>`).join('')}</table>`;
      const cb = seg.countBits ? seg.countBits.len : 0;
      const meaning = MODE_MEANING[seg.mode] ? MODE_MEANING[seg.mode](cb) : T('قيمة غير معروفة، لا يمكن إكمال القراءة.', 'Unknown value: reading cannot continue.');
      const range = v <= 9 ? T('1 إلى 9', '1 to 9') : v <= 26 ? T('10 إلى 26', '10 to 26') : T('27 إلى 40', '27 to 40');
      add('message', isLater ? T('جزء جديد يبدأ: نوع الترميز', 'A new segment begins: the mode') : T('أول 4 بتات: نوع الترميز (Mode)', 'First 4 bits: the mode'), `
        ${isLater
          ? `<p>${T('الكود يمكن أن يخلط أكثر من نوع ترميز ليوفر المساحة. بعد انتهاء الجزء السابق، تبدأ 4 بتات جديدة تحدد نوع الجزء التالي.', 'A code can mix several modes to save space. When the previous segment ends, 4 new bits give the mode of the next one.')}</p>`
          : `<p>${T(`أول 4 بتات في السلسلة (المؤطرة بالأحمر) تحدد ${learn('modes', 1, 'نوع الترميز')}:`, `The first 4 bits of the stream (outlined in red) give the ${learn('modes', 1, 'encoding mode')}:`)}</p>`}
        <div class="calc">${bitRow([{ bits: modeStr, color: C.mode }])}</div>
        ${modeTable}
        <p>${meaning}</p>
        ${seg.countBits && !isLater ? `<p class="note">${T(`طول حقل العدد يعتمد على النوع وعلى النسخة. للنسخ ${range} هو ${cb} بت لهذا النوع.`, `The length of the count field depends on the mode and the version. For versions ${range} it is ${cb} bits for this mode.`)}</p>` : ''}
        ${!isLater ? spreadNote : ''}`,
        M({ tints: done.slice(), boxes: [{ cells: fieldCells(mb.start, 4), color: C.mode, fill: 0.25, labels: [...modeStr] }], focus: fieldCells(mb.start, 4) }),
        { legend: [[C.mode, T('نوع الترميز', 'Mode')]] });
      addDone(mb.start, 4, C.mode);

      if (seg.eci) {
        const e = seg.eci;
        const eStr = bitsStr(e.start, e.len);
        add('message', T('رقم مجموعة الأحرف (ECI)', 'The character set number (ECI)'), `
          <p>${T(`البتات الـ${e.len} التالية رقم مجموعة الأحرف:`, `The next ${e.len} bits are the character set number:`)}</p>
          <div class="calc">${bitRow([{ bits: eStr, color: C.eci }])}</div>
          <div class="calc"><div class="calc-line" dir="ltr">${sumOfPowers(eStr.slice(e.len === 8 ? 0 : e.len === 16 ? 2 : 3))} = <b>${e.value}</b></div></div>
          <p>${T(`الرقم ${e.value} يعني <b>${e.charset ? e.charset.toUpperCase() : 'مجموعة غير معروفة'}</b>. كل البايتات بعدها تُقرأ بهذه المجموعة.`, `Number ${e.value} means <b>${e.charset ? e.charset.toUpperCase() : 'an unknown character set'}</b>. Every byte after it is read in that character set.`)}</p>
          <p class="note">${e.len > 8 ? T('أول بتات تخبر بطول الرقم نفسه: 10 تعني 16 بت، و110 تعني 24 بت.', 'The first bits give the length of the number itself: 10 means 16 bits and 110 means 24 bits.') : T('البت الأول 0 يعني أن الرقم كله في 8 بتات.', 'A first bit of 0 means the whole number fits in 8 bits.')}</p>`,
          M({ tints: done.slice(), boxes: [{ cells: fieldCells(e.start, e.len), color: C.eci, fill: 0.25, labels: [...eStr] }], focus: fieldCells(e.start, e.len) }),
          { legend: [[C.eci, T('رقم ECI', 'ECI number')]] });
        addDone(e.start, e.len, C.eci);
        return;
      }
      if (seg.append) {
        const a = seg.append;
        add('message', T('بيانات السلسلة', 'Series information'), `
          <p>${T(`هذا الكود رقم <b>${a.index + 1}</b> من <b>${a.total}</b> أكواد. آخر 8 بتات رقم تحقق مشترك بين الأكواد: ${ltr(String(a.parity))}.`, `This is code <b>${a.index + 1}</b> of <b>${a.total}</b>. The last 8 bits are a parity value shared by all the codes: ${a.parity}.`)}</p>`,
          M({ tints: done.slice(), boxes: [{ cells: fieldCells(a.start, a.len), color: C.eci, fill: 0.25, labels: [...bitsStr(a.start, a.len)] }], focus: fieldCells(a.start, a.len) }));
        addDone(a.start, a.len, C.eci);
        return;
      }
      if (seg.appIndicator) addDone(seg.appIndicator.start, 8, C.eci);
      if (!seg.countBits) return;

      const cbits = bitsStr(seg.countBits.start, cb);
      add('message', T('العدد', 'The count'), `
        <p>${T(`البتات الـ${cb} التالية (بالأزرق) رقم ثنائي يعطي طول هذا الجزء:`, `The next ${cb} bits (in blue) are a binary number giving the length of this segment:`)}</p>
        ${weightsTable(cbits, C.count)}
        <div class="calc"><div class="calc-line" dir="ltr">${sumOfPowers(cbits)} = <b>${seg.countBits.value}</b></div></div>
        <p>${T(`إذن في هذا الجزء <b>${seg.countBits.value}</b> ${UNIT[seg.mode]}.`, `So this segment holds <b>${seg.countBits.value}</b> ${UNIT[seg.mode]}.`)}</p>
        ${seg.mode === 'byte' && seg.bytes && seg.bytes.length !== seg.items.length ? `<p class="note">${T('العدد هنا بايتات وليس حروفاً: الحرف العربي مثلاً يحتاج بايتين.', 'The count here is bytes, not characters: an Arabic letter, for example, takes two bytes.')}</p>` : ''}`,
        M({ tints: done.slice(), boxes: [{ cells: fieldCells(seg.countBits.start, cb), color: C.count, fill: 0.25, labels: [...cbits] }], focus: fieldCells(seg.countBits.start, cb) }),
        { legend: [[C.count, T('العدد', 'Count')]] });
      addDone(seg.countBits.start, cb, C.count);

      const limit = si === 0 || d.segments.slice(0, si).every((s) => !s.items.length) ? 6 : 3;
      const shown = seg.items.length > limit + 1 ? seg.items.slice(0, limit) : seg.items;
      let segText = '';
      shown.forEach((it, ii) => {
        const ib = bitsStr(it.start, it.len);
        let title = '';
        let body = '';
        if (seg.mode === 'numeric') {
          title = T(`الأرقام: ${it.text}`, `Digits: ${it.text}`);
          const why = it.digits === 3
            ? T('كل 10 بتات تمثل عدداً من 3 خانات، من 000 إلى 999.', 'Every 10 bits represent a 3 digit number, from 000 to 999.')
            : it.digits === 2
              ? T('بقي رقمان فقط، لذلك خُزنا في 7 بتات بدل 10.', 'Only two digits were left, so they were stored in 7 bits instead of 10.')
              : T('بقي رقم واحد فقط، لذلك خُزن في 4 بتات.', 'Only one digit was left, so it was stored in 4 bits.');
          body = `
            <p>${why}</p>
            ${weightsTable(ib, C.data)}
            <div class="calc"><div class="calc-line" dir="ltr">${sumOfPowers(ib)} = <b>${it.value}</b></div></div>
            <p>${T(`نكتبه بـ${it.digits} ${it.digits === 1 ? 'خانة' : 'خانات'}: `, `Written with ${it.digits} ${it.digits === 1 ? 'digit' : 'digits'}: `)}${charChip(it.text)}${String(it.value).length < it.digits ? T(' (نضيف أصفاراً على اليسار)', ' (with leading zeros)') : ''}</p>`;
        } else if (seg.mode === 'alphanumeric') {
          title = it.pair ? T(`الحرفان: ${it.text}`, `Characters: ${it.text}`) : T(`الحرف الأخير: ${it.text}`, `Last character: ${it.text}`);
          const table = `<div class="alnum" dir="ltr">${[...S.ALNUM].map((ch, idx) => `<span class="${idx === it.a ? 'a' : ''} ${it.pair && idx === it.b ? 'b' : ''}"><i>${idx}</i>${ch === ' ' ? '␣' : esc(ch)}</span>`).join('')}</div>`;
          body = it.pair
            ? `
            <p>${T('كل حرفين في 11 بت. نحول البتات إلى رقم:', 'Two characters share 11 bits. Turn the bits into a number:')}</p>
            <div class="calc"><div class="calc-line" dir="ltr">${ib} = <b>${it.value}</b></div>
              <div class="calc-line" dir="ltr">${it.value} = 45 × <b class="ca">${it.a}</b> + <b class="cb">${it.b}</b></div></div>
            <p>${T(`نقسم على 45: الناتج <b class="ca">${it.a}</b> رقم الحرف الأول، والباقي <b class="cb">${it.b}</b> رقم الحرف الثاني. نبحث عنهما في جدول الرموز الـ45:`, `Divide by 45: the quotient <b class="ca">${it.a}</b> is the first character's number and the remainder <b class="cb">${it.b}</b> is the second's. Look them up in the table of 45 symbols:`)}</p>
            ${table}
            <p>${T('النتيجة: ', 'Result: ')}${charChip(it.text[0])} ${T('ثم', 'then')} ${charChip(it.text[1])}</p>`
            : `
            <p>${T('عدد الأحرف فردي، فبقي حرف واحد مخزن في 6 بتات:', 'The character count is odd, so one character is left, stored in 6 bits:')}</p>
            <div class="calc"><div class="calc-line" dir="ltr">${ib} = <b class="ca">${it.value}</b></div></div>
            ${table}
            <p>${T('النتيجة: ', 'Result: ')}${charChip(it.text)}</p>`;
        } else if (seg.mode === 'byte') {
          const bytes = it.bytes;
          const cs = seg.charset;
          title = bytes.length > 1
            ? T(`الحرف ${ii + 1}: ${charName(it.text)}`, `Character ${ii + 1}: ${charName(it.text)}`)
            : T(`البايت ${ii + 1}: ${charName(it.text)}`, `Byte ${ii + 1}: ${charName(it.text)}`);
          const csNote = ii === 0
            ? seg.charsetSource === 'eci'
              ? `<p class="note">${T(`مجموعة الأحرف محددة مسبقاً بـ ECI: ${cs.toUpperCase()}.`, `The character set was set earlier by ECI: ${cs.toUpperCase()}.`)}</p>`
              : seg.charsetSource === 'guess-utf8'
                ? `<p class="note">${T('المواصفات الأصلية تفترض مجموعة Latin-1، لكن أغلب الأكواد اليوم تستعمل UTF-8، والبايتات هنا صالحة كـ UTF-8 فنقرؤها به.', 'The original specification assumes Latin-1, but most codes today use UTF-8, and these bytes are valid UTF-8, so we read them that way.')}</p>`
                : `<p class="note">${T('البايتات ليست UTF-8 صالحة، فنستعمل المجموعة الافتراضية في المواصفات: Latin-1.', 'These bytes are not valid UTF-8, so we use the specification\'s default character set: Latin-1.')}</p>`
            : '';
          if (bytes.length === 1) {
            const b = bytes[0];
            const table = b < 128 ? 'ASCII' : cs === 'utf-8' ? 'UTF-8' : cs.toUpperCase();
            body = `
              ${weightsTable(ib, C.data)}
              <div class="calc"><div class="calc-line" dir="ltr">${sumOfPowers(ib)} = <b>${b}</b> (${hex(b)})</div></div>
              <p>${T(`الرقم ${b} في جدول ${table} هو `, `In the ${table} table, ${b} is `)}${charChip(it.text)}</p>
              ${csNote}`;
          } else if (cs === 'utf-8') {
            const lead = bytes.length === 2 ? '110' : bytes.length === 3 ? '1110' : '11110';
            const payload = bytes.map((b, k) => bin(b, 8).slice(k === 0 ? lead.length : 2)).join('');
            const cp = parseInt(payload, 2);
            const uplus = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
            body = `
              <p>${T(`البايت الأول يبدأ بـ ${bitRow([{ bits: lead, color: '#94a3b8' }])}، وهذا في UTF-8 يعني أن الحرف مكوّن من <b>${bytes.length}</b> بايت. كل بايت بعده يبدأ بـ ${bitRow([{ bits: '10', color: '#94a3b8' }])}.`, `The first byte starts with ${bitRow([{ bits: lead, color: '#94a3b8' }])}, which in UTF-8 means the character is made of <b>${bytes.length}</b> bytes. Every byte after it starts with ${bitRow([{ bits: '10', color: '#94a3b8' }])}.`)}</p>
              <table class="xor">${bytes.map((b, k) => {
                const s = bin(b, 8);
                const cut = k === 0 ? lead.length : 2;
                return `<tr><th>${T(`البايت ${k + 1} = ${b}`, `Byte ${k + 1} = ${b}`)}</th><td>${bitRow([{ bits: s.slice(0, cut), color: '#94a3b8', muted: true }, { bits: s.slice(cut), color: C.data }])}</td></tr>`;
              }).join('')}</table>
              <p>${T('نحذف البادئات الرمادية ونضع البتات الخضراء وراء بعضها:', 'Drop the grey prefixes and join the green bits together:')}</p>
              <div class="calc"><div class="calc-line" dir="ltr">${bitRow([{ bits: payload, color: C.data }])}</div>
                <div class="calc-line" dir="ltr">= ${cp} = <b>${uplus}</b></div></div>
              <p>${T(`الرمز ${uplus} في جدول Unicode هو `, `In the Unicode table, ${uplus} is `)}${charChip(it.text)}</p>
              ${csNote}`;
          } else {
            body = `
              <p>${T(`في مجموعة ${cs.toUpperCase()} هذا الحرف مكوّن من ${bytes.length} بايت: ${ltr(bytes.map((b) => hex(b)).join(' '))}.`, `In ${cs.toUpperCase()} this character is made of ${bytes.length} bytes: ${bytes.map((b) => hex(b)).join(' ')}.`)}</p>
              <p>${T('النتيجة: ', 'Result: ')}${charChip(it.text)}</p>
              ${csNote}`;
          }
        } else if (seg.mode === 'kanji') {
          title = T(`الحرف: ${it.text}`, `Character: ${it.text}`);
          body = `
            <p>${T('كل حرف ياباني 13 بت، وتحويله يمر بثلاث عمليات:', 'Each Japanese character is 13 bits, and converting it takes three operations:')}</p>
            <div class="calc">
              <div class="calc-line" dir="ltr">${ib} = <b>${it.value}</b></div>
              <div class="calc-line" dir="ltr">${it.value} ÷ 192 = ${it.hi}, remainder ${it.lo}</div>
              <div class="calc-line" dir="ltr">${it.hi} × 256 + ${it.lo} = ${hex(it.packed, 4)}</div>
              <div class="calc-line" dir="ltr">${hex(it.packed, 4)} + ${it.packed < 0x1f00 ? '0x8140' : '0xC140'} = <b>${hex(it.sjis, 4)}</b></div></div>
            <p>${T(`الرمز ${hex(it.sjis, 4)} في جدول Shift JIS هو `, `In the Shift JIS table, ${hex(it.sjis, 4)} is `)}${charChip(it.text)}</p>`;
        }
        segText += it.text;
        const soFar = message + segText;
        add('message', title, `
          ${body}
          <div class="sofar"><span>${T('الرسالة حتى الآن', 'Message so far')}</span><div dir="auto">${preview(soFar, 80)}</div></div>`,
          M({ tints: done.slice(), boxes: [{ cells: fieldCells(it.start, it.len), color: C.data, fill: 0.25, labels: [...ib] }], focus: fieldCells(it.start, it.len) }),
          { legend: [[C.data, T('بيانات', 'Data')]] });
        addDone(it.start, it.len, C.data);
      });

      const rest = seg.items.slice(shown.length);
      if (rest.length) {
        const rs = rest[0].start;
        const re = rest[rest.length - 1].start + rest[rest.length - 1].len;
        const restText = rest.map((x) => x.text).join('');
        const unit = seg.mode === 'numeric' ? T('مجموعات', 'groups') : seg.mode === 'alphanumeric' ? T('أزواج', 'pairs') : T('أحرف', 'characters');
        add('message', T(`بقية الجزء: ${rest.length} ${unit}`, `The rest of the segment: ${rest.length} ${unit}`), `
          <p>${T(`نكرر نفس العملية على كل ما تبقى من هذا الجزء (المؤطر بالأخضر، ${re - rs} بت):`, `Repeat the same process for everything left in this segment (outlined in green, ${re - rs} bits):`)}</p>
          <div class="calc" dir="auto">${preview(restText, 200)}</div>
          <div class="sofar"><span>${T('الرسالة حتى الآن', 'Message so far')}</span><div dir="auto">${preview(message + seg.text, 120)}</div></div>`,
          M({ tints: done.slice(), boxes: [{ cells: fieldCells(rs, re - rs), color: C.data, fill: 0.3 }] }),
          { legend: [[C.data, T('بقية البيانات', 'Remaining data')]] });
        addDone(rs, re - rs, C.data);
      }
      message += seg.text;
    });

    // Terminator and padding.
    const t = d.terminator;
    const endBoxes = [];
    const endTexts = [];
    if (t.len > 0) {
      const ts = bitsStr(t.start, t.len);
      endBoxes.push({ cells: fieldCells(t.start, t.len), color: C.term, fill: 0.3, labels: [...ts] });
      endTexts.push(t.implicit
        ? `<p>${T(`بقيت ${t.len} بتات فقط لا تكفي لنوع جديد، فالرسالة انتهت.`, `Only ${t.len} bits remain, not enough for another mode, so the message has ended.`)}</p>`
        : `<p>${T(`بعد آخر جزء تأتي 4 بتات ${bitRow([{ bits: ts, color: C.term }])}، وهي في جدول الأنواع تعني <b>نهاية الرسالة</b> (Terminator).`, `After the last segment come 4 bits ${bitRow([{ bits: ts, color: C.term }])}, which in the mode table mean <b>end of message</b> (the terminator).`)}</p>`);
    } else {
      endTexts.push(`<p>${T('الرسالة ملأت المساحة كلها بالضبط، فلم يبقَ مكان لعلامة النهاية.', 'The message filled the space exactly, so there was no room left for a terminator.')}</p>`);
    }
    if (d.padBits.len > 0) {
      endBoxes.push({ cells: fieldCells(d.padBits.start, d.padBits.len), color: '#94a3b8', fill: 0.3, labels: [...bitsStr(d.padBits.start, d.padBits.len)] });
      endTexts.push(`<p>${T(`ثم ${d.padBits.len} ${d.padBits.len === 1 ? 'صفر' : 'أصفار'} لإكمال البايت الحالي.`, `Then ${d.padBits.len} ${d.padBits.len === 1 ? 'zero' : 'zeros'} to complete the current byte.`)}</p>`);
    }
    add('message', T('نهاية الرسالة', 'End of the message'), endTexts.join(''),
      M({ tints: done.slice(), boxes: endBoxes, focus: endBoxes.flatMap((b) => b.cells) }),
      { legend: [[C.term, T('علامة النهاية', 'Terminator')]] });
    if (t.len) addDone(t.start, t.len, C.term);

    if (d.padBytes.length) {
      const pb = d.padBytes;
      const padCells = pb.flatMap((p) => fieldCells(p.start, 8));
      add('message', T(`الحشو: ${pb.length} بايت`, `Padding: ${pb.length} ${pb.length === 1 ? 'byte' : 'bytes'}`), `
        <p>${T(`المساحة المتبقية بعد الرسالة تُملأ بـ${learn('modes', 2, 'الحشو')}: بايتان ثابتان يتناوبان:`, `The space left after the message is filled with ${learn('modes', 2, 'padding')}: two fixed bytes that alternate:`)}</p>
        <table class="xor">
          <tr><th>236</th><td>${bitRow([{ bits: '11101100', color: C.pad }])}</td></tr>
          <tr><th>17</th><td>${bitRow([{ bits: '00010001', color: C.pad }])}</td></tr></table>
        ${chipList(pb, 32, (p) => `<span class="chip" style="--c:${C.pad}">${p.value}</span>`)}
        <p>${T('لا يحملان أي معنى، وجودهما فقط لأن كل بايتات البيانات يجب أن تُملأ قبل حساب بايتات التصحيح.', 'They mean nothing. They are there only because every data byte must be filled before the correction bytes are computed.')}</p>`,
        M({ tints: done.slice(), boxes: [{ cells: padCells, color: C.pad, fill: 0.3 }] }),
        { legend: [[C.pad, T('حشو', 'Padding')]] });
      done.push({ cells: padCells, color: C.pad, alpha: 0.38 });
    }

    // ---------- Result ----------
    const modeNames = [...new Set(d.segments.map((s) => (S.MODES[s.mode] ? S.MODES[s.mode].name : s.mode)))].join(comma);
    const eccCells = blocks.flatMap((b) => b.eccStream.flatMap((s) => cw[s].cells));
    const mismatch = ctx.source && typeof ctx.source.jsqrText === 'string' && ctx.source.jsqrText !== d.text;
    add('done', T('النتيجة', 'The result'), `
      <div class="result" dir="auto">${esc(d.text) || `<i>${T('رسالة فارغة', 'Empty message')}</i>`}</div>
      <table class="tbl summary">
        <tr><td>${T('الحجم والنسخة', 'Size and version')}</td><td>${T(`${ltr(n + '×' + n)}، النسخة ${v}`, `${n}×${n}, version ${v}`)}</td></tr>
        <tr><td>${T('مستوى التصحيح', 'Error correction')}</td><td>${T(`${ecl} (حتى ${S.ECL_RECOVERY[ecl]}% تقريباً)`, `${ecl} (up to about ${S.ECL_RECOVERY[ecl]}%)`)}</td></tr>
        <tr><td>${T('القناع', 'Mask')}</td><td>${mask}: ${ltr(S.MASK_FORMULAS[mask])}</td></tr>
        <tr><td>${T('أنواع الترميز', 'Modes')}</td><td dir="ltr">${esc(modeNames)}</td></tr>
        <tr><td>${T('البايتات', 'Bytes')}</td><td>${T(`${info.dataCodewords} بيانات + ${totalEcc} تصحيح${info.numBlocks > 1 ? ` في ${info.numBlocks} كتل` : ''}`, `${info.dataCodewords} data + ${totalEcc} correction${info.numBlocks > 1 ? ` in ${info.numBlocks} blocks` : ''}`)}</td></tr>
        <tr><td>${T('أخطاء مصححة', 'Errors corrected')}</td><td>${d.errorCount}</td></tr>
      </table>
      <p>${T('الشبكة الآن ملونة بكل ما قرأناه: ', 'The grid is now coloured by everything we read: ')}<span class="swatch" style="--c:${C.mode}"></span>${T('النوع', 'mode')}${comma}<span class="swatch" style="--c:${C.count}"></span>${T('العدد', 'count')}${comma}<span class="swatch" style="--c:${C.data}"></span>${T('البيانات', 'data')}${comma}<span class="swatch" style="--c:${C.pad}"></span>${T('الحشو', 'padding')}${comma}<span class="swatch" style="--c:${C.ecc}"></span>${T('التصحيح', 'correction')}.</p>
      ${mismatch ? `<p class="warn">${T(`ماسح آلي قرأ هذه الصورة نصاً مختلفاً: ${esc(ctx.source.jsqrText)}. غالباً أخطأنا في لون بعض المربعات عند أخذها من الصورة.`, `An automatic scanner read different text from this image: ${esc(ctx.source.jsqrText)}. Most likely a few modules were sampled with the wrong colour.`)}</p>` : ''}`,
      { grid: 'raw', tints: [{ cells: eccCells, color: C.ecc, alpha: 0.3 }].concat(done) },
      { legend: [[C.mode, T('النوع', 'Mode')], [C.count, T('العدد', 'Count')], [C.data, T('البيانات', 'Data')], [C.pad, T('الحشو', 'Padding')], [C.ecc, T('التصحيح', 'Correction')]] });

    return steps;
  }

  const chapterName = (key, lang) => {
    const c = CHAPTERS.find((x) => x.key === key);
    return c ? c[lang || (QRT.i18n ? QRT.i18n.lang : 'en')] : key;
  };

  QRT.steps = { build, CHAPTERS, chapterName, COLORS: C, BLOCK_COLORS };
})(typeof window !== 'undefined' ? window : globalThis);
