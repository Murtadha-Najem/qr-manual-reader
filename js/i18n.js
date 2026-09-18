// Language layer. English is the default; Arabic is a full alternative. The choice is kept per browser.
// Long content (steps, lessons, widgets) carries both languages inline through tr(ar, en);
// short interface strings live in UI below and are applied to [data-i18n] elements.
(function (root) {
  const QRT = (root.QRT = root.QRT || {});

  let lang = 'en';
  try {
    const saved = root.localStorage && root.localStorage.getItem('qrt-lang');
    if (saved === 'ar' || saved === 'en') lang = saved;
  } catch (e) {
    /* storage unavailable */
  }

  const UI = {
    title: { en: 'Read QR by Eye', ar: 'اقرأ الـQR بعينك' },
    brand: { en: 'Read QR by Eye', ar: 'اقرأ الـQR بعينك' },
    home: { en: 'Home', ar: 'الرئيسية' },
    langBtn: { en: 'العربية', ar: 'English' },
    heroTitle: { en: 'Every QR code can be read by eye', ar: 'كل كود QR يمكن قراءته بالعين' },
    heroText: {
      en: 'A scanner does nothing magical: it follows fixed rules. Start with the fundamentals, short lessons that explain each idea by trying it, then apply them to a real code step by step.',
      ar: 'الماسح لا يفعل شيئاً سحرياً: يتبع قواعد ثابتة. ابدأ بالأساسيات، دروس قصيرة تشرح كل مفهوم بالتجربة، ثم طبّقها على كود حقيقي خطوة بخطوة.',
    },
    fundamentals: { en: 'Fundamentals', ar: 'الأساسيات' },
    readByEye: { en: 'Read by eye', ar: 'اقرأ بعينك' },
    tabSamples: { en: 'Examples', ar: 'أمثلة جاهزة' },
    tabCustom: { en: 'Type text', ar: 'اكتب نصاً' },
    tabImage: { en: 'From an image', ar: 'من صورة' },
    fText: { en: 'Text', ar: 'النص' },
    fMode: { en: 'Encoding mode', ar: 'نوع الترميز' },
    modeAuto: { en: 'Automatic', ar: 'تلقائي' },
    modeNumeric: { en: 'Numeric (digits only)', ar: 'أرقام (Numeric)' },
    modeAlnum: { en: 'Alphanumeric (capitals and digits)', ar: 'حروف كبيرة وأرقام (Alphanumeric)' },
    modeByte: { en: 'Byte (any text)', ar: 'بايت (Byte)' },
    modeKanji: { en: 'Kanji', ar: 'كانجي (Kanji)' },
    fEcl: { en: 'Error correction level', ar: 'مستوى التصحيح' },
    fVersion: { en: 'Version', ar: 'النسخة' },
    versionAuto: { en: 'Smallest that fits', ar: 'أصغر نسخة تكفي' },
    fMask: { en: 'Mask', ar: 'القناع' },
    maskAuto: { en: 'Best (automatic)', ar: 'الأفضل تلقائياً' },
    startWalkthrough: { en: 'Start the walkthrough', ar: 'ابدأ الشرح' },
    dropTitle: { en: 'Choose an image with a QR code', ar: 'اختر صورة فيها كود QR' },
    dropText: { en: 'Or drag it here, or paste it with Ctrl+V. On a phone you can take a photo directly.', ar: 'أو اسحبها إلى هنا، أو الصقها بـ Ctrl+V. على الهاتف يمكنك التصوير مباشرة.' },
    imageHint: { en: 'The image is not uploaded anywhere. Everything happens inside your browser.', ar: 'الصورة لا تُرفع إلى أي مكان، كل شيء يحدث داخل المتصفح.' },
    prev: { en: 'Previous', ar: 'السابق' },
    next: { en: 'Next', ar: 'التالي' },
    finished: { en: 'Done', ar: 'انتهى' },
    backToCode: { en: 'Back to the code', ar: 'ارجع إلى الكود' },
    replay: { en: 'Replay', ar: 'أعد الحركة' },
    before: { en: 'Before', ar: 'قبل' },
    after: { en: 'After', ar: 'بعد' },
    autoZoom: { en: 'Auto zoom', ar: 'تكبير تلقائي' },
    gridAria: { en: 'The code grid', ar: 'شبكة الكود' },
    jumpAria: { en: 'Go to a step', ar: 'اذهب إلى خطوة' },
    closeAria: { en: 'Close', ar: 'إغلاق' },
    notice: {
      en: 'New here? We suggest the fundamentals first: <a href="#learn=bits&page=1">start the lessons</a>. Underlined words open their explanation.',
      ar: 'هل قرأت الأساسيات؟ ننصح بها أولاً: <a href="#learn=bits&page=1">ابدأ الدروس</a>. والكلمات المسطّرة هنا تفتح شرحها.',
    },
    progress: { en: 'Completed {done} of {total}', ar: 'أكملت {done} من {total}' },
    startFirst: { en: 'Start the first lesson', ar: 'ابدأ الدرس الأول' },
    continueWith: { en: 'Continue: {title}', ar: 'تابع: {title}' },
    reviewLessons: { en: 'Review the lessons', ar: 'راجع الدروس' },
    lessonCompleted: { en: 'Completed', ar: 'مكتمل' },
    lessonLabel: { en: 'Lesson {i} of {n}: {title}', ar: 'الدرس {i} من {n}: {title}' },
    tryIt: { en: 'Try it yourself', ar: 'جرّب بنفسك' },
    taskDone: { en: 'Well done, task complete', ar: 'أحسنت، أنجزت المهمة' },
    quizTitle: { en: 'Check your understanding', ar: 'تحقق من فهمك' },
    lessonDone: { en: 'You have completed this lesson.', ar: 'أكملت هذا الدرس.' },
    right: { en: 'Correct.', ar: 'صحيح.' },
    wrong: { en: 'Not this one. Try again.', ar: 'ليس هذا. حاول مرة أخرى.' },
    nextLesson: { en: 'Next lesson', ar: 'الدرس التالي' },
    startReading: { en: 'Start reading by eye', ar: 'ابدأ القراءة بعينك' },
    stepCount: { en: 'Step {i} of {n}', ar: 'الخطوة {i} من {n}' },
    meta: { en: 'V{v} · {ecl} · mask {mask}', ar: 'V{v} · {ecl} · قناع {mask}' },
    maskTag: { en: 'mask {k}', ar: 'قناع {k}' },
    errTooLong: { en: 'The text is longer than the largest code (version 40) can hold at this level.', ar: 'النص أطول من سعة أكبر كود (النسخة 40) بهذا المستوى.' },
    errTooLongVersion: { en: 'The text does not fit in the chosen version. Pick a larger version or "Smallest that fits".', ar: 'النص لا يتسع في النسخة المختارة. اختر نسخة أكبر أو «أصغر نسخة تكفي».' },
    errTooLongCount: { en: 'The text is longer than the character count field allows in this version.', ar: 'النص أطول مما يسمح به حقل العدد في هذه النسخة.' },
    errBadSize: { en: 'This grid size is not a valid QR code.', ar: 'حجم الشبكة غير صالح لكود QR.' },
    errBadFormat: { en: 'The format information could not be read: the damage is too great.', ar: 'لم نستطع قراءة معلومات التنسيق، التلف كبير جداً.' },
    errNumeric: { en: 'Numeric mode accepts the digits 0 to 9 only.', ar: 'ترميز الأرقام يقبل الأرقام 0 إلى 9 فقط.' },
    errAlnum: { en: 'This mode accepts digits, capital English letters, space and $%*+-./: only.', ar: 'هذا الترميز يقبل الأرقام والحروف الإنجليزية الكبيرة والمسافة و $%*+-./: فقط.' },
    errKanji: { en: 'Kanji mode accepts Japanese characters found in Shift JIS only.', ar: 'ترميز الكانجي يقبل الحروف اليابانية الموجودة في Shift JIS فقط.' },
    errGeneric: { en: 'Something went wrong: {msg}', ar: 'حدث خطأ: {msg}' },
    typeFirst: { en: 'Type some text first.', ar: 'اكتب نصاً أولاً.' },
    noCode: { en: 'No QR code was found in this image. Try a sharper, closer photo taken straight on.', ar: 'لم نجد كود QR في هذه الصورة. جرّب صورة أوضح، أقرب، ومن الأمام.' },
    openFail: { en: 'This image could not be opened.', ar: 'تعذر فتح هذه الصورة.' },
    photoNote: { en: 'This is a generated test photo: the code is tilted, slightly distorted and has noise added.', ar: 'هذه صورة تجريبية مولّدة: الكود مائل ومشوّه قليلاً ومضاف إليه تشويش.' },
    invertedNote: { en: 'The code in this image is printed in inverted colours (light on dark), so the colours were flipped.', ar: 'الكود في الصورة مطبوع بألوان معكوسة (فاتح على غامق)، فعكسنا الألوان.' },
    practice: { en: 'Practice with a timer', ar: 'تمرّن مع المؤقت' },
    practiceText: {
      en: 'Read a random code yourself, on screen or with pen and paper, and time it. Check the level, the mask and the message as you go.',
      ar: 'اقرأ كوداً عشوائياً بنفسك، على الشاشة أو بالورقة والقلم، واحسب وقتك. تحقق من المستوى والقناع والرسالة وأنت تقرأ.',
    },
    levelEasy: { en: 'Easy', ar: 'سهل' },
    levelEasyDesc: { en: 'Version 1: digits or capital letters.', ar: 'النسخة 1: أرقام أو حروف كبيرة.' },
    levelMedium: { en: 'Common', ar: 'شائع' },
    levelMediumDesc: { en: 'Versions 2 to 4: a short link or phrase, like most codes you see.', ar: 'النسخ 2 إلى 4: رابط أو جملة قصيرة، مثل أغلب الأكواد التي تراها.' },
    levelHard: { en: 'Hard', ar: 'صعب' },
    levelHardDesc: { en: 'Version 4 and up: longer text split into interleaved blocks.', ar: 'النسخة 4 فما فوق: نص أطول مقسوم إلى كتل متداخلة.' },
    bestTime: { en: 'Best time: {time}', ar: 'أفضل وقت: {time}' },
    noTimeYet: { en: 'No time yet', ar: 'لا يوجد وقت بعد' },
    pStart: { en: 'Start the timer', ar: 'ابدأ المؤقت' },
    pCoverText: { en: 'The code stays hidden until you start, so the time is fair.', ar: 'الكود مخفي حتى تبدأ، حتى يكون الوقت عادلاً.' },
    aidDim: { en: 'Dim fixed parts', ar: 'عتّم الأجزاء الثابتة' },
    aidMask: { en: 'Mask dots', ar: 'نقاط القناع' },
    aidPath: { en: 'Reading path', ar: 'مسار القراءة' },
    clearMarks: { en: 'Clear marks', ar: 'امسح العلامات' },
    pIntro: {
      en: 'Read this code and type what it says. Tap modules on the grid to mark how far you have got. Checking the level and the mask is optional: each one records a split time.',
      ar: 'اقرأ هذا الكود واكتب ما فيه. اضغط على المربعات لتضع علامة على المكان الذي وصلت إليه. التحقق من المستوى والقناع اختياري، وكل واحد يسجّل وقتاً مرحلياً.',
    },
    pLevelLabel: { en: 'Error correction level', ar: 'مستوى التصحيح' },
    pMaskLabel: { en: 'Mask', ar: 'القناع' },
    pTextLabel: { en: 'Message', ar: 'الرسالة' },
    pCheck: { en: 'Check', ar: 'تحقق' },
    pRight: { en: 'Right, at {time}', ar: 'صحيح، عند {time}' },
    pWrong: { en: 'Not yet.', ar: 'ليس بعد.' },
    pPrefix: { en: 'The first {n} characters are right. Your answer has {a} characters; the code holds {b}.', ar: 'أول {n} حرف صحيحة. إجابتك فيها {a} حرفاً، والكود فيه {b}.' },
    pSolved: { en: 'Solved in {time}', ar: 'حللته في {time}' },
    pNewBest: { en: 'A new best time for this level.', ar: 'أفضل وقت جديد لهذا المستوى.' },
    pMistakes: { en: 'Wrong checks: {n}', ar: 'محاولات خاطئة: {n}' },
    pAidsUsed: { en: 'Aids used: {list}', ar: 'مساعدات مستعملة: {list}' },
    pNoAids: { en: 'No aids used', ar: 'بدون مساعدات' },
    pAnswerTitle: { en: 'The answer', ar: 'الإجابة' },
    pNew: { en: 'New code', ar: 'كود جديد' },
    pGiveUpBtn: { en: 'Give up and show the answer', ar: 'استسلم واعرض الإجابة' },
    pWalk: { en: 'See this code step by step', ar: 'اعرض هذا الكود خطوة بخطوة' },
    pDownload: { en: 'Download for paper', ar: 'نزّله للورقة' },
    pHistory: { en: 'Your attempts at this level', ar: 'محاولاتك في هذا المستوى' },
    pTime: { en: 'Time', ar: 'الوقت' },
    pAids: { en: 'Aids', ar: 'المساعدات' },
    pNone: { en: 'None', ar: 'لا شيء' },
    pGaveUp: { en: 'Gave up', ar: 'استسلام' },
  };

  const listeners = [];

  function t(key, vars) {
    const entry = UI[key];
    let s = entry ? entry[lang] : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : vars[k]));
    return s;
  }

  function apply() {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  }

  QRT.i18n = {
    get lang() { return lang; },
    set(next) {
      if (next !== 'en' && next !== 'ar') return;
      lang = next;
      try { root.localStorage.setItem('qrt-lang', next); } catch (e) { /* storage unavailable */ }
      apply();
      listeners.forEach((fn) => fn(next));
    },
    tr: (ar, en) => (lang === 'en' ? en : ar),
    t,
    apply,
    onChange: (fn) => listeners.push(fn),
  };
})(typeof window !== 'undefined' ? window : globalThis);
