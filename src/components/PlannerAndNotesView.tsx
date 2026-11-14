import React, { useState } from 'react';
import { SubjectCourse, StudyScheduleItem, QuestionProgress } from '../data/defaultSubjects';

interface PlannerAndNotesViewProps {
  subjects: SubjectCourse[];
  activeSubjectId: string;
  allProgress: Record<string, Record<number, QuestionProgress>>;
  scheduleItems: StudyScheduleItem[];
  onSelectSubject: (subjectId: string) => void;
  onAddScheduleItem: (item: StudyScheduleItem) => void;
  onToggleScheduleItem: (id: string) => void;
  onDeleteScheduleItem: (id: string) => void;
  onOpenCourseManager: () => void;
  onJumpToQuestionInSubject: (subjectId: string, questionId: number) => void;
  onUpdateNote: (subjectId: string, questionId: number, noteText: string) => void;
}

export const PlannerAndNotesView: React.FC<PlannerAndNotesViewProps> = ({
  subjects,
  activeSubjectId,
  allProgress,
  scheduleItems,
  onSelectSubject,
  onAddScheduleItem,
  onToggleScheduleItem,
  onDeleteScheduleItem,
  onOpenCourseManager,
  onJumpToQuestionInSubject,
  onUpdateNote,
}) => {
  const [schTitle, setSchTitle] = useState('');
  const [schSubjectId, setSchSubjectId] = useState(activeSubjectId);
  const [schDate, setSchDate] = useState('2026-11-25');
  const [schTime, setSchTime] = useState('19:30 - 21:00');
  const [schRoom, setSchRoom] = useState('Phòng tự học / Online');
  const [schType, setSchType] = useState<'exam' | 'class' | 'self_study' | 'deadline'>('self_study');
  const [noteSearch, setNoteSearch] = useState('');

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schTitle.trim()) return;
    onAddScheduleItem({
      id: 'sch-' + Date.now(),
      subjectId: schSubjectId,
      title: schTitle.trim(),
      date: schDate,
      timeSlot: schTime.trim() || '19:30 - 21:00',
      locationOrRoom: schRoom.trim() || 'Tự học',
      type: schType,
      completed: false,
    });
    setSchTitle('');
  };

  // Gather all personal notes across all subjects
  const allNotes: Array<{
    subjectId: string;
    subjectName: string;
    questionId: number;
    questionText: string;
    keyword: string;
    note: string;
  }> = [];

  subjects.forEach((sub) => {
    const subProg = allProgress[sub.id] || {};
    Object.keys(subProg).forEach((qidStr) => {
      const qid = Number(qidStr);
      const noteText = subProg[qid]?.note?.trim();
      if (noteText) {
        const qObj = sub.questions.find((x) => x.id === qid);
        if (qObj) {
          allNotes.push({
            subjectId: sub.id,
            subjectName: sub.shortName,
            questionId: qid,
            questionText: qObj.question,
            keyword: qObj.keyword,
            note: noteText,
          });
        }
      }
    });
  });

  const filteredNotes = allNotes.filter((n) => {
    const q = noteSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      n.note.toLowerCase().includes(q) ||
      n.questionText.toLowerCase().includes(q) ||
      n.subjectName.toLowerCase().includes(q) ||
      String(n.questionId).includes(q)
    );
  });

  return (
    <section className="space-y-6">
      {/* Multi-Subject Continuing Education Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Bảng Theo Dõi Tiến Độ Các Học Phần Tại Chức & Lịch Thi
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Quản lý toàn bộ chương trình học tại chức, chỉ tiêu số câu mỗi ngày và sổ tay ghi chú cá nhân.
            </p>
          </div>
          <button
            onClick={onOpenCourseManager}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition whitespace-nowrap shrink-0"
          >
            + Thêm Môn Học / Nhập Bộ Đề Mới
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subjects.map((sub) => {
            const subProg = allProgress[sub.id] || {};
            const total = sub.questions.length;
            let mastered = 0;
            let wrong = 0;
            Object.values(subProg).forEach((p) => {
              if (p.status === 'mastered') mastered++;
              else if (p.status === 'wrong') wrong++;
            });
            const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
            const isCurrent = sub.id === activeSubjectId;

            return (
              <div
                key={sub.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? 'border-red-600 bg-red-50/30 dark:bg-red-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono-tabular">
                    <span className="font-bold text-slate-900 dark:text-white">{sub.code}</span>
                    <span>{sub.credits} tín chỉ · Thi: {sub.examDate}</span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {sub.name}
                  </h3>
                  <div className="flex items-center justify-between text-xs font-mono-tabular">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Thuộc: {mastered}/{total} ({pct}%)
                    </span>
                    <span className="text-rose-600 font-semibold">Cần ôn: {wrong}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 font-mono-tabular">
                    Chỉ tiêu: {sub.dailyGoal} câu/ngày
                  </span>
                  <button
                    onClick={() => onSelectSubject(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    }`}
                  >
                    {isCurrent ? 'Đang mở' : 'Chuyển sang môn này'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Study Schedule (6 cols) + Personal Notes Notebook (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 cols: Lịch Học & Lịch Thi Tại Chức */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Lịch Học Tập, Lịch Lên Lớp & Ngày Thi Tại Chức
            </h3>
            <p className="text-xs text-slate-500">
              Đánh dấu các buổi học tối/cuối tuần và mốc kiểm tra để chủ động phân bổ thời gian.
            </p>
          </div>

          <form onSubmit={handleCreateSchedule} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              + Thêm lịch học / lịch thi mới:
            </div>
            <input
              type="text"
              required
              value={schTitle}
              onChange={(e) => setSchTitle(e.target.value)}
              placeholder="Nội dung buổi học / kỳ thi (VD: Ôn 60 câu Phần III ĐH Đảng bộ Quân đội XII)..."
              className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <select
                value={schSubjectId}
                onChange={(e) => setSchSubjectId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={schDate}
                onChange={(e) => setSchDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono-tabular"
              />
              <select
                value={schType}
                onChange={(e) => setSchType(e.target.value as StudyScheduleItem['type'])}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <option value="self_study">Tự ôn luyện</option>
                <option value="class">Lịch lên lớp tại chức</option>
                <option value="exam">Lịch thi / Kiểm tra</option>
                <option value="deadline">Hạn nộp bài / Tiểu luận</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={schTime}
                onChange={(e) => setSchTime(e.target.value)}
                placeholder="Khung giờ (VD: 19:30 - 21:00)"
                className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
              >
                + Lưu vào lịch học
              </button>
            </div>
          </form>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {scheduleItems.map((item) => {
              const subName = subjects.find((s) => s.id === item.subjectId)?.shortName || 'Học phần';
              const typeLabel =
                item.type === 'exam'
                  ? 'Lịch Thi'
                  : item.type === 'class'
                  ? 'Lên Lớp'
                  : item.type === 'deadline'
                  ? 'Hạn Nộp'
                  : 'Tự Học';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                    item.completed
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-65'
                      : item.type === 'exam'
                      ? 'border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => onToggleScheduleItem(item.id)}
                      className="mt-1 rounded"
                    />
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-mono-tabular">
                        <span className="font-bold text-red-600 dark:text-amber-400">{typeLabel}</span>
                        <span>·</span>
                        <span>{item.date}</span>
                        <span>·</span>
                        <span>{item.timeSlot}</span>
                        <span>·</span>
                        <span className="font-sans">{subName}</span>
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-bold ${
                          item.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500">{item.locationOrRoom}</div>
                    </div>
                  </label>
                  <button
                    onClick={() => onDeleteScheduleItem(item.id)}
                    className="text-xs text-slate-400 hover:text-rose-600"
                    title="Xóa lịch này"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 6 cols: Sổ Tay Ghi Chú Cá Nhân */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Sổ Tay Ghi Chú Cá Nhân ({allNotes.length} ghi chú)
              </h3>
              <p className="text-xs text-slate-500">
                Tất cả mẹo nhớ riêng bạn đã ghi tại từng câu hỏi trong quá trình Học hoặc lật Flashcards.
              </p>
            </div>
            <input
              type="text"
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              placeholder="Tìm trong ghi chú..."
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          {filteredNotes.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                Chưa có ghi chú cá nhân nào
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Khi đang ở mục <strong>Học 300 Câu</strong> hoặc <strong>Thẻ Ghi Nhớ (Flashcards)</strong>, bạn có thể nhập mẹo nhớ riêng cho bất kỳ câu hỏi nào và toàn bộ sẽ được tổng hợp tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredNotes.map((n) => (
                <div
                  key={`${n.subjectId}-${n.questionId}`}
                  className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-900 dark:text-amber-300 font-mono-tabular">
                      {n.subjectName} · Câu #{n.questionId}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onJumpToQuestionInSubject(n.subjectId, n.questionId)}
                        className="font-bold text-red-600 dark:text-amber-400 hover:underline"
                      >
                        Mở câu hỏi →
                      </button>
                      <button
                        onClick={() => onUpdateNote(n.subjectId, n.questionId, '')}
                        className="text-slate-400 hover:text-rose-600"
                        title="Xóa ghi chú"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {n.questionText}
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 text-slate-900 dark:text-slate-100 font-medium">
                    Ghi chú của bạn: {n.note}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
