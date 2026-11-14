import React, { useState, useEffect } from 'react';
import { SubjectCourse, QuestionProgress } from '../data/defaultSubjects';

interface SaveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: SubjectCourse;
  progressMap: Record<number, QuestionProgress>;
  syncCodeValue: string;
  onRestoreSyncCode: (code: string) => void;
  onJumpToQuestion: (qid: number) => void;
  onFilterAnsweredInStudy: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const SaveSyncModal: React.FC<SaveSyncModalProps> = ({
  isOpen,
  onClose,
  subject,
  progressMap,
  syncCodeValue,
  onRestoreSyncCode,
  onJumpToQuestion,
  onFilterAnsweredInStudy,
  showToast,
}) => {
  const [inputCode, setInputCode] = useState(syncCodeValue);

  useEffect(() => {
    if (isOpen) {
      setInputCode(syncCodeValue);
    }
  }, [isOpen, syncCodeValue]);

  if (!isOpen) return null;

  const answeredIds = Object.keys(progressMap)
    .map(Number)
    .filter((k) => progressMap[k]?.status === 'mastered' || progressMap[k]?.status === 'wrong')
    .sort((a, b) => a - b);

  const masteredCount = answeredIds.filter((k) => progressMap[k]?.status === 'mastered').length;
  const wrongCount = answeredIds.filter((k) => progressMap[k]?.status === 'wrong').length;
  const letters = ['A', 'B', 'C', 'D'];

  const handleCopyCode = () => {
    if (!inputCode.trim()) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(inputCode.trim())
        .then(() => {
          showToast(
            'Đã sao chép Mã tiến độ! Bạn có thể gửi qua Zalo/tin nhắn để nạp trên thiết bị khác.',
            'success'
          );
        })
        .catch(() => {
          showToast('Đã chọn mã đồng bộ.', 'info');
        });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Lưu tự động tức thì · {subject.shortName}
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              Danh Sách Các Câu Đã Làm & Mã Đồng Bộ Điện Thoại ↔ Máy Tính
            </h3>
            <p className="text-xs text-slate-500">
              Mỗi khi bạn chọn đáp án xong 1 câu, kết quả được lưu ngay vào trình duyệt. Bạn cũng có thể sao chép <strong>Mã tiến độ</strong> bên dưới để đồng bộ giữa Điện thoại và Máy tính.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center shrink-0 font-mono-tabular">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              {answeredIds.length} / {subject.questions.length}
            </div>
            <div className="text-[11px] text-slate-500 font-sans">Tổng số câu đã làm</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <div className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {masteredCount}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-sans">
              Trả lời Đúng
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
            <div className="text-base sm:text-lg font-extrabold text-rose-600 dark:text-rose-400">
              {wrongCount}
            </div>
            <div className="text-[11px] text-rose-700 dark:text-rose-300 font-sans">
              Trả lời Sai
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[180px]">
          {answeredIds.length === 0 ? (
            <div className="text-center py-8 text-xs sm:text-sm text-slate-500">
              Bạn chưa làm câu nào trong môn <strong>{subject.shortName}</strong>. Hãy vào mục <strong>Học Chi Tiết</strong>, thử làm vài câu bất kỳ — kết quả từng câu sẽ tự động hiển thị tại đây!
            </div>
          ) : (
            answeredIds.map((qid) => {
              const qObj = subject.questions.find((x) => x.id === qid);
              const st = progressMap[qid];
              if (!qObj || !st) return null;
              const isOk = st.status === 'mastered';
              const chosenIdx =
                st.selectedOption !== undefined ? st.selectedOption : isOk ? qObj.answer : null;
              const chosenText =
                chosenIdx !== null && qObj.options[chosenIdx]
                  ? `${letters[chosenIdx]}. ${qObj.options[chosenIdx]}`
                  : 'Chưa chọn đáp án';
              const correctText = `${letters[qObj.answer]}. ${qObj.options[qObj.answer]}`;

              return (
                <div
                  key={qid}
                  className={`p-3.5 rounded-xl border ${
                    isOk
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                  } space-y-1.5 text-xs`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-extrabold ${
                        isOk
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isOk
                        ? `✓ Câu #${qid} — Trả lời ĐÚNG`
                        : `✗ Câu #${qid} — Trả lời SAI`}
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        onJumpToQuestion(qid);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-red-600 dark:text-amber-400 hover:bg-red-600 hover:text-white transition"
                    >
                      Mở Câu #{qid} →
                    </button>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">{qObj.question}</div>
                  <div className="text-slate-700 dark:text-slate-300">
                    • <strong>Đáp án bạn đã chọn:</strong> {chosenText}
                  </div>
                  {!isOk && (
                    <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      • <strong>Đáp án đúng:</strong> {correctText}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Đồng bộ / Sao lưu kết quả giữa Điện thoại và Máy tính:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
              >
                Sao chép Mã tiến độ
              </button>
              <button
                onClick={() => onRestoreSyncCode(inputCode)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold transition"
              >
                Nạp Mã tiến độ
              </button>
            </div>
          </div>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Dán Mã tiến độ vào đây để khôi phục các câu đã làm trên thiết bị khác..."
            className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          />
        </div>

        <div className="flex items-center justify-between pt-1 shrink-0">
          <button
            onClick={() => {
              onClose();
              onFilterAnsweredInStudy();
            }}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
          >
            Lọc xem các câu đã làm trong mục Học Chi Tiết
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
