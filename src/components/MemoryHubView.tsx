import React, { useState, useEffect, useRef } from 'react';
import { SubjectCourse } from '../data/defaultSubjects';
import { QuestionItem } from '../data/official300Bank';
import {
  TRAP_PATTERNS,
  computeCommonWordPrefixLen,
  formatOptionWithDiffAndKeyword,
  highlightTextWithKeyword,
} from '../utils/textAnalysis';

interface MemoryHubViewProps {
  subject: SubjectCourse;
  keywordHighlight: boolean;
  diffFocusMode: boolean;
  onJumpToQuestion: (qid: number) => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export const MemoryHubView: React.FC<MemoryHubViewProps> = ({
  subject,
  keywordHighlight,
  diffFocusMode,
  onJumpToQuestion,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cheatsheet' | 'cloze' | 'speed' | 'traps'>('cheatsheet');
  const [cheatSearch, setCheatSearch] = useState('');

  // Cloze state
  const [clozeModule, setClozeModule] = useState<string>('all');
  const [clozeQuestion, setClozeQuestion] = useState<QuestionItem | null>(null);
  const [clozeChoices, setClozeChoices] = useState<Array<{ text: string; isCorrect: boolean }>>([]);
  const [clozeSelectedIdx, setClozeSelectedIdx] = useState<number | null>(null);
  const [clozeStreak, setClozeStreak] = useState<number>(0);

  // Speed drill state
  const [speedQuestions, setSpeedQuestions] = useState<QuestionItem[]>([]);
  const [speedIdx, setSpeedIdx] = useState<number>(0);
  const [speedScore, setSpeedScore] = useState<number>(0);
  const [speedTimeLeft, setSpeedTimeLeft] = useState<number>(15);
  const [speedActive, setSpeedActive] = useState<boolean>(false);
  const [speedChosenOpt, setSpeedChosenOpt] = useState<number | null>(null);
  const speedTimerRef = useRef<number | null>(null);

  const loadNextCloze = (modVal = clozeModule) => {
    const pool =
      modVal === 'all'
        ? subject.questions
        : subject.questions.filter((q) => q.module === Number(modVal));
    if (pool.length === 0) {
      setClozeQuestion(null);
      return;
    }
    const qObj = pool[Math.floor(Math.random() * pool.length)];
    setClozeQuestion(qObj);
    setClozeSelectedIdx(null);

    const commonPrefixLen = computeCommonWordPrefixLen(qObj.options);
    const distractors: string[] = [];
    qObj.options.forEach((opt, idx) => {
      if (idx === qObj.answer) return;
      const words = opt.trim().split(/\s+/);
      if (commonPrefixLen >= 3 && commonPrefixLen < words.length) {
        distractors.push(words.slice(commonPrefixLen).join(' ').replace(/\.$/, ''));
      } else {
        distractors.push(words.slice(-Math.min(8, words.length)).join(' ').replace(/\.$/, ''));
      }
    });

    const choices = shuffleArray([
      { text: qObj.keyword, isCorrect: true },
      ...distractors.map((d) => ({ text: d, isCorrect: false })),
    ]);
    setClozeChoices(choices);
  };

  useEffect(() => {
    loadNextCloze('all');
    return () => {
      if (speedTimerRef.current) window.clearInterval(speedTimerRef.current);
    };
  }, [subject.id]);

  // Speed drill timer
  useEffect(() => {
    if (!speedActive || speedChosenOpt !== null) return;
    speedTimerRef.current = window.setInterval(() => {
      setSpeedTimeLeft((prev) => {
        if (prev <= 1) {
          if (speedTimerRef.current) window.clearInterval(speedTimerRef.current);
          setSpeedChosenOpt(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (speedTimerRef.current) window.clearInterval(speedTimerRef.current);
    };
  }, [speedActive, speedIdx, speedChosenOpt]);

  const startSpeedDrill = () => {
    if (speedTimerRef.current) window.clearInterval(speedTimerRef.current);
    const selected = shuffleArray(subject.questions).slice(0, 10);
    setSpeedQuestions(selected);
    setSpeedIdx(0);
    setSpeedScore(0);
    setSpeedTimeLeft(15);
    setSpeedChosenOpt(null);
    setSpeedActive(true);
  };

  const handleSpeedSelect = (optIdx: number) => {
    if (speedChosenOpt !== null) return;
    if (speedTimerRef.current) window.clearInterval(speedTimerRef.current);
    setSpeedChosenOpt(optIdx);
    const currentQ = speedQuestions[speedIdx];
    if (currentQ && optIdx === currentQ.answer) {
      setSpeedScore((s) => s + 1);
    }
  };

  const filteredCheatSheet = subject.cheatSheet.filter((item) => {
    const q = cheatSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      item.code.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.trap.toLowerCase().includes(q) ||
      String(item.qid).includes(q)
    );
  });

  const curatedTwinPairs: Array<[number, number]> = [
    [221, 223],
    [139, 270],
    [285, 287],
    [136, 238],
    [217, 241],
    [27, 94],
  ];

  const letters = ['A', 'B', 'C', 'D'];

  const renderClozeAnswerText = (qObj: QuestionItem) => {
    const correctText = qObj.options[qObj.answer] || '';
    const kw = qObj.keyword || '';
    if (clozeSelectedIdx !== null) {
      return (
        <span
          dangerouslySetInnerHTML={{
            __html: highlightTextWithKeyword(correctText, kw, true),
          }}
        />
      );
    }
    const lowerText = correctText.toLowerCase();
    const lowerKw = kw.toLowerCase();
    const pos = lowerKw ? lowerText.indexOf(lowerKw) : -1;
    if (pos >= 0 && kw.length > 0) {
      const before = correctText.slice(0, pos);
      const after = correctText.slice(pos + kw.length);
      return (
        <>
          {before}
          <span className="inline-block px-3 py-0.5 mx-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold border border-dashed border-indigo-400">
            [ ... Điền cụm từ khóa ... ]
          </span>
          {after}
        </>
      );
    }
    return (
      <span className="inline-block px-3 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold border border-dashed border-indigo-400">
        [ ... Chọn cụm từ khóa quyết định ... ]
      </span>
    );
  };

  return (
    <section className="space-y-5">
      {/* Header & 4 Sub-mode Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Tổ Hợp Siêu Trí Nhớ & Chống Bẫy Trắc Nghiệm ({subject.shortName})
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Hệ thống hóa toàn bộ số liệu, ký hiệu Nghị quyết, luyện điền khuyết từ khóa (Active Recall) và phản xạ 15 giây chống học vẹt.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveSubTab('cheatsheet')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                activeSubTab === 'cheatsheet'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
              }`}
            >
              Sổ Tay Số Liệu & Nghị Quyết
            </button>
            <button
              onClick={() => setActiveSubTab('cloze')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                activeSubTab === 'cloze'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
              }`}
            >
              Điền Khuyết Từ Khóa
            </button>
            <button
              onClick={() => setActiveSubTab('speed')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                activeSubTab === 'speed'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
              }`}
            >
              Phản Xạ 15 Giây
            </button>
            <button
              onClick={() => setActiveSubTab('traps')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                activeSubTab === 'traps'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
              }`}
            >
              7 Nhóm Từ Khóa Bẫy & Cặp Câu Dễ Nhầm
            </button>
          </div>
        </div>
      </div>

      {/* SUB-PANEL 1: SỔ TAY SỐ LIỆU & NGHỊ QUYẾT */}
      {activeSubTab === 'cheatsheet' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Bảng Đối Chiếu Nhanh: Nghị Quyết – Kết Luận – Tỷ Lệ % – Mốc Thời Gian
              </h3>
              <p className="text-xs text-slate-500">
                Bấm vào nút <strong>&ldquo;Câu #...&rdquo;</strong> ở từng dòng để nhảy trực tiếp tới câu trắc nghiệm tương ứng.
              </p>
            </div>
            <input
              type="text"
              value={cheatSearch}
              onChange={(e) => setCheatSearch(e.target.value)}
              placeholder="Tìm nhanh: 847, 57, 20-NQ, 30%, HNTW3..."
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full sm:w-72"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  <th className="py-2.5 px-3 font-bold">Số hiệu / Con số</th>
                  <th className="py-2.5 px-3 font-bold">Nội dung cốt lõi & Đáp án chuẩn</th>
                  <th className="py-2.5 px-3 font-bold">Điểm lưu ý phân biệt</th>
                  <th className="py-2.5 px-3 font-bold text-right">Câu số</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCheatSheet.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                  >
                    <td className="py-3 px-3 font-extrabold text-red-700 dark:text-amber-400 whitespace-nowrap font-mono-tabular">
                      {item.code}
                    </td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200 leading-relaxed">
                      {item.content}
                    </td>
                    <td className="py-3 px-3 text-rose-600 dark:text-rose-400 text-xs font-medium">
                      {item.trap}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onJumpToQuestion(item.qid)}
                        className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-slate-800 text-red-700 dark:text-amber-300 font-bold text-xs hover:bg-red-600 hover:text-white transition font-mono-tabular"
                      >
                        Câu #{item.qid} →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-PANEL 2: ĐIỀN KHUYẾT TỪ KHÓA (ACTIVE RECALL CLOZE TEST) */}
      {activeSubTab === 'cloze' && clozeQuestion && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Chế độ Active Recall · Chống học vẹt vị trí A, B, C, D
              </div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Điền Cụm Từ Khóa Quyết Định Vào Chỗ Trống
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={clozeModule}
                onChange={(e) => {
                  setClozeModule(e.target.value);
                  loadNextCloze(e.target.value);
                }}
                aria-label="Chọn phần luyện điền khuyết"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="all">Toàn bộ {subject.questions.length} câu</option>
                {Object.values(subject.modules).map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name}
                  </option>
                ))}
              </select>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs font-mono-tabular">
                Chuỗi đúng: {clozeStreak}
              </span>
            </div>
          </div>

          <div className="text-xs font-bold text-red-600 dark:text-amber-400 font-mono-tabular">
            Câu #{clozeQuestion.id} · {subject.modules[clozeQuestion.module]?.name || ''}
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
            {clozeQuestion.question}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-xs font-semibold text-slate-500">
              Nội dung phương án đúng (Đã ẩn cụm từ khóa quyết định):
            </div>
            <div className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              {renderClozeAnswerText(clozeQuestion)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500">
              Chạm vào cụm từ khóa đúng dưới đây để điền vào chỗ trống:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {clozeChoices.map((ch, idx) => {
                let cls =
                  'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 text-slate-800 dark:text-slate-200';
                if (clozeSelectedIdx !== null) {
                  if (ch.isCorrect) {
                    cls =
                      'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500';
                  } else if (clozeSelectedIdx === idx) {
                    cls =
                      'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-bold';
                  }
                }
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (clozeSelectedIdx !== null) return;
                      setClozeSelectedIdx(idx);
                      if (ch.isCorrect) setClozeStreak((s) => s + 1);
                      else setClozeStreak(0);
                    }}
                    className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm font-semibold transition ${cls}`}
                  >
                    {ch.text}
                  </button>
                );
              })}
            </div>
          </div>

          {clozeSelectedIdx !== null && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm space-y-1">
              {clozeChoices[clozeSelectedIdx]?.isCorrect ? (
                <div className="font-bold text-emerald-700 dark:text-emerald-400">
                  ✓ Chính xác! Bạn đã nhớ chuẩn cụm từ khóa quyết định.
                </div>
              ) : (
                <div className="font-bold text-rose-600">
                  ✗ Nhầm với phương án bẫy! Cụm từ khóa chuẩn phải là: &ldquo;{clozeQuestion.keyword}&rdquo;.
                </div>
              )}
              <div>{clozeQuestion.explanation}</div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              onClick={() => loadNextCloze(clozeModule)}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition"
            >
              Câu điền khuyết tiếp theo →
            </button>
          </div>
        </div>
      )}

      {/* SUB-PANEL 3: ĐẤU TRƯỜNG PHẢN XẠ 15 GIÂY */}
      {activeSubTab === 'speed' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="text-xs font-semibold text-amber-600">
                Rèn tốc độ bắt từ khóa nhanh
              </div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Thử Thách Phản Xạ 15 Giây / Câu (10 Câu Nhanh)
              </h3>
            </div>
            <div className="flex items-center gap-3 font-mono-tabular">
              <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 font-extrabold text-sm">
                {speedTimeLeft}s
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs">
                Điểm: {speedScore} · Câu: {speedActive ? `${Math.min(speedIdx + 1, speedQuestions.length)}/${speedQuestions.length}` : '0/10'}
              </div>
              <button
                onClick={startSpeedDrill}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition font-sans whitespace-nowrap shrink-0"
              >
                Bắt đầu lượt mới
              </button>
            </div>
          </div>

          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600 transition-all duration-300"
              style={{ width: `${Math.max(0, (speedTimeLeft / 15) * 100)}%` }}
            />
          </div>

          {!speedActive ? (
            <div className="py-6 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Bấm nút &ldquo;Bắt đầu lượt mới&rdquo; để thử sức phản xạ nhanh 10 câu hỏi ngẫu nhiên (mỗi câu 15 giây)!
            </div>
          ) : speedIdx >= speedQuestions.length ? (
            <div className="py-6 space-y-3 text-center">
              <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                Hoàn thành Đấu trường Phản xạ! Bạn đạt {speedScore}/{speedQuestions.length} câu đúng.
              </div>
              <button
                onClick={startSpeedDrill}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs sm:text-sm"
              >
                Chơi lại lượt mới
              </button>
            </div>
          ) : (
            (() => {
              const qObj = speedQuestions[speedIdx];
              const commonPrefix = computeCommonWordPrefixLen(qObj.options);
              const hasAnswered = speedChosenOpt !== null;
              return (
                <div className="space-y-3 py-2">
                  <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Câu #{qObj.id}: {qObj.question}
                  </div>
                  <div className="space-y-2">
                    {qObj.options.map((optText, idx) => {
                      let cls =
                        'border-slate-200 dark:border-slate-800 hover:border-red-500 bg-slate-50/70 dark:bg-slate-800/50';
                      if (hasAnswered) {
                        if (idx === qObj.answer) {
                          cls =
                            'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 font-semibold';
                        } else if (idx === speedChosenOpt) {
                          cls =
                            'border-rose-500 bg-rose-50 dark:bg-rose-950/60 font-semibold';
                        }
                      }
                      const htmlOpt = formatOptionWithDiffAndKeyword(
                        optText,
                        idx,
                        qObj,
                        hasAnswered,
                        commonPrefix,
                        speedChosenOpt ?? undefined,
                        keywordHighlight,
                        diffFocusMode
                      );
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSpeedSelect(idx)}
                          className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition ${cls}`}
                        >
                          <span className="font-bold mr-2">{letters[idx]}.</span>
                          <span dangerouslySetInnerHTML={{ __html: htmlOpt }} />
                        </button>
                      );
                    })}
                  </div>

                  {hasAnswered && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm flex items-center justify-between gap-2">
                      <span>
                        Từ khóa quyết định: <strong>&ldquo;{qObj.keyword}&rdquo;</strong>
                      </span>
                      <button
                        onClick={() => {
                          setSpeedIdx((i) => i + 1);
                          setSpeedTimeLeft(15);
                          setSpeedChosenOpt(null);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs whitespace-nowrap shrink-0"
                      >
                        Câu tiếp →
                      </button>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* SUB-PANEL 4: 7 NHÓM TỪ KHÓA BẪY & CẶP CÂU DỄ NHẦM */}
      {activeSubTab === 'traps' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              7 Quy Luật &ldquo;Từ Khóa Bẫy&rdquo; Trong Phương Án Sai (Bộ Đề 2026)
            </h3>
            <p className="text-xs text-slate-500">
              Trong 300 câu nhận thức chính trị năm 2026, các phương án sai thường gài các cụm từ làm hẹp phạm vi hoặc đánh tráo khái niệm sau đây:
            </p>
            <div className="space-y-2.5 text-xs sm:text-sm">
              {TRAP_PATTERNS.map((tp, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-1"
                >
                  <div className="font-bold text-rose-800 dark:text-rose-300">{tp.title}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">{tp.reason}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Các Cặp Câu &ldquo;Song Sinh&rdquo; Dễ Nhầm Lẫn Nhất
            </h3>
            <p className="text-xs text-slate-500">
              Đối chiếu trực tiếp các cặp câu có nội dung gần giống nhau để không chọn nhầm khi vào phòng thi:
            </p>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {curatedTwinPairs.map(([id1, id2]) => {
                const q1 = subject.questions.find((x) => x.id === id1);
                const q2 = subject.questions.find((x) => x.id === id2);
                if (!q1 || !q2) return null;
                return (
                  <div
                    key={`${id1}-${id2}`}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-indigo-700 dark:text-indigo-300">
                      <span>
                        Cặp câu #{q1.id} & #{q2.id}
                      </span>
                      <button
                        onClick={() => onJumpToQuestion(q1.id)}
                        className="underline hover:text-red-600"
                      >
                        Xem câu #{q1.id}
                      </button>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="font-semibold">
                        Câu #{q1.id}: {q1.question}
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                        ✓ Đáp án {letters[q1.answer]}: Từ khóa &ldquo;{q1.keyword}&rdquo;
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="font-semibold">
                        Câu #{q2.id}: {q2.question}
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                        ✓ Đáp án {letters[q2.answer]}: Từ khóa &ldquo;{q2.keyword}&rdquo;
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
