import React, { useState } from 'react';
import { SubjectCourse } from '../data/defaultSubjects';
import { QuestionItem } from '../data/official300Bank';
import { autoExtractKeyword, parseRawQuestionsText } from '../utils/textAnalysis';

interface CourseImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectCourse[];
  activeSubjectId: string;
  onSelectSubject: (id: string) => void;
  onCreateSubject: (newSub: SubjectCourse) => void;
  onAddQuestionsToSubject: (subjectId: string, questions: QuestionItem[], moduleName?: string) => void;
  onDeleteSubject: (subjectId: string) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

const SAMPLE_RAW_TEXT = `Câu 1: Theo Luật Sĩ quan QĐND Việt Nam, ngạch sĩ quan tại ngũ bao gồm những đối tượng nào?
A. Sĩ quan đang công tác trong lực lượng thường trực của Quân đội nhân dân.
B. Sĩ quan dự bị đã đăng ký tại cơ quan quân sự địa phương.
C. Sĩ quan chỉ làm nhiệm vụ trong giờ hành chính tại địa bàn trọng điểm.
D. Sĩ quan đã nghỉ hưu hoặc phục viên về địa phương.
Đáp án: A
Giải thích: Ngạch sĩ quan tại ngũ gồm những sĩ quan thuộc lực lượng thường trực đang công tác trong Quân đội.

Câu 2: Mục tiêu xây dựng đơn vị vững mạnh toàn diện "mẫu mực, tiêu biểu" đòi hỏi yêu cầu nào về chấp hành kỷ luật?
A. Duy trì kỷ luật trong điều kiện thuận lợi và khi có đoàn kiểm tra.
B. Thượng tôn pháp luật, giữ nghiêm kỷ luật Quân đội, không để xảy ra vi phạm kỷ luật nghiêm trọng.
C. Chỉ tập trung rèn luyện kỷ luật đối với chiến sĩ mới nhập ngũ.
D. Giữ hòa khí khi có sai phạm nhỏ để bảo đảm chỉ tiêu thi đua.
Đáp án: B`;

