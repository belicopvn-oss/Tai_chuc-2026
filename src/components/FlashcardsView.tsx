import React, { useState, useEffect, useMemo } from 'react';
import { SubjectCourse, QuestionProgress } from '../data/defaultSubjects';
import { QuestionItem } from '../data/official300Bank';
import { highlightTextWithKeyword } from '../utils/textAnalysis';

interface FlashcardsViewProps {
  subject: SubjectCourse;
  progressMap: Record<number, QuestionProgress>;
  keywordHighlight: boolean;
  onRateCard: (questionId: number, bucket: 'red' | 'yellow' | 'green') => void;
  onSaveNote: (questionId: number, noteText: string) => void;
  onJumpToStudyQuestion: (questionId: number) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  subject,
  progressMap,
  keywordHighlight,
  onRateCard,
  onSaveNote,
  onJumpToStudyQuestion,
}) => {
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [bucketFilter, setBucketFilter] = useState<string>('all');
  const [shuffled, setShuffled] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [noteInput, setNoteInput] = useState<string>('');

  const filteredDeck = useMemo(() => {
    let list = subject.questions.filter((q) => {
      if (moduleFilter !== 'all' && q.module !== Number(moduleFilter)) return false;
      const p = progressMap[q.id];
      if (bucketFilter === 'red' && p?.status !== 'wrong') return false;
      if (bucketFilter === 'yellow' && !(p?.confidence === 'uncertain' || p?.starred)) return false;
      if (bucketFilter === 'green' && (p?.status !== 'mastered' || p?.confidence === 'uncertain')) return false;
      if (bucketFilter === 'unseen' && p?.status) return false;
      return true;
    });

    if (shuffled) {
      list = [...list].sort((a, b) => ((a.id * 9301 + 49297) % 233280) - ((b.id * 9301 + 49297) % 233280));
    }
    return list;
  }, [subject.questions, moduleFilter, bucketFilter, shuffled, progressMap]);

  const safeIndex = filteredDeck.length > 0 ? Math.min(currentIndex, filteredDeck.length - 1) : 0;
  const currentCard: QuestionItem | undefined = filteredDeck[safeIndex];

  useEffect(() => {
    setIsFlipped(false);
    if (currentCard) {
      setNoteInput(progressMap[currentCard.id]?.note || '');
    }
  }, [currentCard?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        setIsFlipped(false);
        setCurrentIndex((prev) => (filteredDeck.length > 0 ? (prev + 1) % filteredDeck.length : 0));
      } else if (e.key === 'ArrowLeft') {
        setIsFlipped(false);
        setCurrentIndex((prev) => (filteredDeck.length > 0 ? (prev - 1 + filteredDeck.length) % filteredDeck.length : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredDeck.length]);

  const speakCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const text = isFlipped
      ? `Đáp án đúng là: ${currentCard.options[currentCard.answer]}. Từ khóa nhớ nhanh: ${currentCard.keyword}`
      : currentCard.question;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'vi-VN';
    window.speechSynthesis.speak(utter);
  };

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <section className="space-y-5">
      {/* Control Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Thẻ Ghi Nhớ Flashcards · Lật Nhanh Từ Khóa Quyết Định
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Mặt trước hiển thị câu hỏi để tự nhẩm nhớ; chạm vào thẻ hoặc bấm phím <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono-tabular text-xs">Space</kbd> để lật xem đáp án chuẩn và cụm từ khóa vàng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setCurrentIndex(0);
              }}
              aria-label="Lọc chuyên đề Flashcard"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <option value="all">Tất cả chuyên đề ({subject.questions.length} thẻ)</option>
              {Object.values(subject.modules).map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>

            <select
              value={bucketFilter}
              onChange={(e) => {
                setBucketFilter(e.target.value);
                setCurrentIndex(0);
              }}
              aria-label="Lọc theo giỏ ghi nhớ"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <option value="all">Mọi trạng thái thẻ</option>
              <option value="unseen">Chưa học lần nào</option>
              <option value="red">Giỏ Đỏ · Đang sai / Chưa thuộc</option>
              <option value="yellow">Giỏ Vàng · Còn phân vân</option>
              <option value="green">Giỏ Xanh · Đã thuộc chắc</option>
            </select>

            <button
              onClick={() => {
                setShuffled((prev) => !prev);
                setCurrentIndex(0);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition whitespace-nowrap shrink-0 ${
                shuffled
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {shuffled ? 'Đang trộn ngẫu nhiên' : 'Trộn thứ tự thẻ'}
            </button>
          </div>
        </div>
      </div>

      {filteredDeck.length === 0 || !currentCard ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Không có thẻ ghi nhớ nào trong bộ lọc này
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Hãy chuyển bộ lọc về &ldquo;Mọi trạng thái thẻ&rdquo; hoặc chọn chuyên đề khác để tiếp tục ôn luyện.
          </p>
          <button
            onClick={() => {
              setModuleFilter('all');
              setBucketFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
          >
            Xem toàn bộ {subject.questions.length} thẻ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Flip Card Stage (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div
              onClick={() => setIsFlipped((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsFlipped((prev) => !prev);
              }}
              className="cursor-pointer select-none bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border-2 border-slate-200 dark:border-slate-800 hover:border-red-500/60 dark:hover:border-amber-500/60 shadow-sm min-h-[320px] flex flex-col justify-between transition-all duration-200"
            >
              {/* Top Meta Line */}
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-mono-tabular">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Thẻ #{currentCard.id}
                  </span>
                  <span>·</span>
                  <span>
                    {safeIndex + 1} / {filteredDeck.length}
                  </span>
                  <span>·</span>
                  <span className="font-sans">
                    {subject.modules[currentCard.module]?.name || `Chuyên đề ${currentCard.module}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={speakCard}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition whitespace-nowrap shrink-0"
                  >
                    Đọc âm thanh
                  </button>
                  <span className="font-bold text-red-600 dark:text-amber-400">
                    {isFlipped ? 'Mặt sau · Đáp án' : 'Mặt trước · Câu hỏi'}
                  </span>
                </div>
              </div>

              {/* Center Content */}
              {!isFlipped ? (
                <div className="py-6 space-y-4">
                  <div className="text-xs font-semibold text-slate-400">
                    Chạm vào thẻ để lật xem đáp án chuẩn và cụm từ khóa quyết định:
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                    {currentCard.question}
                  </h3>
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                    {currentCard.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                      >
                        <strong className="text-slate-800 dark:text-slate-200 mr-1.5">
                          {letters[idx]}.
                        </strong>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-5 space-y-4">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Câu hỏi: {currentCard.question}
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 space-y-2">
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      ✓ Đáp án chuẩn ({letters[currentCard.answer]}):
                    </div>
                    <div
                      className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: highlightTextWithKeyword(
                          currentCard.options[currentCard.answer],
                          currentCard.keyword,
                          keywordHighlight
                        ),
                      }}
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-1 text-xs sm:text-sm">
                    <div className="font-bold text-amber-900 dark:text-amber-200">
                      Cụm từ khóa quyết định: &ldquo;{currentCard.keyword}&rdquo;
                    </div>
                    <div className="text-slate-700 dark:text-slate-300">
                      {currentCard.explanation}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Flip Prompt */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Trạng thái hiện tại:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {progressMap[currentCard.id]?.status === 'wrong'
                      ? 'Giỏ Đỏ (Cần ôn lại)'
                      : progressMap[currentCard.id]?.confidence === 'uncertain'
                      ? 'Giỏ Vàng (Còn phân vân)'
                      : progressMap[currentCard.id]?.status === 'mastered'
                      ? 'Giỏ Xanh (Đã thuộc chắc)'
                      : 'Chưa đánh giá'}
                  </strong>
                </span>
                <span className="font-semibold text-red-600 dark:text-amber-400">
                  ↻ Bấm để lật thẻ ({isFlipped ? 'Xem câu hỏi' : 'Xem đáp án'})
                </span>
              </div>
            </div>

            {/* Self-Rating & Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((prev) => (prev - 1 + filteredDeck.length) % filteredDeck.length);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition whitespace-nowrap shrink-0"
              >
                ← Thẻ trước
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    onRateCard(currentCard.id, 'red');
                    setIsFlipped(false);
                    setCurrentIndex((prev) => (prev + 1) % filteredDeck.length);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition whitespace-nowrap shrink-0"
                >
                  Chưa thuộc (Vào Giỏ Đỏ)
                </button>
                <button
                  onClick={() => {
                    onRateCard(currentCard.id, 'yellow');
                    setIsFlipped(false);
                    setCurrentIndex((prev) => (prev + 1) % filteredDeck.length);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-500 hover:text-slate-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition whitespace-nowrap shrink-0"
                >
                  Còn phân vân (Giỏ Vàng)
                </button>
                <button
                  onClick={() => {
                    onRateCard(currentCard.id, 'green');
                    setIsFlipped(false);
                    setCurrentIndex((prev) => (prev + 1) % filteredDeck.length);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition whitespace-nowrap shrink-0"
                >
                  ✓ Đã thuộc chắc (Giỏ Xanh)
                </button>
              </div>

              <button
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((prev) => (prev + 1) % filteredDeck.length);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition whitespace-nowrap shrink-0"
              >
                Thẻ tiếp →
              </button>
            </div>
          </div>

          {/* Right Column: Personal Note & Quick Actions for this Card (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Ghi chú cá nhân · Câu #{currentCard.id}
              </h3>
              <button
                onClick={() => onJumpToStudyQuestion(currentCard.id)}
                className="text-xs font-bold text-red-600 dark:text-amber-400 hover:underline whitespace-nowrap shrink-0"
              >
                Mở chế độ Học chi tiết →
              </button>
            </div>

            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              rows={4}
              placeholder="Ghi mẹo nhớ riêng, liên hệ thực tế đơn vị hoặc từ khóa viết tắt cho câu này..."
              className="w-full p-3 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <button
              onClick={() => onSaveNote(currentCard.id, noteInput)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
            >
              Lưu ghi chú cho Câu #{currentCard.id}
            </button>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Danh sách chuyển nhanh ({filteredDeck.length} thẻ):
              </div>
              <div className="grid grid-cols-6 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredDeck.slice(0, 120).map((item, idx) => {
                  const st = progressMap[item.id]?.status;
                  const isCurr = idx === safeIndex;
                  let bg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
                  if (st === 'mastered') bg = 'bg-emerald-600 text-white font-bold';
                  else if (st === 'wrong') bg = 'bg-rose-600 text-white font-bold';
                  if (isCurr) bg += ' ring-2 ring-offset-1 ring-red-600 dark:ring-amber-400';

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIsFlipped(false);
                        setCurrentIndex(idx);
                      }}
                      className={`h-8 rounded-lg text-[11px] font-mono-tabular transition ${bg}`}
                    >
                      {item.id}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
