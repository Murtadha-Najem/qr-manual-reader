// Example codes chosen so that, together, they cover every mask, every error-correction
// level, every encoding mode, single and multi-block layouts, version information, and damage.
(function (root) {
  const QRT = (root.QRT = root.QRT || {});
  const L = (ar, en) => ({ ar, en });

  const list = [
    { id: 'digits', title: L('أرقام فقط', 'Digits only'), desc: L('أصغر كود وأبسط ترميز', 'The smallest code and the simplest mode'), segments: [{ mode: 'numeric', text: '8675309' }], ecl: 'M', version: 1, mask: 0 },
    { id: 'hello', title: L('HELLO WORLD', 'HELLO WORLD'), desc: L('حروف إنجليزية كبيرة، كل حرفين معاً', 'Capital letters, two at a time'), segments: [{ mode: 'alphanumeric', text: 'HELLO WORLD' }], ecl: 'Q', version: 1, mask: 3 },
    { id: 'url', title: L('رابط', 'A link'), desc: L('ترميز البايت مع مربع محاذاة', 'Byte mode with an alignment pattern'), segments: [{ mode: 'byte', text: 'https://example.com' }], ecl: 'L', version: 2, mask: 1 },
    { id: 'arabic', title: L('نص عربي', 'Arabic text'), desc: L('حروف من بايتين في UTF-8', 'Two-byte characters in UTF-8'), segments: [{ mode: 'byte', text: 'مرحبا بالعالم' }], ecl: 'M', version: 3, mask: 5 },
    { id: 'mixed', title: L('خلط أنواع', 'Mixed modes'), desc: L('جزءان بترميزين وأربع كتل', 'Two segments in two modes, four blocks'), segments: [{ mode: 'alphanumeric', text: 'ORDER-' }, { mode: 'numeric', text: '20260914' }], ecl: 'H', version: 4, mask: 2 },
    { id: 'blocks', title: L('كتل غير متساوية', 'Uneven blocks'), desc: L('تداخل كتل قصيرة وطويلة', 'Short and long blocks interleaved'), segments: [{ mode: 'byte', text: 'Short and long blocks are woven together.' }], ecl: 'Q', version: 5, mask: 4 },
    { id: 'kanji', title: L('كانجي', 'Kanji'), desc: L('حروف يابانية، 13 بت للحرف', 'Japanese characters, 13 bits each'), segments: [{ mode: 'kanji', text: '漢字テスト' }], ecl: 'M', version: 2, mask: 6 },
    { id: 'v7', title: L('النسخة 7', 'Version 7'), desc: L('أول نسخة فيها معلومات النسخة', 'The first version with version information'), segments: [{ mode: 'byte', text: 'Version 7 adds two version-information blocks next to the finder patterns.' }], ecl: 'M', version: 7, mask: 7 },
    { id: 'logo', title: L('كود عليه شعار', 'A code with a logo'), desc: L('بايتات تالفة يصلحها التصحيح', 'Damaged bytes repaired by error correction'), segments: [{ mode: 'byte', text: 'https://example.com/menu' }], ecl: 'H', version: 5, damage: 'logo' },
    { id: 'eci', title: L('ECI', 'ECI'), desc: L('تحديد مجموعة الأحرف صراحة', 'The character set declared explicitly'), segments: [{ mode: 'eci', value: 26 }, { mode: 'byte', text: 'café ☕ 2026' }], ecl: 'L', version: 2 },
    { id: 'big', title: L('نسخة كبيرة', 'A large version'), desc: L('النسخة 10 وحقل عدد بطول 16 بت', 'Version 10 with a 16-bit count field'), segments: [{ mode: 'byte', text: 'A QR code is only a grid of ones and zeros written in a fixed order. A scanner follows rules, and anything that follows rules can be followed by a patient person with a pencil.' }], ecl: 'L', version: 10 },
    { id: 'photo', kind: 'photo', title: L('صورة مائلة', 'A tilted photo'), desc: L('قراءة الشبكة من صورة', 'Reading the grid from a photo'), segments: [{ mode: 'byte', text: 'Read me by eye' }], ecl: 'M', version: 2 },
  ];

  function build(sample) {
    const enc = QRT.encoder.encode({ segments: sample.segments, ecl: sample.ecl, version: sample.version, mask: sample.mask });
    const matrix = enc.matrix.map((row) => row.slice());
    if (sample.damage === 'logo') {
      const n = matrix.length;
      const size = Math.round(n * 0.26);
      const start = Math.floor((n - size) / 2);
      for (let r = start; r < start + size; r++) for (let c = start; c < start + size; c++) matrix[r][c] = 0;
    }
    const expected = sample.segments.map((s) => s.text || '').join('');
    return { kind: sample.kind || 'sample', sample, matrix, expected, enc };
  }

  QRT.samples = { list, build };
})(typeof window !== 'undefined' ? window : globalThis);
