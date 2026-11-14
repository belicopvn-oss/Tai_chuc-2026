import { QuestionItem } from '../data/official300Bank';

export interface TrapPattern {
  regex: RegExp;
  title: string;
  reason: string;
}

export const TRAP_PATTERNS: TrapPattern[] = [
  {
    regex: /(chỉ ở địa bàn trọng điểm|ở một số địa bàn trọng điểm|chỉ tập trung vào|chỉ tiến hành khi|chỉ trao đổi riêng|ở một số lĩnh vực)/gi,
    title: "1. Bẫy thu hẹp phạm vi ('ở địa bàn trọng điểm', 'một số lĩnh vực')",
    reason: "Bẫy thu hẹp phạm vi ('chỉ ở...', 'một số địa bàn') trong khi chủ trương đúng mang tính toàn diện, đồng bộ trên phạm vi cả nước."
  },
  {
    regex: /(trong giờ hành chính|trong điều kiện thuận lợi|trong thời gian cao điểm|khi có điều kiện)/gi,
    title: "2. Bẫy điều kiện thuận lợi ('trong giờ hành chính', 'khi có điều kiện')",
    reason: "Bẫy giới hạn điều kiện/thời gian ('trong điều kiện thuận lợi', 'giờ hành chính') thay vì 'mọi tình huống / thường xuyên'."
  },
  {
    regex: /(nền quốc phòng toàn quân)/gi,
    title: "3. Bẫy đánh tráo thuật ngữ ('nền quốc phòng toàn quân')",
    reason: "Bẫy sai thuật ngữ chuẩn: Phải là 'nền quốc phòng toàn dân, thế trận quốc phòng toàn dân gắn với thế trận an ninh nhân dân' chứ không phải 'toàn quân'."
  },
  {
    regex: /(chính quyền địa phương ba cấp)/gi,
    title: "4. Bẫy số cấp chính quyền địa phương ('chính quyền địa phương ba cấp')",
    reason: "Bẫy sai số cấp theo Kết luận 76-KL/TW (HNTW3 khóa XIV): Mô hình chuẩn là 'chính quyền địa phương hai cấp'."
  },
  {
    regex: /(chuyên dụng, hiện đại|lưỡng dụng, tiên tiến)/gi,
    title: "5. Bẫy Công nghiệp quốc phòng ('chuyên dụng, hiện đại')",
    reason: "Bẫy lệch cụm từ chuẩn về Công nghiệp quốc phòng: Phải là 'tự chủ, tự lực, tự cường, lưỡng dụng, hiện đại'."
  },
  {
    regex: /(kiên định về sách lược, linh hoạt về chiến lược)/gi,
    title: "6. Bẫy đảo chiều nguyên tắc ('kiên định sách lược, linh hoạt chiến lược')",
    reason: "Bẫy đảo ngược nguyên tắc: Đúng phải là 'kiên định về chiến lược, linh hoạt về sách lược'."
  },
  {
    regex: /(không đặt nặng yêu cầu|hạn chế phê bình|giữ hòa khí khi có sai phạm|chưa chú trọng)/gi,
    title: "7. Bẫy xuề xòa trong phê bình ('giữ hòa khí', 'hạn chế phê bình công khai')",
    reason: "Bẫy buông lỏng nguyên tắc, né tránh đấu tranh tự phê bình và phê bình."
  }
];

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function detectTrapInOption(optText: string): { matchedWord: string; reason: string } | null {
  for (let i = 0; i < TRAP_PATTERNS.length; i++) {
    const match = optText.match(TRAP_PATTERNS[i].regex);
    if (match && match[0]) {
      return { matchedWord: match[0], reason: TRAP_PATTERNS[i].reason };
    }
  }
  return null;
}

export function computeCommonWordPrefixLen(options: string[]): number {
  if (!options || options.length < 2) return 0;
  const splitOpts = options.map(o => o.trim().split(/\s+/));
  const first = splitOpts[0];
  let k = 0;
  while (k < first.length) {
    const w = first[k];
    if (splitOpts.every(arr => k < arr.length && arr[k] === w)) {
      k++;
    } else {
      break;
    }
  }
  return k >= 4 ? k : 0;
}

export function highlightTextWithKeyword(text: string, keyword: string, enabled: boolean): string {
  const safeText = escapeHtml(text);
  if (!enabled || !keyword) return safeText;
  const parts = keyword.split(";").map(s => s.trim()).filter(Boolean);
  let result = safeText;
  parts.forEach(part => {
    const escapedPart = escapeHtml(part).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (escapedPart.length >= 2) {
      const regex = new RegExp(`(${escapedPart})`, "gi");
      result = result.replace(regex, '<span class="kw-highlight">$1</span>');
    }
  });
  return result;
}

