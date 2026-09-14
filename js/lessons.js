// The fundamentals track: short lessons that explain every concept the walkthrough relies on,
// each page paired with a widget to try it. Both languages live side by side; get(lang) picks one.
(function (root) {
  const QRT = (root.QRT = root.QRT || {});
  const learn = (id, page, text) => `<a class="concept" href="#learn=${id}&page=${page}">${text}</a>`;

  function get(lang) {
    lang = lang || (QRT.i18n ? QRT.i18n.lang : 'en');
    const T = (ar, en) => (lang === 'en' ? en : ar);
    const ltr = (s) => `<span class="ltr" dir="ltr">${s}</span>`;
    const q = (qAr, qEn, opts, answer, exAr, exEn) => ({ q: T(qAr, qEn), options: opts.map(([a, e]) => T(a, e)), answer, explain: T(exAr, exEn) });

    return [
      {
        id: 'bits',
        title: T('البت والبايت', 'Bits and bytes'),
        summary: T('كيف تتحول المربعات السوداء والبيضاء إلى أرقام وحروف', 'How black and white squares become numbers and letters'),
        pages: [
          {
            title: T('مربع واحد = بت واحد', 'One square is one bit'),
            body: T(`<p>كل مربع صغير في كود QR يحمل معلومة واحدة فقط: هل هو أسود أم أبيض.</p>
              <p>نسمي هذه المعلومة <b>بت</b> (bit)، ونكتب الأسود <b>1</b> والأبيض <b>0</b>.</p>
              <p>اضغط على المربعات لتقلبها بين الأسود والأبيض. لاحظ أن فوق كل مربع رقماً اسمه <b>الوزن</b>.</p>`,
            `<p>Every small square in a QR code holds just one piece of information: is it black or white?</p>
              <p>That piece of information is called a <b>bit</b>. We write black as <b>1</b> and white as <b>0</b>.</p>
              <p>Click the squares to flip them between black and white. Notice the number above each square: its <b>weight</b>.</p>`),
            widget: { type: 'bits', start: 0 },
          },
          {
            title: T('من البتات إلى رقم', 'From bits to a number'),
            body: T(`<p>لنعرف الرقم الذي تمثله مجموعة بتات، <b>نجمع أوزان المربعات السوداء فقط</b>.</p>
              <p>الأوزان تتضاعف من اليمين إلى اليسار: 1، 2، 4، 8، 16، 32، 64، 128.</p>
              <div class="calc"><div class="calc-title">مثال</div><div class="calc-line" dir="ltr">00000101 = 4 + 1 = 5</div></div>
              <p class="note">البتات تُكتب وتُقرأ دائماً من اليسار إلى اليمين، حتى لو كان النص حولها عربياً.</p>`,
            `<p>To find the number a group of bits stands for, <b>add up the weights of the black squares only</b>.</p>
              <p>The weights double from right to left: 1, 2, 4, 8, 16, 32, 64, 128.</p>
              <div class="calc"><div class="calc-title">Example</div><div class="calc-line" dir="ltr">00000101 = 4 + 1 = 5</div></div>
              <p class="note">Bits are always written and read from left to right.</p>`),
            widget: { type: 'bits', start: 0, target: 13 },
            task: T('كوّن الرقم 13', 'Make the number 13'),
          },
          {
            title: T('البايت: 8 بتات', 'A byte is 8 bits'),
            body: T(`<p>مجموعة من <b>8 بتات</b> اسمها <b>بايت</b> (byte). البايت يعطي رقماً من 0 إلى 255.</p>
              <p>وكل رقم يمكن أن يمثل حرفاً حسب جدول متفق عليه اسمه <b>ASCII</b>: مثلاً 65 هو A، و72 هو H، و32 هو المسافة.</p>
              <p class="note">Hex طريقة أقصر لكتابة نفس الرقم. ستراها أحياناً، لكنك لا تحتاجها للقراءة.</p>`,
            `<p>A group of <b>8 bits</b> is called a <b>byte</b>. A byte gives a number from 0 to 255.</p>
              <p>Each number can stand for a character according to an agreed table called <b>ASCII</b>: 65 is A, 72 is H, and 32 is a space.</p>
              <p class="note">Hex is a shorter way of writing the same number. You will see it now and then, but you do not need it for reading.</p>`),
            widget: { type: 'bits', start: 64, target: 72, showChar: true },
            task: T('كوّن الحرف H، أي الرقم 72', 'Make the letter H, which is the number 72'),
            quiz: [q('كم يساوي البايت 00001010؟', 'What is the byte 00001010?', [['10', '10'], ['5', '5'], ['1010', '1010'], ['12', '12']], 0,
              'الخانتان السوداوان وزنهما 8 و2، و8 + 2 = 10.', 'The two black places weigh 8 and 2, and 8 + 2 = 10.')],
          },
        ],
      },
      {
        id: 'xor',
        title: T('عملية XOR', 'XOR'),
        summary: T('الأداة التي يستعملها الكود ليخفي البتات ثم يُظهرها', 'The tool a code uses to hide bits and bring them back'),
        pages: [
          {
            title: T('قاعدة واحدة بسيطة', 'One simple rule'),
            body: T(`<p>XOR عملية تقارن بتين وتعطي بتاً واحداً:</p>
              <p class="big"><b>إذا تشابها النتيجة 0، وإذا اختلفا النتيجة 1.</b></p>
              <p>وعندما يكون عندنا سطران من البتات، نطبّقها على كل بت مع البت الذي تحته.</p>
              <p>جرّب: اضغط على بتات السطرين الأول والثاني وشاهد سطر النتيجة يتغير.</p>`,
            `<p>XOR compares two bits and gives back one bit:</p>
              <p class="big"><b>If they are the same, the result is 0. If they differ, the result is 1.</b></p>
              <p>With two rows of bits, apply it to each bit and the bit below it.</p>
              <p>Try it: click bits in the first and second rows and watch the result row change.</p>`),
            widget: { type: 'xor', mode: 'free', a: '10110010', b: '11100001' },
          },
          {
            title: T('احسبها بنفسك', 'Work it out yourself'),
            body: T(`<p>السطران الأولان ثابتان الآن. اضغط على مربعات <b>نتيجتك</b> حتى تصبح صحيحة.</p>
              <p>تذكّر: متشابهان = 0، مختلفان = 1.</p>`,
            `<p>The first two rows are fixed now. Click the squares in <b>your result</b> until it is correct.</p>
              <p>Remember: same = 0, different = 1.</p>`),
            widget: { type: 'xor', mode: 'solve', a: '11010011', b: '10101010' },
            task: T('اجعل كل بتات النتيجة صحيحة', 'Get every bit of the result right'),
          },
          {
            title: T('الفكرة المهمة: XOR مرتين', 'The key idea: XOR twice'),
            body: T(`<p>إذا دمجت بتات مع نمط بـXOR، ثم دمجت الناتج مع <b>نفس النمط</b> مرة ثانية، <b>ترجع البتات الأصلية بالضبط</b>.</p>
              <p>اضغط «ادمج مع النمط مرة ثانية» وتأكد بنفسك.</p>
              <p>كود QR يستعمل هذه الفكرة في مكانين: مع ${learn('format', 2, 'النمط الثابت')} في معلومات التنسيق، ومع ${learn('mask', 2, 'القناع')} في منطقة البيانات. المُرمِّز يدمج قبل الكتابة، ونحن ندمج مرة ثانية عند القراءة فنرجع الأصل.</p>`,
            `<p>If you XOR some bits with a pattern, then XOR the result with <b>the same pattern</b> again, <b>you get the original bits back exactly</b>.</p>
              <p>Press "XOR with the pattern again" and see for yourself.</p>
              <p>A QR code uses this idea in two places: with the ${learn('format', 2, 'fixed pattern')} in the format information, and with the ${learn('mask', 2, 'mask')} in the data area. The encoder applies XOR before writing, and we apply it again when reading to get the original back.</p>`),
            widget: { type: 'xor', mode: 'twice', a: '11011000', b: '10101010' },
            quiz: [
              q('ما ناتج 1 XOR 1؟', 'What is 1 XOR 1?', [['0', '0'], ['1', '1'], ['2', '2']], 0, 'البتان متشابهان، فالنتيجة 0.', 'The bits are the same, so the result is 0.'),
              q('دمجنا بتات مع نمط بـXOR. كيف نرجع البتات الأصلية؟', 'We XORed some bits with a pattern. How do we get the original bits back?',
                [['ندمج الناتج مع نفس النمط مرة ثانية', 'XOR the result with the same pattern again'], ['نقلب كل البتات', 'Flip every bit'], ['لا يمكن إرجاعها', 'They cannot be recovered']], 0,
                'XOR مع نفس النمط مرتين يلغي نفسه.', 'XOR with the same pattern twice cancels itself out.'),
            ],
          },
        ],
      },
      {
        id: 'grid',
        title: T('الشبكة والإحداثيات', 'The grid and coordinates'),
        summary: T('كيف نسمي كل مربع برقم صف ورقم عمود', 'How every square gets a row and a column number'),
        pages: [
          {
            title: T('الصف والعمود', 'Rows and columns'),
            body: T(`<p>الكود شبكة مربعة. نحدد أي مربع برقمين:</p>
              <ul><li><b>الصف</b>: يُعد من الأعلى إلى الأسفل.</li><li><b>العمود</b>: يُعد من اليسار إلى اليمين.</li></ul>
              <p>العد يبدأ من <b>0</b> وليس من 1. المربع في الزاوية العليا اليسرى هو الصف 0، العمود 0.</p>
              <p class="note">حتى في موقع عربي، أعمدة الكود تُعد من اليسار، لأن هذا ما تعتمده مواصفات QR.</p>
              <p>مرّر المؤشر فوق الشبكة لترى رقم كل مربع.</p>`,
            `<p>A code is a square grid. Any square is identified by two numbers:</p>
              <ul><li>Its <b>row</b>, counted from top to bottom.</li><li>Its <b>column</b>, counted from left to right.</li></ul>
              <p>Counting starts at <b>0</b>, not 1. The square in the top left corner is row 0, column 0.</p>
              <p>Move the pointer over the grid to see each square's numbers.</p>`),
            widget: { type: 'coords' },
          },
          {
            title: T('جرّب', 'Try it'),
            body: T(`<p>اضغط على المربع في <b>الصف 8</b> و<b>العمود 3</b>.</p>
              <p class="note">هذا الصف مهم: فيه جزء من معلومات التنسيق، وسنقرؤه لاحقاً.</p>`,
            `<p>Click the square in <b>row 8</b>, <b>column 3</b>.</p>
              <p class="note">This row matters: it holds part of the format information, which we read later.</p>`),
            widget: { type: 'coords', target: [8, 3] },
            task: T('اضغط الصف 8، العمود 3', 'Click row 8, column 3'),
            quiz: [q('في كود حجمه 21×21، ما رقم آخر عمود على اليمين؟', 'In a 21×21 code, what is the number of the last column on the right?', [['20', '20'], ['21', '21'], ['0', '0']], 0,
              'العد يبدأ من 0، فآخر عمود من 21 عموداً رقمه 20.', 'Counting starts at 0, so the last of 21 columns is number 20.')],
          },
        ],
      },
      {
        id: 'anatomy',
        title: T('أجزاء الكود', 'Parts of a code'),
        summary: T('ما هو ثابت في كل كود، وأين تسكن الرسالة', 'What is fixed in every code, and where the message lives'),
        pages: [
          {
            title: T('أجزاء ثابتة وأجزاء متغيرة', 'Fixed parts and changing parts'),
            body: T(`<p>بعض أجزاء الكود موجودة في <b>كل</b> كود بنفس الشكل والمكان. وظيفتها مساعدة الماسح على إيجاد الكود وقراءته، ولا تحمل رسالتك.</p>
              <p>الباقي هو <b>منطقة البيانات</b>، وفيها رسالتك.</p>
              <p>تحت الكود قائمة بكل جزء مع شرح قصير لوظيفته. اضغط على أي جزء لتراه ملوناً على الكود.</p>`,
            `<p>Some parts of a code appear in <b>every</b> code, with the same shape and in the same place. Their job is to help a scanner find and read the code; they do not carry your message.</p>
              <p>The rest is the <b>data area</b>, which holds your message.</p>
              <p>Below the code is a list of every part with a short explanation of what it does. Click any part to see it highlighted on the code.</p>`),
            widget: { type: 'anatomy', version: 2, part: 'finder' },
          },
          {
            title: T('الأكواد الكبيرة', 'Larger codes'),
            body: T(`<p>كلما كبر الكود زادت مربعات المحاذاة. ومن النسخة 7 فما فوق يظهر جزء إضافي: <b>معلومات النسخة</b>.</p>
              <p>اختر «النسخة 7» ثم «معلومات النسخة».</p>`,
            `<p>The larger the code, the more alignment patterns it has. From version 7 upward an extra part appears: the <b>version information</b>.</p>
              <p>Choose "Version 7", then "Version information".</p>`),
            widget: { type: 'anatomy', version: 2, part: 'all', targetPart: 'version' },
            task: T('اعرض معلومات النسخة على كود النسخة 7', 'Show the version information on a version 7 code'),
            quiz: [
              q('أي جزء يخبر الماسح باتجاه الكود؟', 'Which part tells a scanner which way up the code is?',
                [['مربعات التحديد الثلاثة', 'The three finder patterns'], ['خطا التوقيت', 'The timing patterns'], ['الوحدة الداكنة', 'The dark module']], 0,
                'الزاوية التي ليس فيها مربع تحديد هي دائماً الأسفل يمين.', 'The corner without a finder pattern is always the bottom right.'),
              q('هل تحمل مربعات المحاذاة جزءاً من الرسالة؟', 'Do alignment patterns carry part of the message?', [['لا، هي ثابتة', 'No, they are fixed'], ['نعم', 'Yes']], 0,
                'كل الأجزاء الملونة غير الخضراء ثابتة ولا تحمل الرسالة.', 'Every coloured part other than green is fixed and carries no message.'),
            ],
          },
        ],
      },
      {
        id: 'versions',
        title: T('النسخ والأحجام', 'Versions and sizes'),
        summary: T('لماذا تختلف أحجام الأكواد، وماذا يتغير معها', 'Why codes come in different sizes, and what changes with size'),
        pages: [
          {
            title: T('النسخة تعني الحجم', 'Version means size'),
            body: T(`<p>كل كود QR له <b>نسخة</b> (Version) من 1 إلى 40. النسخة هنا ليست رقم إصدار برنامج، بل هي <b>درجة الحجم</b>.</p>
              <p>النسخة 1 أصغر كود: 21×21 مربعاً. وكل نسخة تزيد 4 مربعات في الطول والعرض:</p>
              <div class="calc"><div class="calc-line" dir="ltr">Size = 17 + 4 × Version</div></div>
              <p>وبالعكس: إذا عددت المربعات عرفت النسخة.</p>
              <div class="calc"><div class="calc-line" dir="ltr">Version = (Size − 17) ÷ 4</div></div>
              <p>حرّك المؤشر وشاهد الكود يكبر.</p>`,
            `<p>Every QR code has a <b>version</b> from 1 to 40. Here "version" is not a software release number: it is a <b>size grade</b>.</p>
              <p>Version 1 is the smallest code: 21×21 modules. Each version adds 4 modules to the width and the height:</p>
              <div class="calc"><div class="calc-line" dir="ltr">Size = 17 + 4 × Version</div></div>
              <p>And the other way round: count the modules and you know the version.</p>
              <div class="calc"><div class="calc-line" dir="ltr">Version = (Size − 17) ÷ 4</div></div>
              <p>Move the slider and watch the code grow.</p>`),
            widget: { type: 'versions', start: 1 },
          },
          {
            title: T('ماذا يتغير مع الحجم', 'What changes with size'),
            body: T(`<p>كلما كبرت النسخة:</p>
              <ul><li><b>تتسع لرسالة أطول</b>.</li><li>تزيد <b>مربعات المحاذاة</b> (الخضراء الداكنة).</li><li>من النسخة 7 تظهر <b>معلومات النسخة</b> (البنفسجية).</li></ul>
              <p>المُرمِّز يختار عادة <b>أصغر نسخة تكفي رسالتك</b>. رابط قصير يكفيه كود صغير، ونص طويل يحتاج كوداً كبيراً.</p>`,
            `<p>As the version grows:</p>
              <ul><li>It <b>holds a longer message</b>.</li><li>It has more <b>alignment patterns</b> (dark green).</li><li>From version 7 the <b>version information</b> appears (purple).</li></ul>
              <p>An encoder normally picks the <b>smallest version that fits your message</b>. A short link needs a small code; a long text needs a big one.</p>`),
            widget: { type: 'versions', start: 1, targetVersion: 10 },
            task: T('حرّك المؤشر إلى الكود الذي حجمه 57×57', 'Move the slider to the code that is 57×57'),
            quiz: [q('كود حجمه 29×29، ما نسخته؟', 'A code is 29×29. What is its version?', [['3', '3'], ['2', '2'], ['29', '29']], 0, '(29 − 17) ÷ 4 = 3.', '(29 − 17) ÷ 4 = 3.')],
          },
        ],
      },
      {
        id: 'ecc',
        title: T('تصحيح الأخطاء', 'Error correction'),
        summary: T('كيف يبقى الكود مقروءاً حتى لو تمزق جزء منه', 'How a code stays readable even when part of it is torn'),
        pages: [
          {
            title: T('بايتات احتياطية', 'Spare bytes'),
            body: T(`<p>المُرمِّز لا يكتب رسالتك فقط. يضيف بعدها <b>بايتات تصحيح</b> (Error Correction) محسوبة من الرسالة بطريقة رياضية اسمها Reed-Solomon.</p>
              <p>إذا تلف جزء من الكود، يستعمل الماسح هذه البايتات ليعيد بناء ما تلف.</p>
              <p class="big"><b>كل بايتي تصحيح يستطيعان إصلاح بايت تالف واحد.</b></p>
              <p>جرّب: اضغط أو اسحب على الكود لتقلب مربعات، وراقب الشريط: كم بايتاً تلف، وكم يمكن إصلاحه.</p>`,
            `<p>An encoder does not write only your message. After it, it adds <b>error correction bytes</b> computed from the message with a mathematical method called Reed-Solomon.</p>
              <p>If part of the code gets damaged, a scanner uses these bytes to rebuild what was lost.</p>
              <p class="big"><b>Every two correction bytes can repair one damaged byte.</b></p>
              <p>Try it: click or drag across the code to flip modules, and watch the bar: how many bytes are damaged, and how many can be repaired.</p>`),
            widget: { type: 'damage', text: 'HELLO', ecl: 'M' },
            task: T('أتلف الكود حتى يصبح غير مقروء', 'Damage the code until it can no longer be read'),
          },
          {
            title: T('أربعة مستويات', 'Four levels'),
            body: T(`<p>عندما تصنع كوداً تختار كم تريد من الحماية:</p>
              <table class="tbl"><tr><th>المستوى</th><th>يتحمل تلف حتى</th></tr>
                <tr><td dir="ltr">L</td><td>7% تقريباً</td></tr><tr><td dir="ltr">M</td><td>15% تقريباً</td></tr>
                <tr><td dir="ltr">Q</td><td>25% تقريباً</td></tr><tr><td dir="ltr">H</td><td>30% تقريباً</td></tr></table>
              <p>حماية أكثر تعني بايتات تصحيح أكثر، فيكبر الكود لنفس الرسالة. غيّر المستوى إلى H وأتلف الكود مرة أخرى.</p>
              <p class="note">عند القراءة بالعين لكود سليم لا نحتاج حساب التصحيح. نحتاج فقط أن نعرف أين تنتهي بايتات البيانات وأين تبدأ بايتات التصحيح، والعدد يؤخذ من جدول ثابت.</p>`,
            `<p>When you make a code you choose how much protection you want:</p>
              <table class="tbl"><tr><th>Level</th><th>Survives damage up to</th></tr>
                <tr><td dir="ltr">L</td><td>about 7%</td></tr><tr><td dir="ltr">M</td><td>about 15%</td></tr>
                <tr><td dir="ltr">Q</td><td>about 25%</td></tr><tr><td dir="ltr">H</td><td>about 30%</td></tr></table>
              <p>More protection means more correction bytes, so the same message needs a bigger code. Switch the level to H and damage the code again.</p>
              <p class="note">Reading an undamaged code by eye, you never compute the correction. You only need to know where the data bytes end and the correction bytes begin, and that count comes from a fixed table.</p>`),
            widget: { type: 'damage', text: 'HELLO', ecl: 'H' },
            quiz: [q('نفس الرسالة بالمستوى H مقارنة بالمستوى L:', 'The same message at level H, compared with level L:',
              [['تحتاج كوداً مساوياً أو أكبر، وتتحمل تلفاً أكثر', 'Needs the same size or a bigger code, and survives more damage'], ['تحتاج كوداً أصغر', 'Needs a smaller code'], ['لا فرق', 'Makes no difference']], 0,
              'H يضيف بايتات تصحيح أكثر، فتحتاج مساحة أكثر.', 'H adds more correction bytes, so it needs more room.')],
          },
        ],
      },
      {
        id: 'format',
        title: T('معلومات التنسيق والنمط الثابت', 'Format information and the fixed pattern'),
        summary: T('أول 15 بت نقرؤها، ولماذا تُخلط برقم ثابت', 'The first 15 bits we read, and why they are mixed with a fixed number'),
        pages: [
          {
            title: T('ماذا تحمل معلومات التنسيق', 'What the format information holds'),
            body: T(`<p>قبل قراءة أي بيانات نحتاج معلومتين:</p>
              <ul><li><b>مستوى التصحيح</b>: بتان.</li><li><b>رقم القناع</b>: 3 بتات.</li></ul>
              <p>يُضاف إليها <b>10 بتات تحقق</b> محسوبة منهما بقاعدة ثابتة. وظيفتها كشف الخطأ إذا قرأنا بتاً خطأ، ولا تحمل معلومة جديدة.</p>
              <p>المجموع <b>15 بت</b>، مكتوبة مرتين حول مربعات التحديد (الشريط الذهبي).</p>
              <p>اختر مستوى وقناعاً: تحت الأزرار يظهر معنى اختيارك، وعلى الكود تتغير البتات.</p>`,
            `<p>Before reading any data we need two pieces of information:</p>
              <ul><li>The <b>error correction level</b>: 2 bits.</li><li>The <b>mask number</b>: 3 bits.</li></ul>
              <p>They are followed by <b>10 check bits</b> computed from them by a fixed rule. Their job is to catch a misread bit; they add no new information.</p>
              <p>That makes <b>15 bits</b>, written twice around the finder patterns (the gold strip).</p>
              <p>Pick a level and a mask: below the buttons you will see what your choice means, and the bits change on the code.</p>`),
            widget: { type: 'format', ecl: 'Q', mask: 3 },
          },
          {
            title: T('ما هو النمط الثابت؟', 'What is the fixed pattern?'),
            body: T(`<p><b>النمط الثابت</b> هو هذا الرقم:</p>
              <div class="calc"><div class="calc-line" dir="ltr">101010000010010</div></div>
              <p>مكتوب في مواصفات QR، وهو <b>نفسه في كل كود في العالم</b>. لا يتغير أبداً، ولا يُحسب من أي شيء.</p>
              <p>قبل أن يكتب المُرمِّز الـ15 بت، يدمجها مع النمط الثابت بـ${learn('xor', 1, 'XOR')}. ونحن عند القراءة ندمجها معه مرة ثانية فترجع القيمة الأصلية، لأن ${learn('xor', 3, 'XOR مرتين يلغي نفسه')}.</p>
              <p><b>لماذا يوجد؟</b> اختر المستوى <b>M</b> والقناع <b>0</b>، ثم فعّل «بدون النمط الثابت». ستجد كل البتات أصفاراً، فيظهر الشريط أبيض بالكامل. شريط أبيض لا يختلف عن مساحة فارغة، فلا يستطيع الماسح التأكد أنه قرأ شيئاً. النمط الثابت يضمن أن الشريط فيه أسود وأبيض دائماً.</p>`,
            `<p>The <b>fixed pattern</b> is this number:</p>
              <div class="calc"><div class="calc-line" dir="ltr">101010000010010</div></div>
              <p>It is written in the QR specification and is <b>the same in every code in the world</b>. It never changes and is not computed from anything.</p>
              <p>Before writing the 15 bits, the encoder combines them with the fixed pattern using ${learn('xor', 1, 'XOR')}. When reading, we combine them with it again and the original value comes back, because ${learn('xor', 3, 'XOR twice cancels itself out')}.</p>
              <p><b>Why does it exist?</b> Choose level <b>M</b> and mask <b>0</b>, then switch on "Without the fixed pattern". Every bit becomes zero and the strip turns completely white. A white strip looks exactly like empty space, so a scanner cannot be sure it read anything. The fixed pattern guarantees the strip always contains both black and white.</p>`),
            widget: { type: 'format', ecl: 'Q', mask: 3 },
            task: T('اختر M والقناع 0، وفعّل «بدون النمط الثابت»', 'Choose M and mask 0, then switch on "Without the fixed pattern"'),
            quiz: [
              q('النمط الثابت 101010000010010:', 'The fixed pattern 101010000010010:',
                [['هو نفسه في كل كود QR', 'Is the same in every QR code'], ['يختلف من كود لآخر', 'Differs from code to code'], ['يُحسب من الرسالة', 'Is computed from the message']], 0,
                'رقم واحد محدد في المواصفات لكل الأكواد.', 'It is a single number set in the specification for all codes.'),
              q('كيف نزيله عند القراءة؟', 'How do we remove it when reading?',
                [['ندمج البتات المقروءة معه بـXOR مرة ثانية', 'XOR the bits we read with it once more'], ['نحذف أول 15 بت', 'Delete the first 15 bits'], ['نقلب كل البتات', 'Flip every bit']], 0,
                'XOR مع نفس النمط مرتين يرجع الأصل.', 'XOR with the same pattern twice restores the original.'),
            ],
          },
        ],
      },
      {
        id: 'mask',
        title: T('القناع', 'The mask'),
        summary: T('لماذا تُقلب بعض مربعات البيانات، وكيف نرجعها', 'Why some data modules are flipped, and how to flip them back'),
        pages: [
          {
            title: T('المشكلة', 'The problem'),
            body: T(`<p>الرسالة بعد تحويلها إلى بتات قد تعطي أشكالاً تربك الماسح: صفوف أو أعمدة طويلة بلون واحد، مساحات بيضاء كبيرة، أو شكل يشبه مربع تحديد في غير مكانه.</p>
              <p>في الشكل الأول، <b>قبل القناع</b>، الخطوط الطويلة بلون واحد (5 مربعات أو أكثر) ملونة بالأحمر.</p>
              <p class="note">الأجزاء الرمادية ثابتة، والقناع لا يلمسها.</p>`,
            `<p>Once a message becomes bits, it can form shapes that confuse a scanner: long rows or columns of one colour, large white areas, or something that looks like a finder pattern in the wrong place.</p>
              <p>In the first picture, <b>before the mask</b>, long runs of a single colour (5 modules or more) are shown in red.</p>
              <p class="note">The grey parts are fixed; the mask never touches them.</p>`),
            widget: { type: 'mask', hidePenalty: true },
          },
          {
            title: T('الحل: قاعدة تقلب بعض المربعات', 'The fix: a rule that flips some modules'),
            body: T(`<p><b>القناع</b> (Mask) قاعدة رياضية تختار مربعات معينة من منطقة البيانات. كل مربع تختاره القاعدة <b>ينقلب</b>: الأسود يصبح أبيض، والأبيض يصبح أسود.</p>
              <p>بمعنى آخر: القناع هو ${learn('xor', 3, 'XOR')} بين البيانات وشكل القاعدة (الشكل الأزرق في الوسط).</p>
              <p>يوجد <b>8 قواعد</b> مرقمة من 0 إلى 7، وتحت الأزرار يظهر شكل القاعدة التي تختارها بالكلمات. المُرمِّز يجرّبها كلها، ويعطي كل واحدة <b>عقوبة</b> (نقاطاً سيئة) على الأشكال المزعجة، ثم يختار صاحبة <b>أقل عقوبة</b> ويكتب رقمها في ${learn('format', 1, 'معلومات التنسيق')}.</p>
              <p>جرّب القواعد وقارن العقوبات.</p>`,
            `<p>A <b>mask</b> is a mathematical rule that picks certain modules in the data area. Every module the rule picks is <b>flipped</b>: black becomes white and white becomes black.</p>
              <p>Put another way, the mask is ${learn('xor', 3, 'XOR')} between the data and the rule's pattern (the blue picture in the middle).</p>
              <p>There are <b>8 rules</b>, numbered 0 to 7, and below the buttons the rule you pick is described in words. The encoder tries all of them, gives each a <b>penalty</b> (bad points) for troublesome shapes, picks the one with the <b>lowest penalty</b>, and writes its number into the ${learn('format', 1, 'format information')}.</p>
              <p>Try the rules and compare their penalties.</p>`),
            widget: { type: 'mask', start: 0, task: true },
            task: T('اختر القناع صاحب أقل عقوبة', 'Pick the mask with the lowest penalty'),
          },
          {
            title: T('إزالة القناع عند القراءة', 'Removing the mask when reading'),
            body: T(`<p>عندما نقرأ كوداً نجد بيانات <b>مقلوبة بالقناع</b>. نعرف رقم القناع من معلومات التنسيق، ثم نطبّق <b>نفس القاعدة</b> مرة ثانية فترجع البيانات الأصلية.</p>
              <p>أي أن الشكل «بعد القناع» هو ما نراه في الكود، والشكل «قبل القناع» هو ما نريد الوصول إليه.</p>
              <p class="note">القناع يُطبّق على منطقة البيانات فقط. مربعات التحديد والتوقيت ومعلومات التنسيق لا تتغير.</p>`,
            `<p>When we read a code, the data we find has been <b>flipped by the mask</b>. We learn the mask number from the format information, then apply <b>the same rule</b> again and the original data comes back.</p>
              <p>In other words, the "after the mask" picture is what we see in the code, and "before the mask" is what we want to reach.</p>
              <p class="note">The mask applies to the data area only. Finder patterns, timing patterns and format information do not change.</p>`),
            widget: { type: 'mask', hidePenalty: true },
            quiz: [
              q('معلومات التنسيق تقول إن القناع 5. كيف نزيله؟', 'The format information says mask 5. How do we remove it?',
                [['نطبّق القاعدة 5 مرة ثانية', 'Apply rule 5 again'], ['نطبّق القاعدة 0', 'Apply rule 0'], ['نقلب كل مربعات الكود', 'Flip every module in the code']], 0,
                'القلب مرتين بنفس القاعدة يرجع الأصل.', 'Flipping twice with the same rule restores the original.'),
              q('هل يغيّر القناع مربعات التحديد؟', 'Does the mask change the finder patterns?', [['لا، يُطبّق على منطقة البيانات فقط', 'No, it applies to the data area only'], ['نعم', 'Yes']], 0,
                'الأجزاء الثابتة يجب أن تبقى كما هي حتى يجدها الماسح.', 'The fixed parts must stay as they are so that a scanner can find them.'),
            ],
          },
        ],
      },
      {
        id: 'modes',
        title: T('أنواع الترميز وشكل الرسالة', 'Encoding modes and message layout'),
        summary: T('كيف تُكتب الأرقام والحروف داخل البتات', 'How digits and letters are written into bits'),
        pages: [
          {
            title: T('أربعة أنواع ترميز', 'Four encoding modes'),
            body: T(`<p>الأرقام تحتاج بتات أقل من الحروف، لذلك يختار المُرمِّز <b>نوع الترميز</b> (Mode) الذي يوفر المساحة:</p>
              <table class="tbl"><tr><th>النوع</th><th>يقبل</th><th>المساحة</th></tr>
                <tr><td dir="ltr">Numeric</td><td>أرقام 0 إلى 9 فقط</td><td>كل 3 أرقام في 10 بتات</td></tr>
                <tr><td dir="ltr">Alphanumeric</td><td>أرقام، حروف إنجليزية كبيرة، مسافة، و${ltr('$ % * + - . / :')}</td><td>كل حرفين في 11 بت</td></tr>
                <tr><td dir="ltr">Byte</td><td>أي نص، بما فيه العربي</td><td>كل بايت 8 بتات، والحرف العربي بايتان</td></tr>
                <tr><td dir="ltr">Kanji</td><td>حروف يابانية</td><td>كل حرف 13 بت</td></tr></table>
              <p>اكتب نصاً وشاهد كم بتاً يحتاج بكل نوع.</p>`,
            `<p>Digits need fewer bits than letters, so the encoder picks the <b>encoding mode</b> that saves the most space:</p>
              <table class="tbl"><tr><th>Mode</th><th>Accepts</th><th>Space</th></tr>
                <tr><td>Numeric</td><td>Digits 0 to 9 only</td><td>3 digits in 10 bits</td></tr>
                <tr><td>Alphanumeric</td><td>Digits, capital letters, space, and $ % * + - . / :</td><td>2 characters in 11 bits</td></tr>
                <tr><td>Byte</td><td>Any text, in any language</td><td>8 bits per byte; an Arabic letter takes 2 bytes</td></tr>
                <tr><td>Kanji</td><td>Japanese characters</td><td>13 bits per character</td></tr></table>
              <p>Type some text and see how many bits each mode needs.</p>`),
            widget: { type: 'modes', text: '2026' },
          },
          {
            title: T('شكل الرسالة داخل البتات', 'How the message is laid out in bits'),
            body: T(`<p>الرسالة تُكتب بهذا الترتيب:</p>
              <ol>
                <li><b>النوع</b>: 4 بتات تقول أي ترميز. مثلاً 0001 أرقام، و0010 Alphanumeric، و0100 Byte.</li>
                <li><b>العدد</b>: كم حرفاً في الرسالة. طول هذا الحقل يعتمد على النوع وعلى النسخة.</li>
                <li><b>البيانات</b>: الحروف نفسها بطريقة ترميزها.</li>
                <li><b>النهاية</b>: أربعة أصفار 0000.</li>
                <li><b>الحشو</b>: إذا بقيت مساحة تُملأ بالبايتين 11101100 و00010001 بالتناوب، ولا معنى لهما.</li>
              </ol>
              <p class="note">الرسالة الواحدة قد تحتوي أكثر من جزء، كل جزء بنوعه وعدده، مثل رمز طلب بحروف ثم رقم طويل.</p>
              <p>اكتب في المربع نصاً يقبله Alphanumeric وفيه حرف إنجليزي كبير، وشاهد شكله.</p>`,
            `<p>A message is written in this order:</p>
              <ol>
                <li><b>Mode</b>: 4 bits saying which encoding. For example 0001 is Numeric, 0010 Alphanumeric and 0100 Byte.</li>
                <li><b>Count</b>: how many characters the message has. The length of this field depends on the mode and the version.</li>
                <li><b>Data</b>: the characters themselves, in that mode's encoding.</li>
                <li><b>Terminator</b>: four zeros, 0000.</li>
                <li><b>Padding</b>: any space left over is filled with the bytes 11101100 and 00010001 in turn. They mean nothing.</li>
              </ol>
              <p class="note">One message can contain several segments, each with its own mode and count, such as an order code in letters followed by a long number.</p>
              <p>Type text that Alphanumeric accepts and that contains a capital letter, and watch its layout.</p>`),
            widget: { type: 'modes', text: '2026', task: 'alnum' },
            task: T('اكتب نصاً يقبله Alphanumeric وفيه حرف إنجليزي', 'Type text that Alphanumeric accepts, with a capital letter in it'),
            quiz: [
              q('أول 4 بتات في الرسالة هي 0001. ماذا تعني؟', 'The first 4 bits of a message are 0001. What does that mean?',
                [['الرسالة أرقام فقط', 'The message is digits only'], ['الرسالة نص عربي', 'The message is Arabic text'], ['نهاية الرسالة', 'End of the message']], 0,
                '0001 هو نوع Numeric.', '0001 is Numeric mode.'),
              q('لماذا يوجد حشو في آخر البيانات؟', 'Why is there padding at the end of the data?',
                [['لملء المساحة المتبقية فقط، ولا معنى له', 'Only to fill leftover space; it means nothing'], ['لأنه جزء من الرسالة', 'It is part of the message'], ['لتحديد القناع', 'It sets the mask']], 0,
                'كل بايتات البيانات يجب أن تمتلئ قبل حساب بايتات التصحيح.', 'Every data byte must be filled before the correction bytes are computed.'),
            ],
          },
        ],
      },
      {
        id: 'order',
        title: T('ترتيب القراءة والكتل', 'Reading order and blocks'),
        summary: T('من أين تبدأ القراءة، وكيف تتوزع البايتات', 'Where reading starts, and how the bytes are spread out'),
        pages: [
          {
            title: T('مسار الأفعى', 'The snake path'),
            body: T(`<p>البتات لا تُقرأ سطراً بعد سطر. القاعدة:</p>
              <ol>
                <li>نبدأ من <b>الزاوية السفلى اليمنى</b>.</li>
                <li>نقرأ <b>عمودين معاً</b>: المربع الأيمن ثم الأيسر، ونصعد صفاً بعد صف.</li>
                <li>عند الحافة ننتقل إلى العمودين التاليين على اليسار <b>وننزل</b>، ثم نصعد، وهكذا.</li>
                <li>نتخطى أي جزء ثابت (الرمادي)، ونتخطى عمود التوقيت كاملاً.</li>
              </ol>
              <p><b>كل 8 مربعات على المسار = بايت واحد.</b></p>
              <p>اضغط «تشغيل» أو «البايت التالي» لتشاهد القراءة بايتاً بعد بايت. الأرقام تبين ترتيب البتات داخل البايت الحالي.</p>`,
            `<p>Bits are not read line by line. The rule is:</p>
              <ol>
                <li>Start at the <b>bottom right corner</b>.</li>
                <li>Read <b>two columns together</b>: the right module, then the left, moving up one row at a time.</li>
                <li>At the edge, move to the next two columns on the left and <b>go down</b>, then up again, and so on.</li>
                <li>Skip every fixed (grey) part, and skip the timing column entirely.</li>
              </ol>
              <p><b>Every 8 modules along the path make one byte.</b></p>
              <p>Press "Play" or "Next byte" to watch the reading byte by byte. The numbers show the order of the bits inside the current byte.</p>`),
            widget: { type: 'zigzag' },
            task: T('تقدّم حتى البايت الرابع', 'Advance to the fourth byte'),
          },
          {
            title: T('الكتل والتداخل', 'Blocks and interleaving'),
            body: T(`<p>في الأكواد الكبيرة تُقسم البايتات إلى <b>كتل</b>، ولكل كتلة ${learn('ecc', 1, 'بايتات تصحيح')} خاصة بها.</p>
              <p>لكن الكتل لا تُكتب واحدة بعد الأخرى. تُكتب <b>بالتناوب</b>: البايت الأول من كل كتلة، ثم البايت الثاني من كل كتلة، وهكذا. إذا كانت إحدى الكتل أطول، يأتي بايتها الزائد في النهاية.</p>
              <p>الفائدة: البقعة التالفة تتوزع على عدة كتل بدل أن تدمر كتلة واحدة.</p>
              <p>جرّب: اضغط البايتات بالترتيب الذي تُكتب به على المسار.</p>`,
            `<p>In larger codes the bytes are split into <b>blocks</b>, and each block has its own ${learn('ecc', 1, 'correction bytes')}.</p>
              <p>But the blocks are not written one after another. They are <b>interleaved</b>: the first byte of every block, then the second byte of every block, and so on. If one block is longer, its extra byte comes at the end.</p>
              <p>The benefit: a damaged patch is spread over several blocks instead of destroying one.</p>
              <p>Try it: click the bytes in the order they are written along the path.</p>`),
            widget: { type: 'interleave', blocks: [4, 4, 5] },
            task: T('رتّب كل البايتات بالترتيب الصحيح', 'Put every byte in the right order'),
            quiz: [
              q('من أي زاوية تبدأ القراءة؟', 'Which corner does reading start from?', [['السفلى اليمنى', 'Bottom right'], ['العليا اليسرى', 'Top left'], ['العليا اليمنى', 'Top right']], 0,
                'دائماً من الزاوية السفلى اليمنى.', 'Always the bottom right corner.'),
              q('ثلاث كتل A وB وC. ما أول ثلاثة بايتات على المسار؟', 'Three blocks, A, B and C. What are the first three bytes on the path?',
                [['A1 ثم B1 ثم C1', 'A1, then B1, then C1'], ['A1 ثم A2 ثم A3', 'A1, then A2, then A3'], ['C1 ثم B1 ثم A1', 'C1, then B1, then A1']], 0,
                'البايت الأول من كل كتلة بالتناوب.', 'The first byte of each block, taken in turn.'),
            ],
          },
        ],
      },
      {
        id: 'map',
        title: T('خريطة القراءة', 'The reading map'),
        summary: T('الخطوات كلها بالترتيب، قبل أن تقرأ أول كود', 'Every step in order, before you read your first code'),
        pages: [
          {
            title: T('الخطوات بالترتيب', 'The steps in order'),
            body: T(`<p>هكذا يُقرأ أي كود QR. كل خطوة مرتبطة بدرسها:</p>
              <ol class="roadmap">
                <li>تعرّف على ${learn('anatomy', 1, 'أجزاء الكود')} واستبعد الثابت منها.</li>
                <li>احسب ${learn('versions', 1, 'النسخة')} من عدد المربعات.</li>
                <li>اقرأ ${learn('format', 1, 'معلومات التنسيق')}، أزل ${learn('format', 2, 'النمط الثابت')}، واستخرج مستوى التصحيح ورقم القناع.</li>
                <li>أزل ${learn('mask', 3, 'القناع')} عن منطقة البيانات.</li>
                <li>اقرأ البايتات على ${learn('order', 1, 'مسار الأفعى')}، وفك ${learn('order', 2, 'التداخل')} إذا كان الكود مقسوماً إلى كتل.</li>
                <li>افصل بايتات البيانات عن ${learn('ecc', 2, 'بايتات التصحيح')}.</li>
                <li>اقرأ ${learn('modes', 2, 'النوع، ثم العدد، ثم الحروف')}، حتى علامة النهاية.</li>
              </ol>
              <p>الآن أنت جاهز. في «اقرأ بعينك» نطبّق هذه الخطوات على كود حقيقي، وكل كلمة مسطّرة هناك تُرجعك إلى درسها.</p>
              <p><a class="btn-link" href="#s=hello">ابدأ بقراءة HELLO WORLD</a></p>`,
            `<p>This is how any QR code is read. Each step links to its lesson:</p>
              <ol class="roadmap">
                <li>Recognise the ${learn('anatomy', 1, 'parts of the code')} and set the fixed ones aside.</li>
                <li>Work out the ${learn('versions', 1, 'version')} from the number of modules.</li>
                <li>Read the ${learn('format', 1, 'format information')}, remove the ${learn('format', 2, 'fixed pattern')}, and take out the error correction level and mask number.</li>
                <li>Remove the ${learn('mask', 3, 'mask')} from the data area.</li>
                <li>Read the bytes along the ${learn('order', 1, 'snake path')}, and undo the ${learn('order', 2, 'interleaving')} if the code is split into blocks.</li>
                <li>Separate the data bytes from the ${learn('ecc', 2, 'correction bytes')}.</li>
                <li>Read the ${learn('modes', 2, 'mode, then the count, then the characters')}, up to the terminator.</li>
              </ol>
              <p>Now you are ready. In "Read by eye" we apply these steps to a real code, and every underlined word there takes you back to its lesson.</p>
              <p><a class="btn-link" href="#s=hello">Start by reading HELLO WORLD</a></p>`),
            widget: { type: 'anatomy', version: 2, part: 'all' },
          },
        ],
      },
    ];
  }

  QRT.lessons = { get };
})(typeof window !== 'undefined' ? window : globalThis);