export const CourseImporterModal: React.FC<CourseImporterModalProps> = ({
  isOpen,
  onClose,
  subjects,
  activeSubjectId,
  onSelectSubject,
  onCreateSubject,
  onAddQuestionsToSubject,
  onDeleteSubject,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'new_course' | 'import_text' | 'manual_add'>('list');

  // New Course State
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseCredits, setCourseCredits] = useState(3);
  const [courseExamDate, setCourseExamDate] = useState('2026-12-25');
  const [courseDailyGoal, setCourseDailyGoal] = useState(20);
  const [courseDesc, setCourseDesc] = useState('');

  // Text / File Import State
  const [targetSubjectId, setTargetSubjectId] = useState(activeSubjectId);
  const [moduleTitle, setModuleTitle] = useState('Chuyên đề bổ sung');
  const [rawTextInput, setRawTextInput] = useState('');

  // Manual Question Add State
  const [manualQ, setManualQ] = useState('');
  const [manualOpts, setManualOpts] = useState(['', '', '', '']);
  const [manualAns, setManualAns] = useState(0);
  const [manualKw, setManualKw] = useState('');
  const [manualExp, setManualExp] = useState('');

  if (!isOpen) return null;

  const targetSubject = subjects.find((s) => s.id === targetSubjectId) || subjects[0];

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) {
      showToast('Vui lòng nhập tên môn học tại chức!', 'error');
      return;
    }
    const id = 'sub-' + Date.now();
    const newCourse: SubjectCourse = {
      id,
      code: courseCode.trim() || 'TC-2026',
      name: courseName.trim(),
      shortName: courseName.trim().slice(0, 26),
      description: courseDesc.trim() || 'Học phần tại chức tự tạo để ôn luyện trắc nghiệm và thẻ ghi nhớ.',
      credits: Number(courseCredits) || 3,
      examDate: courseExamDate || '2026-12-30',
      dailyGoal: Number(courseDailyGoal) || 20,
      isBuiltIn: false,
      modules: {
        1: { id: 1, name: 'Chuyên đề 1: Nội dung trọng tâm', range: 'Học phần chính', color: 'from-red-600 to-amber-600' },
      },
      questions: [],
      cheatSheet: [],
    };
    onCreateSubject(newCourse);
    setTargetSubjectId(id);
    setCourseName('');
    setCourseCode('');
    setCourseDesc('');
    setActiveTab('import_text');
  };

  const handleParseAndImportText = () => {
    if (!rawTextInput.trim()) {
      showToast('Vui lòng dán nội dung câu hỏi hoặc bấm nút "Nạp mẫu thử"!', 'error');
      return;
    }
    const existingCount = targetSubject.questions.length;
    const nextModuleId = Object.keys(targetSubject.modules).length + 1;
    const parsed = parseRawQuestionsText(rawTextInput, existingCount + 1, nextModuleId);
    if (parsed.length === 0) {
      showToast('Không nhận diện được câu hỏi. Hãy kiểm tra định dạng Câu 1: ... A. ... B. ... Đáp án: A', 'error');
      return;
    }
    onAddQuestionsToSubject(targetSubject.id, parsed, moduleTitle.trim() || `Chuyên đề ${nextModuleId}`);
    setRawTextInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      if (file.name.endsWith('.json')) {
        try {
          const parsedJson = JSON.parse(content);
          const arr = Array.isArray(parsedJson) ? parsedJson : parsedJson.questions || [];
          if (!Array.isArray(arr) || arr.length === 0) {
            showToast('File JSON không chứa mảng câu hỏi hợp lệ!', 'error');
            return;
          }
          const startId = targetSubject.questions.length + 1;
          const normalized: QuestionItem[] = arr.map((item: Partial<QuestionItem>, idx: number) => {
            const opts = Array.isArray(item.options) && item.options.length >= 2
              ? item.options
              : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'];
            const ans = typeof item.answer === 'number' ? item.answer : 0;
            const kw = item.keyword || autoExtractKeyword(opts, ans);
            const qid = startId + idx;
            return {
              id: qid,
              module: item.module || 1,
              pack: Math.ceil(qid / 50) || 1,
              pack30: Math.ceil(qid / 30) || 1,
              first_letter: (item.question || 'C').trim().charAt(0).toUpperCase(),
              question: item.question || `Câu hỏi #${qid}`,
              options: opts,
              answer: ans,
              keyword: kw,
              explanation: item.explanation || `Đáp án chuẩn. Từ khóa quyết định: "${kw}".`,
              twins: item.twins || [],
            };
          });
          onAddQuestionsToSubject(targetSubject.id, normalized, moduleTitle.trim() || 'Chuyên đề nhập từ JSON');
        } catch {
          showToast('Lỗi đọc file JSON. Vui lòng kiểm tra cú pháp file!', 'error');
        }
      } else {
        setRawTextInput(content);
        showToast('Đã tải nội dung file vào khung soạn thảo. Bấm "Phân tích & Nhập vào môn học" để lưu!', 'info');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleAddManualQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQ.trim() || manualOpts.some((o) => !o.trim())) {
      showToast('Vui lòng nhập câu hỏi và đầy đủ 4 phương án A, B, C, D!', 'error');
      return;
    }
    const nextId = targetSubject.questions.length + 1;
    const kw = manualKw.trim() || autoExtractKeyword(manualOpts, manualAns);
    const letters = ['A', 'B', 'C', 'D'];
    const newQ: QuestionItem = {
      id: nextId,
      module: 1,
      pack: Math.ceil(nextId / 50) || 1,
      pack30: Math.ceil(nextId / 30) || 1,
      first_letter: manualQ.trim().charAt(0).toUpperCase(),
      question: manualQ.trim(),
      options: manualOpts.map((o) => o.trim()),
      answer: manualAns,
      keyword: kw,
      explanation: manualExp.trim() || `Đáp án đúng là ${letters[manualAns]}. Cụm từ khóa quyết định: "${kw}".`,
      twins: [],
    };
    onAddQuestionsToSubject(targetSubject.id, [newQ]);
    setManualQ('');
    setManualOpts(['', '', '', '']);
    setManualKw('');
    setManualExp('');
  };

  const exportSubjectToJson = (sub: SubjectCourse) => {
    const dataStr = JSON.stringify(sub, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sub.code.toLowerCase()}-${sub.questions.length}cau.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã tải xuống bộ đề môn "${sub.shortName}" (.json)!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Quản Lý Các Môn Học Tại Chức & Nhập Bộ Đề Trắc Nghiệm Mới
            </h3>
            <p className="text-xs text-slate-500">
              Chuyển đổi giữa bộ 300 câu Nhận thức Chính trị 2026 và các học phần tại chức khác, hoặc tự nhập thêm câu hỏi mới.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
              activeTab === 'list'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
            }`}
          >
            Danh sách Môn học ({subjects.length})
          </button>
          <button
            onClick={() => setActiveTab('new_course')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
              activeTab === 'new_course'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
            }`}
          >
            + Tạo Môn Tại Chức Mới
          </button>
          <button
            onClick={() => setActiveTab('import_text')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
              activeTab === 'import_text'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
            }`}
          >
            Nhập Nhanh Bộ Câu Hỏi (Văn bản / File)
          </button>
          <button
            onClick={() => setActiveTab('manual_add')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
              activeTab === 'manual_add'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
            }`}
          >
            Soạn Từng Câu Hỏi
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {activeTab === 'list' && (
            <div className="space-y-3">
              {subjects.map((sub) => {
                const isCurrent = sub.id === activeSubjectId;
                return (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? 'border-red-600 bg-red-50/40 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono-tabular">
                        <span className="font-bold text-slate-900 dark:text-white">{sub.code}</span>
                        <span>·</span>
                        <span>{sub.questions.length} câu hỏi</span>
                        <span>·</span>
                        <span>{sub.credits} tín chỉ</span>
                        <span>·</span>
                        <span>Thi dự kiến: {sub.examDate}</span>
                      </div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {sub.name}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{sub.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onSelectSubject(sub.id);
                          onClose();
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
                          isCurrent
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        }`}
                      >
                        {isCurrent ? '✓ Đang học môn này' : 'Chọn học môn này'}
                      </button>
                      <button
                        onClick={() => {
                          setTargetSubjectId(sub.id);
                          setActiveTab('import_text');
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition whitespace-nowrap shrink-0"
                      >
                        + Thêm câu hỏi
                      </button>
                      <button
                        onClick={() => exportSubjectToJson(sub)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition whitespace-nowrap shrink-0"
                      >
                        Xuất JSON
                      </button>
                      {!sub.isBuiltIn && (
                        <button
                          onClick={() => onDeleteSubject(sub.id)}
                          className="px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'new_course' && (
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Tên môn học tại chức *
                  </label>
                  <input
                    type="text"
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="VD: Kinh tế Chính trị Mác - Lênin / Hậu cần Quân sự"
                    className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Mã học phần / Ký hiệu
                  </label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="VD: KTCT-301"
                    className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Số tín chỉ / Đơn vị học trình
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={courseCredits}
                    onChange={(e) => setCourseCredits(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Ngày thi dự kiến
                  </label>
                  <input
                    type="date"
                    value={courseExamDate}
                    onChange={(e) => setCourseExamDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Mô tả ngắn / Ghi chú đề cương môn học
                </label>
                <textarea
                  rows={2}
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Ghi chú phạm vi ôn thi, tài liệu tham khảo hoặc giảng viên hướng dẫn..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition"
              >
                Tạo Môn Học & Chuyển Sang Nhập Câu Hỏi →
              </button>
            </form>
          )}

          {activeTab === 'import_text' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Chọn môn học cần thêm câu hỏi
                  </label>
                  <select
                    value={targetSubject.id}
                    onChange={(e) => setTargetSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Đang có {s.questions.length} câu)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Tên chuyên đề / Học phần cho đợt nhập này
                  </label>
                  <input
                    type="text"
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                    placeholder="VD: Chuyên đề Ôn tập Học kỳ 1"
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">
                  Hỗ trợ dán trực tiếp nhiều câu trắc nghiệm từ Word/PDF hoặc tải file (.txt, .json):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRawTextInput(SAMPLE_RAW_TEXT)}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold"
                  >
                    + Nạp mẫu định dạng chuẩn
                  </button>
                  <label className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold cursor-pointer">
                    Tải file (.json / .txt)
                    <input
                      type="file"
                      accept=".json,.txt,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                rows={8}
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                placeholder={SAMPLE_RAW_TEXT}
                className="w-full p-3.5 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Hệ thống sẽ tự động trích xuất cụm từ khóa quyết định nếu bạn không ghi dòng &ldquo;Từ khóa:&rdquo;.
                </span>
                <button
                  type="button"
                  onClick={handleParseAndImportText}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition"
                >
                  ✓ Phân tích & Nhập vào môn học
                </button>
              </div>
            </div>
          )}

          {activeTab === 'manual_add' && (
            <form onSubmit={handleAddManualQuestion} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Môn học đích: {targetSubject.name}
                </label>
                <input
                  type="text"
                  required
                  value={manualQ}
                  onChange={(e) => setManualQ(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {['A', 'B', 'C', 'D'].map((letStr, idx) => (
                  <div key={letStr} className="space-y-1">
                    <label className="flex items-center justify-between text-xs font-semibold">
                      <span>Phương án {letStr} *</span>
                      <label className="flex items-center gap-1 cursor-pointer text-emerald-600 dark:text-emerald-400">
                        <input
                          type="radio"
                          name="manualCorrectAns"
                          checked={manualAns === idx}
                          onChange={() => setManualAns(idx)}
                        />
                        <span>Đáp án đúng</span>
                      </label>
                    </label>
                    <input
                      type="text"
                      required
                      value={manualOpts[idx]}
                      onChange={(e) => {
                        const next = [...manualOpts];
                        next[idx] = e.target.value;
                        setManualOpts(next);
                      }}
                      placeholder={`Nội dung phương án ${letStr}...`}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={manualKw}
                  onChange={(e) => setManualKw(e.target.value)}
                  placeholder="Từ khóa quyết định (Để trống sẽ tự động trích xuất)"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <input
                  type="text"
                  value={manualExp}
                  onChange={(e) => setManualExp(e.target.value)}
                  placeholder="Giải thích / Mẹo nhớ (Tùy chọn)"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition"
              >
                + Lưu câu hỏi vào {targetSubject.shortName}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