export function formatOptionWithDiffAndKeyword(
  optText: string,
  idx: number,
  qObj: QuestionItem,
  hasAnswered: boolean,
  commonPrefixWords: number,
  selectedIdx: number | undefined,
  keywordHighlight: boolean,
  diffFocusMode: boolean
): string {
  if (!hasAnswered) {
    return escapeHtml(optText);
  }
  const words = optText.trim().split(/\s+/);
  let baseHtml = "";
  if (diffFocusMode && commonPrefixWords >= 4 && commonPrefixWords < words.length) {
    const prefixStr = escapeHtml(words.slice(0, commonPrefixWords).join(" "));
    let tailStr = words.slice(commonPrefixWords).join(" ");
    if (idx === qObj.answer) {
      tailStr = highlightTextWithKeyword(tailStr, qObj.keyword, keywordHighlight);
    } else {
      tailStr = escapeHtml(tailStr);
    }
    baseHtml = `<span class="common-prefix-dim">${prefixStr}</span> <span class="diff-tail-bold">${tailStr}</span>`;
  } else {
    baseHtml = idx === qObj.answer
      ? highlightTextWithKeyword(optText, qObj.keyword, keywordHighlight)
      : escapeHtml(optText);
  }

  if (selectedIdx === idx && idx !== qObj.answer) {
    for (let i = 0; i < TRAP_PATTERNS.length; i++) {
      baseHtml = baseHtml.replace(TRAP_PATTERNS[i].regex, '<span class="kw-trap">$1</span>');
    }
  }
  return baseHtml;
}

/**
 * Automatically extracts a distinguishing keyword phrase from the correct option
 * when importing new questions that do not specify a keyword.
 */
export function autoExtractKeyword(options: string[], answerIdx: number): string {
  const correctOpt = options[answerIdx] || options[0] || "";
  if (!correctOpt) return "";
  const commonLen = computeCommonWordPrefixLen(options);
  const words = correctOpt.trim().replace(/[.!?]+$/, "").split(/\s+/);
  if (commonLen >= 3 && commonLen < words.length) {
    return words.slice(commonLen, Math.min(words.length, commonLen + 8)).join(" ");
  }
  if (words.length <= 7) {
    return words.join(" ");
  }
  return words.slice(Math.max(0, words.length - 7)).join(" ");
}

/**
 * Parses structured text into QuestionItem[] for the Smart Question Importer.
 * Supports patterns like:
 * Câu 1: Nội dung câu hỏi?
 * A. Phương án A
 * B. Phương án B
 * *C. Phương án C (dấu * đánh dấu đáp án đúng)
 * D. Phương án D
 * Đáp án: C
 * Giải thích: ...
 */
export function parseRawQuestionsText(rawText: string, startId: number, moduleNum = 1): QuestionItem[] {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results: QuestionItem[] = [];
  let currentQuestion = "";
  let currentOptions: string[] = [];
  let currentAnswer = -1;
  let currentKeyword = "";
  let currentExplanation = "";

  const flushQuestion = () => {
    if (currentQuestion && currentOptions.length >= 2) {
      while (currentOptions.length < 4) {
        currentOptions.push(`Phương án bổ sung ${currentOptions.length + 1}`);
      }
      const ans = currentAnswer >= 0 && currentAnswer < 4 ? currentAnswer : 0;
      const kw = currentKeyword || autoExtractKeyword(currentOptions, ans);
      const id = startId + results.length;
      const firstChar = currentQuestion.trim().charAt(0).toUpperCase() || "C";
      const letters = ["A", "B", "C", "D"];
      results.push({
        id,
        module: moduleNum,
        pack: Math.ceil(id / 50) || 1,
        pack30: Math.ceil(id / 30) || 1,
        first_letter: firstChar,
        question: currentQuestion.replace(/^(Câu\s*\d+\s*[:.-]\s*|\d+\s*[:.)]\s*)/i, "").trim(),
        options: currentOptions.slice(0, 4),
        answer: ans,
        keyword: kw,
        explanation: currentExplanation || `Đáp án đúng là ${letters[ans]}. Cụm từ khóa quyết định: "${kw}".`,
        twins: []
      });
    }
    currentQuestion = "";
    currentOptions = [];
    currentAnswer = -1;
    currentKeyword = "";
    currentExplanation = "";
  };

  for (const line of lines) {
    const optMatch = line.match(/^(\*)?([A-D])\s*[.:\-)]\s*(.+)$/i);
    const ansMatch = line.match(/^(?:Đáp án|ĐA|Answer)\s*[:=-]?\s*([A-D])/i);
    const kwMatch = line.match(/^(?:Từ khóa|Mẹo|Keyword)\s*[:=-]?\s*(.+)$/i);
    const expMatch = line.match(/^(?:Giải thích|GT|Explanation)\s*[:=-]?\s*(.+)$/i);
    const qHeaderMatch = line.match(/^(?:Câu\s*\d+|\d+\s*[.):])/i);

    if (ansMatch) {
      const letter = ansMatch[1].toUpperCase();
      currentAnswer = ["A", "B", "C", "D"].indexOf(letter);
    } else if (kwMatch) {
      currentKeyword = kwMatch[1].trim();
    } else if (expMatch) {
      currentExplanation = expMatch[1].trim();
    } else if (optMatch) {
      const isStarredCorrect = !!optMatch[1];
      const letter = optMatch[2].toUpperCase();
      const text = optMatch[3].trim();
      const idx = ["A", "B", "C", "D"].indexOf(letter);
      if (isStarredCorrect && idx >= 0) {
        currentAnswer = idx;
      }
      currentOptions.push(text);
    } else if (qHeaderMatch || currentOptions.length >= 4) {
      if (currentQuestion && currentOptions.length >= 2) {
        flushQuestion();
      }
      currentQuestion = line;
    } else {
      if (!currentQuestion) {
        currentQuestion = line;
      } else if (currentOptions.length === 0) {
        currentQuestion += " " + line;
      }
    }
  }
  flushQuestion();
  return results;
}
