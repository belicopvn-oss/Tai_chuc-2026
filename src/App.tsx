import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_SUBJECTS,
  DEFAULT_SCHEDULE_ITEMS,
  SubjectCourse,
  StudyScheduleItem,
  QuestionProgress,
} from './data/defaultSubjects';
import { QuestionItem } from './data/official300Bank';
import {
  computeCommonWordPrefixLen,
  detectTrapInOption,
  formatOptionWithDiffAndKeyword,
  highlightTextWithKeyword,
} from './utils/textAnalysis';
import { FlashcardsView } from './components/FlashcardsView';
import { CourseImporterModal } from './components/CourseImporterModal';
import { PlannerAndNotesView } from './components/PlannerAndNotesView';
import { MemoryHubView } from './components/MemoryHubView';
import { SaveSyncModal } from './components/SaveSyncModal';

type ViewMode =
  | 'dashboard'
  | 'study'
  | 'flashcards'
  | 'exam'
  | 'wrong'
  | 'memory'
  | 'planner';

interface ShuffledOption {
  text: string;
  origIdx: number;
}

interface ExamQuestionState {
  qObj: QuestionItem;
  shuffledOptions: ShuffledOption[];
  selectedShuffledIdx: number | null;
  flagged: boolean;
}

const LEGACY_STORAGE_KEY = 'chinhtri300_2026_abc_state_v3';
const MULTI_STORAGE_KEY = 'chinhtri300_2026_multisubject_v4';

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

export default function App() {
  // ==================== 1. STATE INITIALIZATION ====================
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [keywordHighlight, setKeywordHighlight] = useState<boolean>(true);
  const [diffFocusMode, setDiffFocusMode] = useState<boolean>(true);
  const [revealAllStudy, setRevealAllStudy] = useState<boolean>(false);

  const [subjects, setSubjects] = useState<SubjectCourse[]>(DEFAULT_SUBJECTS);
  const [activeSubjectId, setActiveSubjectId] = useState<string>('chinhtri-300-2026');
  const [allProgress, setAllProgress] = useState<
    Record<string, Record<number, QuestionProgress>>
  >({
    'chinhtri-300-2026': {},
  });
  const [lastQuestionBySubject, setLastQuestionBySubject] = useState<Record<string, number>>({
    'chinhtri-300-2026': 1,
  });
  const [examsTakenBySubject, setExamsTakenBySubject] = useState<Record<string, number>>({
    'chinhtri-300-2026': 0,
  });
  const [scheduleItems, setScheduleItems] = useState<StudyScheduleItem[]>(DEFAULT_SCHEDULE_ITEMS);

  // Study Filters
  const [studySearch, setStudySearch] = useState<string>('');
  const [studyModule, setStudyModule] = useState<string>('all');
  const [studyPack, setStudyPack] = useState<string>('all');
  const [studyStatus, setStudyStatus] = useState<string>('all');
  const [studyCurrentIndex, setStudyCurrentIndex] = useState<number>(0);
  const [noteDraft, setNoteDraft] = useState<string>('');

  // Exam State
  const [examCountSelect, setExamCountSelect] = useState<number>(30);
  const [examSourceSelect, setExamSourceSelect] = useState<string>('all');
  const [examShuffleOpt, setExamShuffleOpt] = useState<string>('yes');
  const [examFeedbackMode, setExamFeedbackMode] = useState<'end' | 'instant'>('end');
  const [examStage, setExamStage] = useState<'setup' | 'running' | 'result'>('setup');
  const [examQuestions, setExamQuestions] = useState<ExamQuestionState[]>([]);
  const [examCurrentIdx, setExamCurrentIdx] = useState<number>(0);
  const [examRemainingSec, setExamRemainingSec] = useState<number>(1800);
  const [examTitle, setExamTitle] = useState<string>('Đề ngẫu nhiên 30 câu');
  const examTimerRef = useRef<number | null>(null);

  // Wrong View Inline Feedback State
  const [wrongAttemptSelected, setWrongAttemptSelected] = useState<Record<number, number>>({});
  const [wrongFeedbackMsg, setWrongFeedbackMsg] = useState<
    Record<number, { isCorrect: boolean; text: string }>
  >({});

  // Modals & Toasts
  const [isCourseModalOpen, setIsCourseModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<
    Array<{ id: number; msg: string; type: 'info' | 'success' | 'error' }>
  >([]);

  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, msg, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  // ==================== 2. LOAD & SAVE PERSISTENT STATE ====================
  useEffect(() => {
    let loadedMulti: string | null = null;
    try {
      loadedMulti = localStorage.getItem(MULTI_STORAGE_KEY);
    } catch {
      // ignore
    }
    if (!loadedMulti) {
      try {
        if (window.name && window.name.startsWith('CT300_V4:')) {
          loadedMulti = window.name.slice(9);
        }
      } catch {
        // ignore
      }
    }

    if (loadedMulti) {
      try {
        const parsed = JSON.parse(loadedMulti);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.darkMode === 'boolean') setDarkMode(parsed.darkMode);
          if (typeof parsed.keywordHighlight === 'boolean')
            setKeywordHighlight(parsed.keywordHighlight);
          if (typeof parsed.diffFocusMode === 'boolean') setDiffFocusMode(parsed.diffFocusMode);
          if (parsed.activeSubjectId) setActiveSubjectId(parsed.activeSubjectId);
          if (parsed.allProgress) setAllProgress(parsed.allProgress);
          if (parsed.lastQuestionBySubject)
            setLastQuestionBySubject(parsed.lastQuestionBySubject);
          if (parsed.examsTakenBySubject) setExamsTakenBySubject(parsed.examsTakenBySubject);
          if (Array.isArray(parsed.scheduleItems)) setScheduleItems(parsed.scheduleItems);
          if (Array.isArray(parsed.customSubjects) && parsed.customSubjects.length > 0) {
            const builtIn = DEFAULT_SUBJECTS[0];
            const customList = parsed.customSubjects.filter(
              (c: SubjectCourse) => c.id !== builtIn.id
            );
            setSubjects([builtIn, ...customList]);
          }
          return;
        }
      } catch {
        // fallback to legacy
      }
    }

    // Check legacy v3 storage from original HTML if present
    try {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const leg = JSON.parse(legacyRaw);
        if (leg && typeof leg === 'object') {
          setDarkMode(!!leg.darkMode);
          if (leg.keywordHighlight !== undefined) setKeywordHighlight(!!leg.keywordHighlight);
          if (leg.progress) {
            setAllProgress((prev) => ({
              ...prev,
              'chinhtri-300-2026': leg.progress,
            }));
          }
          if (leg.lastQuestionId) {
            setLastQuestionBySubject((prev) => ({
              ...prev,
              'chinhtri-300-2026': Number(leg.lastQuestionId) || 1,
            }));
          }
          if (leg.examsTaken) {
            setExamsTakenBySubject((prev) => ({
              ...prev,
              'chinhtri-300-2026': Number(leg.examsTaken) || 0,
            }));
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save state whenever key values change
  useEffect(() => {
    const customSubjects = subjects.filter((s) => !s.isBuiltIn);
    const payload = JSON.stringify({
      darkMode,
      keywordHighlight,
      diffFocusMode,
      activeSubjectId,
      allProgress,
      lastQuestionBySubject,
      examsTakenBySubject,
      scheduleItems,
      customSubjects,
    });
    try {
      localStorage.setItem(MULTI_STORAGE_KEY, payload);
    } catch {
      // ignore
    }
    try {
      window.name = 'CT300_V4:' + payload;
    } catch {
      // ignore
    }
    // Also mirror default subject to legacy key for 100% compatibility
    try {
      const legacyPayload = JSON.stringify({
        darkMode,
        keywordHighlight,
        examsTaken: examsTakenBySubject['chinhtri-300-2026'] || 0,
        lastQuestionId: lastQuestionBySubject['chinhtri-300-2026'] || 1,
        lastSavedAt: Date.now(),
        progress: allProgress['chinhtri-300-2026'] || {},
      });
      localStorage.setItem(LEGACY_STORAGE_KEY, legacyPayload);
    } catch {
      // ignore
    }
  }, [
    darkMode,
    keywordHighlight,
    diffFocusMode,
    activeSubjectId,
    allProgress,
    lastQuestionBySubject,
    examsTakenBySubject,
    scheduleItems,
    subjects,
  ]);

  // Apply Dark Mode class to <html>
  useEffect(() => {
    const htmlEl = document.documentElement;
    if (darkMode) {
      htmlEl.classList.add('dark');
    } else {
      htmlEl.classList.remove('dark');
    }
  }, [darkMode]);

  // ==================== 3. DERIVED CURRENT SUBJECT & STATS ====================
  const activeSubject: SubjectCourse = useMemo(() => {
    return subjects.find((s) => s.id === activeSubjectId) || subjects[0];
  }, [subjects, activeSubjectId]);

  const currentProgressMap: Record<number, QuestionProgress> = useMemo(() => {
    return allProgress[activeSubject.id] || {};
  }, [allProgress, activeSubject.id]);

  const lastQuestionId = lastQuestionBySubject[activeSubject.id] || 1;
  const examsTaken = examsTakenBySubject[activeSubject.id] || 0;

  const stats = useMemo(() => {
    let mastered = 0;
    let wrong = 0;
    let uncertain = 0;
    let answered = 0;
    Object.keys(currentProgressMap).forEach((idStr) => {
      const st = currentProgressMap[Number(idStr)];
      if (!st) return;
      if (st.status === 'mastered' || st.status === 'wrong') {
        answered++;
      }
      if (st.status === 'mastered') {
        mastered++;
        if (st.confidence === 'uncertain' || st.starred) uncertain++;
      } else if (st.status === 'wrong') {
        wrong++;
      } else if (st.starred || st.confidence === 'uncertain') {
        uncertain++;
      }
    });
    const total = activeSubject.questions.length;
    return {
      total,
      answered,
      mastered,
      wrong,
      uncertain,
      sureGreen: Math.max(0, mastered - uncertain),
      pct: total > 0 ? Math.round((mastered / total) * 100) : 0,
    };
  }, [currentProgressMap, activeSubject.questions.length]);

  const filteredStudyList = useMemo(() => {
    const qSearch = studySearch.trim().toLowerCase();
    return activeSubject.questions.filter((q) => {
      if (studyModule !== 'all') {
        if (studyModule.startsWith('let_')) {
          const targetLet = studyModule.replace('let_', '');
          if (targetLet === 'D') {
            if (q.first_letter !== 'D' && q.first_letter !== 'Đ') return false;
          } else if (targetLet === 'L') {
            if (q.first_letter !== 'L' && q.first_letter !== 'M') return false;
          } else if (q.first_letter !== targetLet) return false;
        } else if (q.module !== Number(studyModule)) {
          return false;
        }
      }
      if (studyPack !== 'all') {
        if (studyPack.startsWith('p30_')) {
          if (q.pack30 !== Number(studyPack.replace('p30_', ''))) return false;
        } else if (q.pack !== Number(studyPack)) {
          return false;
        }
      }
      const prog = currentProgressMap[q.id];
      if (studyStatus === 'answered' && !prog?.status) return false;
      if (studyStatus === 'unanswered' && prog?.status) return false;
      if (
        studyStatus === 'mastered' &&
        (prog?.status !== 'mastered' || prog?.confidence === 'uncertain')
      )
        return false;
      if (studyStatus === 'uncertain' && !(prog?.confidence === 'uncertain' || prog?.starred))
        return false;
      if (studyStatus === 'wrong' && prog?.status !== 'wrong') return false;
      if (studyStatus === 'starred' && !prog?.starred) return false;

      if (qSearch) {
        const matchId = String(q.id) === qSearch || `câu ${q.id}` === qSearch;
        const matchText =
          q.question.toLowerCase().includes(qSearch) ||
          q.options.some((o) => o.toLowerCase().includes(qSearch)) ||
          (q.keyword && q.keyword.toLowerCase().includes(qSearch));
        if (!matchId && !matchText) return false;
      }
      return true;
    });
  }, [activeSubject.questions, studyModule, studyPack, studyStatus, studySearch, currentProgressMap]);

  const safeStudyIndex =
    filteredStudyList.length > 0
      ? Math.max(0, Math.min(studyCurrentIndex, filteredStudyList.length - 1))
      : 0;
  const currentStudyQuestion: QuestionItem | undefined = filteredStudyList[safeStudyIndex];

  useEffect(() => {
    if (currentStudyQuestion) {
      setNoteDraft(currentProgressMap[currentStudyQuestion.id]?.note || '');
      if (currentView === 'study') {
        setLastQuestionBySubject((prev) => ({
          ...prev,
          [activeSubject.id]: currentStudyQuestion.id,
        }));
      }
    }
  }, [currentStudyQuestion?.id, activeSubject.id, currentView]);

  // ==================== 4. PROGRESS & STUDY HANDLERS ====================
  const updateQuestionProgress = (
    subjectId: string,
    questionId: number,
    updater: (prev: QuestionProgress) => QuestionProgress
  ) => {
    setAllProgress((prevAll) => {
      const subMap = prevAll[subjectId] || {};
      const prevItem = subMap[questionId] || {};
      return {
        ...prevAll,
        [subjectId]: {
          ...subMap,
          [questionId]: updater(prevItem),
        },
      };
    });
  };

  const handleStudySelectOption = (qObj: QuestionItem, selectedIdx: number) => {
    const isCorrect = selectedIdx === qObj.answer;
    setLastQuestionBySubject((prev) => ({
      ...prev,
      [activeSubject.id]: qObj.id,
    }));
    updateQuestionProgress(activeSubject.id, qObj.id, (prev) => ({
      ...prev,
      selectedOption: selectedIdx,
      status: isCorrect ? 'mastered' : 'wrong',
      wrongCount: isCorrect ? prev.wrongCount || 0 : (prev.wrongCount || 0) + 1,
      recoveryStreak: isCorrect ? prev.recoveryStreak || 0 : 0,
      answeredAt: Date.now(),
    }));
  };

  const jumpToQuestionById = (qid: number, targetSubId = activeSubject.id) => {
    if (targetSubId !== activeSubject.id) {
      setActiveSubjectId(targetSubId);
    }
    const targetSub = subjects.find((s) => s.id === targetSubId) || activeSubject;
    setStudySearch('');
    setStudyModule('all');
    setStudyPack('all');
    setStudyStatus('all');
    const idx = targetSub.questions.findIndex((q) => q.id === Number(qid));
    setStudyCurrentIndex(idx >= 0 ? idx : 0);
    setCurrentView('study');
  };

  const handleRateFlashcard = (questionId: number, bucket: 'red' | 'yellow' | 'green') => {
    const qObj = activeSubject.questions.find((q) => q.id === questionId);
    updateQuestionProgress(activeSubject.id, questionId, (prev) => {
      if (bucket === 'red') {
        return {
          ...prev,
          status: 'wrong',
          wrongCount: (prev.wrongCount || 0) + 1,
          recoveryStreak: 0,
          answeredAt: Date.now(),
        };
      }
      if (bucket === 'yellow') {
        return {
          ...prev,
          status: 'mastered',
          selectedOption: qObj?.answer,
          confidence: 'uncertain',
          starred: true,
          answeredAt: Date.now(),
        };
      }
      return {
        ...prev,
        status: 'mastered',
        selectedOption: qObj?.answer,
        confidence: 'sure',
        answeredAt: Date.now(),
      };
    });
    showToast(
      bucket === 'red'
        ? `Đã đưa Câu #${questionId} vào Giỏ Đỏ để ôn kỹ lại.`
        : bucket === 'yellow'
        ? `Đã đưa Câu #${questionId} vào Giỏ Vàng (Còn phân vân).`
        : `✓ Đã xác nhận thuộc chắc Câu #${questionId} (Giỏ Xanh)!`,
      bucket === 'green' ? 'success' : 'info'
    );
  };

  const handleSaveNote = (questionId: number, noteText: string, subId = activeSubject.id) => {
    updateQuestionProgress(subId, questionId, (prev) => ({
      ...prev,
      note: noteText.trim(),
    }));
    showToast(
      noteText.trim()
        ? `Đã lưu ghi chú cá nhân cho Câu #${questionId}!`
        : `Đã xóa ghi chú của Câu #${questionId}.`,
      'success'
    );
  };

  // ==================== 5. EXAM ENGINE ====================
  const startGeneratedExam = (customCount?: number, customSource?: string) => {
    const countVal = customCount || examCountSelect || 30;
    const sourceVal = customSource || examSourceSelect;
    const shouldShuffleOpts = examShuffleOpt === 'yes';

    let pool: QuestionItem[] = [];
    if (sourceVal === 'wrong') {
      pool = activeSubject.questions.filter((q) => currentProgressMap[q.id]?.status === 'wrong');
      if (pool.length === 0) {
        showToast(
          `Môn ${activeSubject.shortName} chưa có câu làm sai nào! Hệ thống sẽ rút ngẫu nhiên từ toàn bộ ngân hàng câu hỏi.`,
          'info'
        );
        pool = activeSubject.questions.slice();
      }
    } else if (sourceVal !== 'all') {
      pool = activeSubject.questions.filter((q) => q.module === Number(sourceVal));
    } else {
      pool = activeSubject.questions.slice();
    }

    const selected = shuffleArray(pool).slice(0, Math.min(countVal, pool.length));
    const items: ExamQuestionState[] = selected.map((qObj) => {
      const indexed: ShuffledOption[] = qObj.options.map((text, origIdx) => ({ text, origIdx }));
      return {
        qObj,
        shuffledOptions: shouldShuffleOpts ? shuffleArray(indexed) : indexed,
        selectedShuffledIdx: null,
        flagged: false,
      };
    });

    if (examTimerRef.current) window.clearInterval(examTimerRef.current);
    const durationMins = countVal === 50 ? 45 : countVal;
    setExamQuestions(items);
    setExamCurrentIdx(0);
    setExamRemainingSec(durationMins * 60);
    setExamTitle(`Đề ngẫu nhiên ${items.length} câu · ${activeSubject.shortName}`);
    setExamStage('running');
  };

  useEffect(() => {
    if (examStage !== 'running') {
      if (examTimerRef.current) window.clearInterval(examTimerRef.current);
      return;
    }
    examTimerRef.current = window.setInterval(() => {
      setExamRemainingSec((prev) => {
        if (prev <= 1) {
          if (examTimerRef.current) window.clearInterval(examTimerRef.current);
          showToast('Đã hết thời gian làm bài! Hệ thống tự động chấm điểm.', 'info');
          finishExamNow();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (examTimerRef.current) window.clearInterval(examTimerRef.current);
    };
  }, [examStage]);

  const finishExamNow = () => {
    if (examTimerRef.current) window.clearInterval(examTimerRef.current);
    setExamsTakenBySubject((prev) => ({
      ...prev,
      [activeSubject.id]: (prev[activeSubject.id] || 0) + 1,
    }));

    setAllProgress((prevAll) => {
      const subMap = { ...(prevAll[activeSubject.id] || {}) };
      examQuestions.forEach((item) => {
        const chosenOpt =
          item.selectedShuffledIdx !== null
            ? item.shuffledOptions[item.selectedShuffledIdx]
            : null;
        const isCorrect = chosenOpt && chosenOpt.origIdx === item.qObj.answer;
        const prev = subMap[item.qObj.id] || {};
        if (isCorrect) {
          subMap[item.qObj.id] = {
            ...prev,
            status: 'mastered',
            selectedOption: item.qObj.answer,
            answeredAt: Date.now(),
          };
        } else {
          subMap[item.qObj.id] = {
            ...prev,
            status: 'wrong',
            selectedOption: chosenOpt ? chosenOpt.origIdx : undefined,
            wrongCount: (prev.wrongCount || 0) + 1,
            recoveryStreak: 0,
            answeredAt: Date.now(),
          };
        }
      });
      return {
        ...prevAll,
        [activeSubject.id]: subMap,
      };
    });

    setExamStage('result');
  };

  // ==================== 6. KEYBOARD SHORTCUTS (STUDY & EXAM) ====================
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName))
        return;
      const key = e.key.toLowerCase();
      const optMap: Record<string, number> = {
        '1': 0,
        a: 0,
        '2': 1,
        b: 1,
        '3': 2,
        c: 2,
        '4': 3,
        d: 3,
      };

      if (currentView === 'study' && currentStudyQuestion) {
        if (key in optMap) {
          handleStudySelectOption(currentStudyQuestion, optMap[key]);
        } else if (e.key === 'ArrowRight') {
          setStudyCurrentIndex((i) =>
            filteredStudyList.length > 0 ? (i + 1) % filteredStudyList.length : 0
          );
        } else if (e.key === 'ArrowLeft') {
          setStudyCurrentIndex((i) =>
            filteredStudyList.length > 0
              ? (i - 1 + filteredStudyList.length) % filteredStudyList.length
              : 0
          );
        }
      } else if (currentView === 'exam' && examStage === 'running') {
        if (key in optMap) {
          const sIdx = optMap[key];
          setExamQuestions((prev) =>
            prev.map((q, idx) => (idx === examCurrentIdx ? { ...q, selectedShuffledIdx: sIdx } : q))
          );
        } else if (e.key === 'ArrowRight') {
          setExamCurrentIdx((i) => (examQuestions.length > 0 ? (i + 1) % examQuestions.length : 0));
        } else if (e.key === 'ArrowLeft') {
          setExamCurrentIdx((i) =>
            examQuestions.length > 0
              ? (i - 1 + examQuestions.length) % examQuestions.length
              : 0
          );
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentView, currentStudyQuestion, filteredStudyList.length, examStage, examCurrentIdx, examQuestions.length]);

  // ==================== 7. SAMPLE WRONG QUESTIONS & COURSE HANDLERS ====================
  const loadSampleWrongQuestions = () => {
    const sampleIds =
      activeSubject.id === 'chinhtri-300-2026'
        ? [6, 67, 89, 94, 264, 265]
        : activeSubject.questions.slice(0, 3).map((q) => q.id);

    setAllProgress((prevAll) => {
      const subMap = { ...(prevAll[activeSubject.id] || {}) };
      sampleIds.forEach((id) => {
        const prev = subMap[id] || {};
        subMap[id] = {
          ...prev,
          status: 'wrong',
          wrongCount: (prev.wrongCount || 0) + 1,
          recoveryStreak: 0,
          answeredAt: Date.now(),
        };
      });
      return {
        ...prevAll,
        [activeSubject.id]: subMap,
      };
    });
    setWrongAttemptSelected({});
    setWrongFeedbackMsg({});
    showToast(
      `Đã nạp ${sampleIds.length} câu trắc nghiệm dễ nhầm lẫn vào Sổ tay câu sai!`,
      'success'
    );
  };

  const handleWrongDrillSelect = (qObj: QuestionItem, chosenIdx: number) => {
    setWrongAttemptSelected((prev) => ({ ...prev, [qObj.id]: chosenIdx }));
    const letters = ['A', 'B', 'C', 'D'];
    if (chosenIdx === qObj.answer) {
      const prevStreak = currentProgressMap[qObj.id]?.recoveryStreak || 0;
      const newStreak = prevStreak + 1;
      if (newStreak >= 2) {
        updateQuestionProgress(activeSubject.id, qObj.id, (prev) => ({
          ...prev,
          status: 'mastered',
          recoveryStreak: 2,
          selectedOption: chosenIdx,
          answeredAt: Date.now(),
        }));
        showToast(
          `Tuyệt vời! Câu #${qObj.id} đã trả lời đúng 2/2 lần liên tiếp và được xóa khỏi Sổ tay câu sai.`,
          'success'
        );
      } else {
        updateQuestionProgress(activeSubject.id, qObj.id, (prev) => ({
          ...prev,
          recoveryStreak: newStreak,
        }));
        setWrongFeedbackMsg((prev) => ({
          ...prev,
          [qObj.id]: {
            isCorrect: true,
            text: `✓ Chính xác! Tiến độ khắc phục: 1/2 (Hãy làm đúng thêm 1 lần nữa để xóa khỏi Sổ tay câu sai). Mẹo nhớ: "${qObj.keyword}"`,
          },
        }));
      }
    } else {
      updateQuestionProgress(activeSubject.id, qObj.id, (prev) => ({
        ...prev,
        recoveryStreak: 0,
        wrongCount: (prev.wrongCount || 1) + 1,
      }));
      setWrongFeedbackMsg((prev) => ({
        ...prev,
        [qObj.id]: {
          isCorrect: false,
          text: `✗ Chưa đúng! Đáp án đúng là ${letters[qObj.answer]}. Tiến độ trả nợ quay về 0/2. Mẹo nhớ: "${qObj.keyword}"`,
        },
      }));
    }
  };

  const syncCodeString = useMemo(() => {
    try {
      return btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify({
              activeSubjectId,
              lastQuestionBySubject,
              allProgress,
            })
          )
        )
      );
    } catch {
      return '';
    }
  }, [activeSubjectId, lastQuestionBySubject, allProgress]);

  const handleRestoreSyncCode = (code: string) => {
    if (!code.trim()) {
      showToast('Vui lòng dán Mã tiến độ vào ô trước khi nạp!', 'error');
      return;
    }
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (decoded && typeof decoded === 'object') {
        if (decoded.allProgress) {
          setAllProgress((prev) => ({ ...prev, ...decoded.allProgress }));
        } else if (decoded.progress) {
          // Legacy v3 sync code compatibility!
          setAllProgress((prev) => ({
            ...prev,
            'chinhtri-300-2026': {
              ...(prev['chinhtri-300-2026'] || {}),
              ...decoded.progress,
            },
          }));
        }
        if (decoded.lastQuestionBySubject) {
          setLastQuestionBySubject((prev) => ({ ...prev, ...decoded.lastQuestionBySubject }));
        } else if (decoded.lastQuestionId) {
          setLastQuestionBySubject((prev) => ({
            ...prev,
            'chinhtri-300-2026': Number(decoded.lastQuestionId),
          }));
        }
        showToast(
          '✓ Đã khôi phục thành công toàn bộ các câu đã làm, kết quả và ghi chú!',
          'success'
        );
      } else {
        showToast('Mã tiến độ không đúng định dạng.', 'error');
      }
    } catch {
      showToast('Mã tiến độ không hợp lệ. Vui lòng kiểm tra lại!', 'error');
    }
  };

  const letters = ['A', 'B', 'C', 'D'];
  const nextUnansweredQuestion =
    activeSubject.questions.find(
      (q) => q.id >= lastQuestionId && !currentProgressMap[q.id]?.status
    ) ||
    activeSubject.questions.find((q) => !currentProgressMap[q.id]?.status) ||
    activeSubject.questions[0];

  const recentAnsweredIds = Object.keys(currentProgressMap)
    .map(Number)
    .filter(
      (k) =>
        currentProgressMap[k]?.status === 'mastered' || currentProgressMap[k]?.status === 'wrong'
    )
    .sort(
      (a, b) =>
        (currentProgressMap[b]?.answeredAt || b) - (currentProgressMap[a]?.answeredAt || a)
    );

  // ==================== 8. RENDER ====================
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Top Bar following clean 3-Zone Contract */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element Brand wordmark */}
          <button
            onClick={() => setCurrentView('dashboard')}
            className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            ChínhTrị<span className="text-red-600 dark:text-amber-400">300+</span>
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {[
              { id: 'dashboard', label: 'Tổng quan' },
              { id: 'study', label: `Học (${activeSubject.questions.length})` },
              { id: 'flashcards', label: 'Flashcards' },
              { id: 'exam', label: 'Thi Thử' },
              { id: 'wrong', label: `Câu Sai (${stats.wrong})` },
              { id: 'memory', label: 'Siêu Trí Nhớ' },
              { id: 'planner', label: 'Lịch & Ghi Chú' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as ViewMode)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  currentView === tab.id
                    ? 'border-red-600 text-red-600 dark:border-amber-400 dark:text-amber-400 font-bold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition whitespace-nowrap shrink-0 font-mono-tabular"
            >
              Đã lưu: {stats.answered}/{stats.total}
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Workspace Subject & Utility Bar */}
      <div className="bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              Môn học tại chức:
            </span>
            <select
              value={activeSubject.id}
              onChange={(e) => {
                setActiveSubjectId(e.target.value);
                setStudyCurrentIndex(0);
                setStudyModule('all');
                setStudyPack('all');
                setStudyStatus('all');
                setExamStage('setup');
              }}
              aria-label="Chọn môn học tại chức"
              className="px-3 py-1.5 rounded-lg font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.questions.length} câu)
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsCourseModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition whitespace-nowrap shrink-0"
            >
              + Quản lý Môn / Nhập Đề Mới
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setKeywordHighlight((prev) => !prev);
                showToast(
                  !keywordHighlight
                    ? 'Đã BẬT tô sáng Từ khóa mẹo nhớ sau khi chọn đáp án!'
                    : 'Đã TẮT tô sáng Từ khóa mẹo nhớ.',
                  'info'
                );
              }}
              className="px-2.5 py-1.5 rounded-lg font-semibold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition whitespace-nowrap shrink-0"
            >
              Mẹo Từ Khóa: <strong>{keywordHighlight ? 'BẬT' : 'TẮT'}</strong>
            </button>

            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition whitespace-nowrap shrink-0"
            >
              Giao diện: {darkMode ? 'Tối' : 'Sáng'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        {/* ==================== VIEW 1: DASHBOARD ==================== */}
        {currentView === 'dashboard' && (
          <section className="space-y-6">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-900 via-red-800 to-amber-800 text-white p-5 sm:p-7 shadow-sm">
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-8 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <div className="text-xs font-medium text-amber-200">
                      Mã học phần: {activeSubject.code} · {activeSubject.credits} tín chỉ · Ngày thi dự kiến: {activeSubject.examDate}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight max-w-2xl">
                      {activeSubject.name}
                    </h1>
                    <p className="text-sm sm:text-base text-red-100 max-w-2xl leading-relaxed">
                      {activeSubject.description}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2.5">
                    <button
                      onClick={() => {
                        setExamCountSelect(30);
                        setExamSourceSelect('all');
                        setCurrentView('exam');
                        startGeneratedExam(30, 'all');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition whitespace-nowrap shrink-0"
                    >
                      Làm Đề Ngẫu Nhiên 30 Câu
                    </button>
                    <button
                      onClick={() => {
                        setExamCountSelect(50);
                        setExamSourceSelect('all');
                        setCurrentView('exam');
                        startGeneratedExam(50, 'all');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm border border-white/25 transition whitespace-nowrap shrink-0"
                    >
                      Làm Đề Chuẩn 50 Câu
                    </button>
                    <button
                      onClick={() => setCurrentView('study')}
                      className="px-4 py-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 text-white font-semibold text-xs sm:text-sm border border-white/15 transition whitespace-nowrap shrink-0"
                    >
                      Học Ngay ({activeSubject.questions.length} Câu)
                    </button>
                    <button
                      onClick={() => setCurrentView('flashcards')}
                      className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm border border-white/25 transition whitespace-nowrap shrink-0"
                    >
                      Lật Thẻ Flashcards
                    </button>
                    <button
                      onClick={() => setCurrentView('memory')}
                      className="px-4 py-2.5 rounded-xl bg-indigo-500/90 hover:bg-indigo-400 text-white font-bold text-xs sm:text-sm border border-white/25 transition whitespace-nowrap shrink-0"
                    >
                      Bảng Số Liệu & Phản Xạ Nhanh
                    </button>
                  </div>
                </div>

                {/* Progress Card inside Hero */}
                <div className="lg:col-span-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-200">
                      Tiến độ làm chủ môn học
                    </span>
                    <span className="text-lg font-extrabold text-amber-300 font-mono-tabular">
                      {stats.pct}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-black/25 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-300 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono-tabular">
                    <div className="bg-black/20 rounded-xl p-2">
                      <div className="text-base sm:text-lg font-extrabold">{stats.total}</div>
                      <div className="text-[11px] text-red-100 font-sans">Tổng số câu</div>
                    </div>
                    <div className="bg-black/20 rounded-xl p-2">
                      <div className="text-base sm:text-lg font-extrabold text-emerald-300">
                        {stats.mastered}
                      </div>
                      <div className="text-[11px] text-red-100 font-sans">Đã làm đúng</div>
                    </div>
                    <div className="bg-black/20 rounded-xl p-2">
                      <div className="text-base sm:text-lg font-extrabold text-rose-300">
                        {stats.wrong}
                      </div>
                      <div className="text-[11px] text-red-100 font-sans">Cần ôn lại</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-red-100/90 flex items-center justify-between pt-1">
                    <span>
                      Đã hoàn thành: <strong className="font-mono-tabular">{examsTaken}</strong> đề thi thử
                    </span>
                    <button
                      onClick={() => {
                        setAllProgress((prev) => ({ ...prev, [activeSubject.id]: {} }));
                        setExamsTakenBySubject((prev) => ({ ...prev, [activeSubject.id]: 0 }));
                        setLastQuestionBySubject((prev) => ({ ...prev, [activeSubject.id]: 1 }));
                        showToast('Đã đặt lại tiến độ của môn học hiện tại.', 'info');
                      }}
                      className="underline hover:text-white"
                    >
                      Đặt lại tiến độ
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Session & Answered Questions History Panel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-emerald-500/40 dark:border-emerald-600/40 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>Lưu tự động 100% sau mỗi câu</span>
                    <span>·</span>
                    <span>Học tiếp bất kỳ lúc nào</span>
                  </div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                    Tiếp Tục Phiên Học & Xem Lại Các Câu Đã Làm
                  </h2>
                  {stats.answered > 0 ? (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Bạn đã hoàn thành{' '}
                      <strong className="font-mono-tabular">
                        {stats.answered}/{stats.total} câu
                      </strong>{' '}
                      (Đúng{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono-tabular">
                        {stats.mastered} câu
                      </strong>{' '}
                      · Sai{' '}
                      <strong className="text-rose-600 font-mono-tabular">{stats.wrong} câu</strong>
                      ). Lần gần nhất bạn đang dừng ở{' '}
                      <strong className="font-mono-tabular">Câu #{lastQuestionId}</strong>.
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Bạn có thể tranh thủ làm 5 câu, 7 câu lúc rảnh rồi tắt máy. Lần sau mở lại, toàn bộ các câu đã làm, đáp án bạn đã chọn (Đúng/Sai) và vị trí câu đang làm dở đều được giữ nguyên.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (nextUnansweredQuestion) {
                        jumpToQuestionById(nextUnansweredQuestion.id);
                        showToast(
                          `Đang tiếp tục tại Câu #${nextUnansweredQuestion.id}!`,
                          'info'
                        );
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition whitespace-nowrap shrink-0"
                  >
                    {stats.answered > 0 && nextUnansweredQuestion
                      ? `Làm tiếp Câu #${nextUnansweredQuestion.id} (Chưa làm)`
                      : 'Bắt đầu làm từ Câu #1'}
                  </button>
                  <button
                    onClick={() => {
                      if (stats.answered === 0) {
                        setIsSaveModalOpen(true);
                        return;
                      }
                      setStudyModule('all');
                      setStudyPack('all');
                      setStudyStatus('answered');
                      setStudyCurrentIndex(0);
                      setCurrentView('study');
                      showToast(
                        `Đang hiển thị ${stats.answered} câu bạn đã làm kèm kết quả Đúng/Sai!`,
                        'success'
                      );
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition whitespace-nowrap shrink-0"
                  >
                    Xem các câu đã làm ({stats.answered})
                  </button>
                  <button
                    onClick={() => setIsSaveModalOpen(true)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition whitespace-nowrap shrink-0"
                  >
                    Mã đồng bộ ĐT ↔ PC
                  </button>
                </div>
              </div>

              {recentAnsweredIds.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Các câu bạn vừa làm gần đây (Bấm vào câu bất kỳ để xem lại đáp án):
                    </span>
                    <button
                      onClick={() => setIsSaveModalOpen(true)}
                      className="text-red-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      Xem bảng tổng hợp →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentAnsweredIds.slice(0, 16).map((qid) => {
                      const st = currentProgressMap[qid];
                      const qObj = activeSubject.questions.find((x) => x.id === qid);
                      if (!qObj || !st) return null;
                      const isOk = st.status === 'mastered';
                      const chosenLetter =
                        st.selectedOption !== undefined
                          ? letters[st.selectedOption]
                          : isOk
                          ? letters[qObj.answer]
                          : '?';
                      return (
                        <button
                          key={qid}
                          onClick={() => jumpToQuestionById(qid)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition font-mono-tabular ${
                            isOk
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white'
                              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 hover:bg-rose-600 hover:text-white'
                          }`}
                        >
                          Câu #{qid}: Chọn {chosenLetter} (
                          {isOk ? '✓ Đúng' : `✗ Sai → Đúng: ${letters[qObj.answer]}`})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Spaced Repetition 3-Bucket Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Giỏ Đỏ · Cần ôn ngay
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 font-mono-tabular">
                    {stats.wrong} câu đang sai
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Ưu tiên trả nợ đúng 2 lần liên tiếp
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('wrong')}
                  className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 transition shrink-0"
                >
                  Ôn ngay →
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Giỏ Vàng · Còn phân vân (50/50)
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 font-mono-tabular">
                    {stats.uncertain} câu phân vân
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Đúng nhưng chưa chắc chắn hoặc gắn sao
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStudyStatus('uncertain');
                    setStudyCurrentIndex(0);
                    setCurrentView('study');
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition shrink-0"
                >
                  Luyện lại →
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Giỏ Xanh · Đã thuộc chắc
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 font-mono-tabular">
                    {stats.sureGreen} câu nắm vững
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Nhắc lại ngắt quãng trước ngày thi
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStudyStatus('mastered');
                    setStudyCurrentIndex(0);
                    setCurrentView('study');
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition shrink-0"
                >
                  Xem lại →
                </button>
              </div>
            </div>

            {/* Modules & Packs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 cols: Modules */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Các Chuyên Đề Trong Môn Học ({activeSubject.questions.length} Câu)
                  </h2>
                  <button
                    onClick={() => setIsCourseModalOpen(true)}
                    className="text-xs font-bold text-red-600 dark:text-amber-400 hover:underline"
                  >
                    + Thêm câu hỏi / chuyên đề
                  </button>
                </div>
                <div className="space-y-2.5">
                  {Object.values(activeSubject.modules).map((modInfo) => {
                    const modQs = activeSubject.questions.filter((q) => q.module === modInfo.id);
                    const modMastered = modQs.filter(
                      (q) => currentProgressMap[q.id]?.status === 'mastered'
                    ).length;
                    const modWrong = modQs.filter(
                      (q) => currentProgressMap[q.id]?.status === 'wrong'
                    ).length;
                    const modPct =
                      modQs.length > 0 ? Math.round((modMastered / modQs.length) * 100) : 0;

                    return (
                      <div
                        key={modInfo.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-red-500/50 transition"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-tabular">
                            <span>{modInfo.range}</span>
                            <span>·</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {modMastered}/{modQs.length} thuộc
                            </span>
                            {modWrong > 0 && (
                              <>
                                <span>·</span>
                                <span className="font-semibold text-rose-600">
                                  {modWrong} câu sai
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {modInfo.name}
                          </h3>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${modInfo.color}`}
                              style={{ width: `${modPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setStudyModule(String(modInfo.id));
                              setStudyPack('all');
                              setStudyStatus('all');
                              setStudyCurrentIndex(0);
                              setCurrentView('study');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-600 hover:text-white text-xs font-bold transition whitespace-nowrap shrink-0"
                          >
                            Học phần này
                          </button>
                          <button
                            onClick={() => {
                              setExamCountSelect(30);
                              setExamSourceSelect(String(modInfo.id));
                              setCurrentView('exam');
                              startGeneratedExam(30, String(modInfo.id));
                            }}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800 text-xs font-semibold transition whitespace-nowrap shrink-0"
                          >
                            Thi 30 câu
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 cols: 10 Packs of 30 & 6 Packs of 50 */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Chia Bộ Đề Học Cuốn Chiếu (30 câu & 50 câu)
                  </h2>
                  <span className="text-xs text-slate-500">Học cuốn chiếu dễ nhớ</span>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Chia ngân hàng câu hỏi thành <strong>các bộ đề 30 câu</strong> và <strong>bộ đề 50 câu</strong> theo thứ tự vần A–B–C để học cuốn chiếu rất dễ thuộc:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from(
                      { length: Math.max(1, Math.ceil(activeSubject.questions.length / 30)) },
                      (_, i) => i + 1
                    ).map((p) => {
                      const startId = (p - 1) * 30 + 1;
                      const endId = Math.min(activeSubject.questions.length, p * 30);
                      const packQs = activeSubject.questions.filter((q) => q.pack30 === p);
                      const doneCount = packQs.filter(
                        (q) => currentProgressMap[q.id]?.status === 'mastered'
                      ).length;
                      return (
                        <button
                          key={`p30_${p}`}
                          onClick={() => {
                            setStudyModule('all');
                            setStudyPack(`p30_${p}`);
                            setStudyStatus('all');
                            setStudyCurrentIndex(0);
                            setCurrentView('study');
                          }}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-red-500 bg-slate-50/70 dark:bg-slate-800/50 text-left transition flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              Đề 30 câu #{p}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono-tabular">
                              Câu {startId}–{endId}
                            </div>
                          </div>
                          <span className="text-[11px] font-bold font-mono-tabular text-slate-600 dark:text-slate-300">
                            {doneCount}/{packQs.length}
                          </span>
                        </button>
                      );
                    })}

                    {activeSubject.questions.length >= 50 &&
                      Array.from(
                        { length: Math.ceil(activeSubject.questions.length / 50) },
                        (_, i) => i + 1
                      ).map((p50) => {
                        const startId = (p50 - 1) * 50 + 1;
                        const endId = Math.min(activeSubject.questions.length, p50 * 50);
                        const packQs = activeSubject.questions.filter((q) => q.pack === p50);
                        const doneCount = packQs.filter(
                          (q) => currentProgressMap[q.id]?.status === 'mastered'
                        ).length;
                        return (
                          <button
                            key={`p50_${p50}`}
                            onClick={() => {
                              setStudyModule('all');
                              setStudyPack(String(p50));
                              setStudyStatus('all');
                              setStudyCurrentIndex(0);
                              setCurrentView('study');
                            }}
                            className="p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 hover:border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-left transition flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-xs text-amber-900 dark:text-amber-300">
                                Bộ 50 câu #{p50}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono-tabular">
                                Câu {startId}–{endId}
                              </div>
                            </div>
                            <span className="text-[11px] font-bold font-mono-tabular text-amber-800 dark:text-amber-300">
                              {doneCount}/{packQs.length}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== VIEW 2: STUDY 300 QUESTIONS ==================== */}
        {currentView === 'study' && (
          <section className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Ngân Hàng Câu Hỏi · {activeSubject.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Từ khóa mẹo nhớ và phân tích điểm khác biệt sẽ hiển thị ngay sau khi bạn chọn đáp án.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setDiffFocusMode((prev) => !prev);
                      showToast(
                        !diffFocusMode
                          ? 'Đã BẬT chế độ làm mờ phần giống nhau, làm nổi phần khác biệt sau khi chọn!'
                          : 'Đã TẮT chế độ soi điểm khác biệt.',
                        'info'
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition whitespace-nowrap shrink-0"
                  >
                    Soi điểm khác biệt 4 đáp án: <strong>{diffFocusMode ? 'BẬT' : 'TẮT'}</strong>
                  </button>
                  <button
                    onClick={() => setRevealAllStudy((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition whitespace-nowrap shrink-0"
                  >
                    Hiện tất cả đáp án: <strong>{revealAllStudy ? 'BẬT' : 'TẮT'}</strong>
                  </button>
                  <button
                    onClick={() => {
                      if (!currentStudyQuestion) return;
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const utter = new SpeechSynthesisUtterance(
                          `${currentStudyQuestion.question}. Đáp án đúng là: ${
                            currentStudyQuestion.options[currentStudyQuestion.answer]
                          }. Giải thích: ${currentStudyQuestion.explanation}`
                        );
                        utter.lang = 'vi-VN';
                        window.speechSynthesis.speak(utter);
                        showToast('Đang đọc câu hỏi và đáp án đúng...', 'info');
                      } else {
                        showToast('Trình duyệt của bạn không hỗ trợ đọc giọng nói.', 'error');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition whitespace-nowrap shrink-0"
                  >
                    Đọc câu hiện tại
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                <input
                  type="text"
                  value={studySearch}
                  onChange={(e) => {
                    setStudySearch(e.target.value);
                    setStudyCurrentIndex(0);
                  }}
                  placeholder="Tìm theo nội dung, từ khóa, số câu..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                />

                <select
                  value={studyModule}
                  onChange={(e) => {
                    setStudyModule(e.target.value);
                    setStudyCurrentIndex(0);
                  }}
                  aria-label="Lọc theo chuyên đề hoặc chữ cái"
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="all">
                    Tất cả {activeSubject.questions.length} câu (Thứ tự A, B, C chuẩn)
                  </option>
                  <optgroup label="Lọc theo Chuyên đề">
                    {Object.values(activeSubject.modules).map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Lọc nhanh theo Vần chữ cái đầu câu">
                    <option value="let_B">Vần B</option>
                    <option value="let_C">Vần C</option>
                    <option value="let_D">Vần D & Đ</option>
                    <option value="let_G">Vần G</option>
                    <option value="let_H">Vần H</option>
                    <option value="let_K">Vần K</option>
                    <option value="let_L">Vần L & M</option>
                    <option value="let_N">Vần N</option>
                    <option value="let_Q">Vần Q</option>
                    <option value="let_T">Vần T</option>
                    <option value="let_V">Vần V</option>
                  </optgroup>
                </select>

                <select
                  value={studyPack}
                  onChange={(e) => {
                    setStudyPack(e.target.value);
                    setStudyCurrentIndex(0);
                  }}
                  aria-label="Lọc theo bộ đề"
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="all">Tất cả các Bộ đề</option>
                  <optgroup label="Theo Bộ đề (30 câu/bộ)">
                    {Array.from(
                      { length: Math.max(1, Math.ceil(activeSubject.questions.length / 30)) },
                      (_, i) => i + 1
                    ).map((p) => (
                      <option key={`p30_${p}`} value={`p30_${p}`}>
                        Đề {p} (30 câu): Câu {(p - 1) * 30 + 1} –{' '}
                        {Math.min(activeSubject.questions.length, p * 30)}
                      </option>
                    ))}
                  </optgroup>
                  {activeSubject.questions.length >= 50 && (
                    <optgroup label="Theo Bộ đề chuẩn (50 câu/bộ)">
                      {Array.from(
                        { length: Math.ceil(activeSubject.questions.length / 50) },
                        (_, i) => i + 1
                      ).map((p50) => (
                        <option key={`p50_${p50}`} value={String(p50)}>
                          Bộ {p50} (50 câu): Câu {(p50 - 1) * 50 + 1} –{' '}
                          {Math.min(activeSubject.questions.length, p50 * 50)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <select
                  value={studyStatus}
                  onChange={(e) => {
                    setStudyStatus(e.target.value);
                    setStudyCurrentIndex(0);
                  }}
                  aria-label="Lọc theo trạng thái học"
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="all">Mọi trạng thái ({activeSubject.questions.length} câu)</option>
                  <option value="answered">Đã làm (Hiện cả câu Đúng & Sai)</option>
                  <option value="unanswered">Chưa làm (Chỉ hiện câu mới)</option>
                  <option value="wrong">Giỏ Đỏ: Đang làm sai</option>
                  <option value="uncertain">Giỏ Vàng: Còn phân vân / Đánh dấu sao</option>
                  <option value="mastered">Giỏ Xanh: Đã thuộc chắc</option>
                  <option value="starred">Đã đánh dấu sao</option>
                </select>
              </div>

              {/* Quick Filter Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Chế độ xem nhanh:</span>
                  <button
                    onClick={() => {
                      setStudyStatus('all');
                      setStudyCurrentIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      studyStatus === 'all'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    Tất cả ({stats.total})
                  </button>
                  <button
                    onClick={() => {
                      setStudyStatus('answered');
                      setStudyCurrentIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      studyStatus === 'answered'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    ✓ Đã làm ({stats.answered})
                  </button>
                  <button
                    onClick={() => {
                      setStudyStatus('unanswered');
                      setStudyCurrentIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      studyStatus === 'unanswered'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    Chưa làm ({Math.max(0, stats.total - stats.answered)})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (filteredStudyList.length === 0) return;
                      const nextInList = filteredStudyList.findIndex(
                        (q, i) => i > safeStudyIndex && !currentProgressMap[q.id]?.status
                      );
                      if (nextInList >= 0) {
                        setStudyCurrentIndex(nextInList);
                      } else {
                        const firstUnans = filteredStudyList.findIndex(
                          (q) => !currentProgressMap[q.id]?.status
                        );
                        if (firstUnans >= 0) setStudyCurrentIndex(firstUnans);
                        else
                          showToast(
                            'Bạn đã hoàn thành tất cả các câu trong danh sách lọc hiện tại!',
                            'success'
                          );
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition whitespace-nowrap shrink-0"
                  >
                    Nhảy tới câu chưa làm tiếp theo →
                  </button>
                  {currentStudyQuestion && currentProgressMap[currentStudyQuestion.id]?.status && (
                    <button
                      onClick={() => {
                        setAllProgress((prevAll) => {
                          const subMap = { ...(prevAll[activeSubject.id] || {}) };
                          delete subMap[currentStudyQuestion.id];
                          return { ...prevAll, [activeSubject.id]: subMap };
                        });
                        showToast(
                          `Đã xóa lựa chọn cũ của Câu #${currentStudyQuestion.id} để bạn làm lại.`,
                          'info'
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 transition whitespace-nowrap shrink-0"
                    >
                      Xóa chọn & Làm lại
                    </button>
                  )}
                </div>
              </div>
            </div>

            {!currentStudyQuestion ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <div className="font-bold text-base">
                  Không tìm thấy câu hỏi nào khớp với bộ lọc hiện tại.
                </div>
                <button
                  onClick={() => {
                    setStudySearch('');
                    setStudyModule('all');
                    setStudyPack('all');
                    setStudyStatus('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Main Active Study Card (8 cols) */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                  {(() => {
                    const prog = currentProgressMap[currentStudyQuestion.id] || {};
                    const hasAnswered = prog.selectedOption !== undefined || revealAllStudy;
                    const commonPrefixWords = computeCommonWordPrefixLen(
                      currentStudyQuestion.options
                    );
                    const chosenLetterStr =
                      prog.selectedOption !== undefined
                        ? ` (Đã chọn ${letters[prog.selectedOption]})`
                        : '';

                    return (
                      <>
                        {/* Top Meta Row */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-xs">
                          <div className="flex items-center gap-2 flex-wrap font-mono-tabular">
                            <span className="font-extrabold text-red-600 dark:text-amber-400">
                              Câu #{currentStudyQuestion.id} ({safeStudyIndex + 1}/
                              {filteredStudyList.length})
                            </span>
                            <span>·</span>
                            <span className="font-sans text-slate-600 dark:text-slate-300">
                              {activeSubject.modules[currentStudyQuestion.module]?.name ||
                                `Chuyên đề ${currentStudyQuestion.module}`}
                            </span>
                            <span>·</span>
                            <span
                              className={`font-sans font-bold ${
                                prog.status === 'mastered'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : prog.status === 'wrong'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {prog.status === 'mastered'
                                ? `✓ Trả lời ĐÚNG${chosenLetterStr}`
                                : prog.status === 'wrong'
                                ? `✗ Trả lời SAI${chosenLetterStr} · Đúng: ${
                                    letters[currentStudyQuestion.answer]
                                  }`
                                : 'Chưa làm'}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              updateQuestionProgress(
                                activeSubject.id,
                                currentStudyQuestion.id,
                                (p) => ({
                                  ...p,
                                  starred: !p.starred,
                                })
                              )
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0"
                          >
                            {prog.starred ? '★ Đã đánh dấu' : '☆ Đánh dấu'}
                          </button>
                        </div>

                        {/* Question Stem */}
                        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                          {currentStudyQuestion.question}
                        </div>

                        {/* Options */}
                        <div className="space-y-2.5 pt-1">
                          {currentStudyQuestion.options.map((optText, idx) => {
                            let borderCls =
                              'border-slate-200 dark:border-slate-800 hover:border-red-500 bg-slate-50/60 dark:bg-slate-800/50';
                            let badgeCls =
                              'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';

                            if (hasAnswered) {
                              if (idx === currentStudyQuestion.answer) {
                                borderCls =
                                  'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500';
                                badgeCls = 'bg-emerald-600 text-white';
                              } else if (
                                prog.selectedOption === idx &&
                                idx !== currentStudyQuestion.answer
                              ) {
                                borderCls =
                                  'border-rose-500 bg-rose-50/90 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100';
                                badgeCls = 'bg-rose-600 text-white';
                              }
                            }

                            const renderedOpt = formatOptionWithDiffAndKeyword(
                              optText,
                              idx,
                              currentStudyQuestion,
                              hasAnswered,
                              commonPrefixWords,
                              prog.selectedOption,
                              keywordHighlight,
                              diffFocusMode
                            );

                            return (
                              <button
                                key={idx}
                                onClick={() => handleStudySelectOption(currentStudyQuestion, idx)}
                                className={`w-full p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${borderCls}`}
                              >
                                <span
                                  className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${badgeCls}`}
                                >
                                  {letters[idx]}
                                </span>
                                <span
                                  className="text-xs sm:text-sm font-medium leading-relaxed flex-1"
                                  dangerouslySetInnerHTML={{ __html: renderedOpt }}
                                />
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation, Trap Alert, Confidence & Twins */}
                        {hasAnswered && (
                          <div className="rounded-xl p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                Phân tích Từ khóa & Giải thích sau khi chọn
                              </span>
                              <span
                                className={`text-xs font-bold ${
                                  prog.selectedOption === undefined ||
                                  prog.selectedOption === currentStudyQuestion.answer
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {prog.selectedOption !== undefined
                                  ? prog.selectedOption === currentStudyQuestion.answer
                                    ? prog.confidence === 'uncertain'
                                      ? '✓ Đúng (Đang xếp ở Giỏ Vàng - Còn phân vân)'
                                      : '✓ Chính xác! (Giỏ Xanh)'
                                    : `✗ Sai rồi! Đáp án đúng là ${
                                        letters[currentStudyQuestion.answer]
                                      }`
                                  : `Đáp án đúng: ${letters[currentStudyQuestion.answer]}`}
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                              Cụm từ khóa quyết định của đáp án{' '}
                              {letters[currentStudyQuestion.answer]}: &ldquo;
                              {currentStudyQuestion.keyword}&rdquo;
                            </p>

                            {prog.selectedOption !== undefined &&
                              prog.selectedOption !== currentStudyQuestion.answer && (
                                <div className="p-2.5 rounded-lg bg-rose-100/80 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200">
                                  {(() => {
                                    const chosenWrongText =
                                      currentStudyQuestion.options[prog.selectedOption] || '';
                                    const trapInfo = detectTrapInOption(chosenWrongText);
                                    if (trapInfo) {
                                      return (
                                        <span>
                                          <strong>
                                            Phát hiện &ldquo;Từ khóa bẫy&rdquo; trong câu bạn vừa chọn:
                                          </strong>{' '}
                                          Cụm từ{' '}
                                          <span className="kw-trap">
                                            &ldquo;{trapInfo.matchedWord}&rdquo;
                                          </span>{' '}
                                          — {trapInfo.reason}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span>
                                        <strong>Phân tích lỗi sai:</strong> Phương án{' '}
                                        {letters[prog.selectedOption]} bạn chọn bị lệch ở vế đuôi so với chuẩn văn kiện. Hãy chú ý cụm từ khóa vàng{' '}
                                        <strong>&ldquo;{currentStudyQuestion.keyword}&rdquo;</strong>{' '}
                                        ở đáp án {letters[currentStudyQuestion.answer]}.
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}

                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              {currentStudyQuestion.explanation}
                            </p>

                            {/* Spaced Repetition Confidence Self-Rating */}
                            <div className="pt-2 border-t border-amber-200/70 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                Đánh giá mức độ nhớ câu này (Lặp lại ngắt quãng):
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    updateQuestionProgress(
                                      activeSubject.id,
                                      currentStudyQuestion.id,
                                      (p) => ({
                                        ...p,
                                        confidence: 'uncertain',
                                        starred: true,
                                      })
                                    );
                                    showToast(
                                      `Đã đưa câu #${currentStudyQuestion.id} vào Giỏ Vàng (Còn phân vân)!`,
                                      'info'
                                    );
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-400 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition"
                                >
                                  Đúng nhưng còn phân vân (Giỏ Vàng)
                                </button>
                                <button
                                  onClick={() => {
                                    updateQuestionProgress(
                                      activeSubject.id,
                                      currentStudyQuestion.id,
                                      (p) => ({
                                        ...p,
                                        status: 'mastered',
                                        confidence: 'sure',
                                      })
                                    );
                                    showToast(
                                      `✓ Đã xác nhận thuộc chắc câu #${currentStudyQuestion.id} (Giỏ Xanh)!`,
                                      'success'
                                    );
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                >
                                  ✓ Đã nhớ chắc chắn (Giỏ Xanh)
                                </button>
                              </div>
                            </div>

                            {/* Twin Questions Comparison */}
                            {currentStudyQuestion.twins &&
                              currentStudyQuestion.twins.length > 0 && (
                                <div className="pt-2 border-t border-amber-200/70 dark:border-amber-800/60 space-y-2">
                                  <div className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                                    So sánh cặp câu &ldquo;song sinh&rdquo; dễ nhầm lẫn trong bộ đề:
                                  </div>
                                  <div className="space-y-2">
                                    {currentStudyQuestion.twins.map((tId) => {
                                      const tQ = activeSubject.questions.find(
                                        (x) => x.id === tId
                                      );
                                      if (!tQ) return null;
                                      return (
                                        <div
                                          key={tId}
                                          className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-900/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                        >
                                          <div className="space-y-0.5">
                                            <div className="font-bold text-indigo-700 dark:text-indigo-300">
                                              Câu #{tQ.id}: {tQ.question}
                                            </div>
                                            <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                              → Đáp án đúng ({letters[tQ.answer]}): Từ khóa &ldquo;
                                              {tQ.keyword}&rdquo;
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => jumpToQuestionById(tQ.id)}
                                            className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold shrink-0 hover:bg-indigo-100"
                                          >
                                            Xem câu #{tQ.id}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}

                        {/* Inline Personal Note Box */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                              Ghi chú / Mẹo nhớ cá nhân của bạn cho Câu #{currentStudyQuestion.id}:
                            </label>
                            <button
                              onClick={() =>
                                handleSaveNote(currentStudyQuestion.id, noteDraft)
                              }
                              className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
                            >
                              Lưu ghi chú
                            </button>
                          </div>
                          <input
                            type="text"
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveNote(currentStudyQuestion.id, noteDraft);
                              }
                            }}
                            placeholder="Nhập mẹo nhớ riêng (VD: HNTW3 = 20-24/7/2026, NQ 17) rồi bấm Enter hoặc Lưu..."
                            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                        </div>

                        {/* Bottom Prev/Next Navigation */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() =>
                              setStudyCurrentIndex(
                                (i) =>
                                  (i - 1 + filteredStudyList.length) % filteredStudyList.length
                              )
                            }
                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition"
                          >
                            ← Câu trước
                          </button>
                          <span className="hidden sm:inline text-[11px] text-slate-400">
                            Phím tắt: Bấm phím 1-4 (A-D) để chọn, ← → để chuyển câu
                          </span>
                          <button
                            onClick={() =>
                              setStudyCurrentIndex((i) => (i + 1) % filteredStudyList.length)
                            }
                            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm transition"
                          >
                            Câu tiếp theo →
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Question Palette / Quick Jump (4 cols) */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                  {(() => {
                    const PAGE_SIZE = 100;
                    const totalPages = Math.max(
                      1,
                      Math.ceil(filteredStudyList.length / PAGE_SIZE)
                    );
                    const activePage = Math.floor(safeStudyIndex / PAGE_SIZE);
                    const startIdx = activePage * PAGE_SIZE;
                    const endIdx = Math.min(filteredStudyList.length, startIdx + PAGE_SIZE);

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            Bảng chuyển nhanh ({filteredStudyList.length} câu)
                          </h3>
                          <div className="flex items-center gap-1 font-mono-tabular">
                            <button
                              onClick={() =>
                                setStudyCurrentIndex(Math.max(0, safeStudyIndex - PAGE_SIZE))
                              }
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              ‹
                            </button>
                            <span className="text-xs font-semibold px-1">
                              {activePage + 1}/{totalPages}
                            </span>
                            <button
                              onClick={() =>
                                setStudyCurrentIndex(
                                  Math.min(
                                    filteredStudyList.length - 1,
                                    safeStudyIndex + PAGE_SIZE
                                  )
                                )
                              }
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              ›
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                          <span>✓ Đúng (Xanh)</span>
                          <span>·</span>
                          <span>✗ Sai (Đỏ)</span>
                          <span>·</span>
                          <span>Chưa làm (Xám)</span>
                        </div>

                        <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-1.5 max-h-80 overflow-y-auto pr-1 font-mono-tabular">
                          {filteredStudyList.slice(startIdx, endIdx).map((item, offset) => {
                            const idx = startIdx + offset;
                            const st = currentProgressMap[item.id]?.status;
                            const isCurrent = idx === safeStudyIndex;
                            let cls =
                              'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
                            if (st === 'mastered') cls = 'bg-emerald-600 text-white font-bold';
                            else if (st === 'wrong') cls = 'bg-rose-600 text-white font-bold';
                            if (isCurrent)
                              cls += ' ring-2 ring-offset-1 ring-red-600 dark:ring-amber-400';

                            const mark = st === 'mastered' ? '✓' : st === 'wrong' ? '✗' : '';
                            return (
                              <button
                                key={item.id}
                                onClick={() => setStudyCurrentIndex(idx)}
                                className={`h-8 rounded-lg text-[11px] font-medium transition flex items-center justify-center ${cls}`}
                              >
                                {mark ? `${item.id}${mark}` : item.id}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ==================== VIEW 3: FLASHCARDS ==================== */}
        {currentView === 'flashcards' && (
          <FlashcardsView
            subject={activeSubject}
            progressMap={currentProgressMap}
            keywordHighlight={keywordHighlight}
            onRateCard={handleRateFlashcard}
            onSaveNote={(qid, note) => handleSaveNote(qid, note)}
            onJumpToStudyQuestion={(qid) => jumpToQuestionById(qid)}
          />
        )}

        {/* ==================== VIEW 4: RANDOM EXAM (30 - 50 CAU) ==================== */}
        {currentView === 'exam' && (
          <section className="space-y-5">
            {examStage === 'setup' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    Tạo Bộ Đề Thi Thử Ngẫu Nhiên · {activeSubject.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống rút ngẫu nhiên không trùng lặp từ ngân hàng câu hỏi và tự động đảo vị trí đáp án A/B/C/D để rèn phản xạ thật.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500">
                      Số câu trong đề
                    </label>
                    <select
                      value={examCountSelect}
                      onChange={(e) => setExamCountSelect(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <option value={30}>Đề tiêu chuẩn: 30 câu (30 phút)</option>
                      <option value={40}>Đề nâng cao: 40 câu (40 phút)</option>
                      <option value={50}>Đề tổng hợp: 50 câu (45 phút)</option>
                      <option value={15}>Đề kiểm tra nhanh: 15 câu (15 phút)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500">
                      Phạm vi rút câu hỏi
                    </label>
                    <select
                      value={examSourceSelect}
                      onChange={(e) => setExamSourceSelect(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="all">
                        Toàn bộ {activeSubject.questions.length} câu
                      </option>
                      {Object.values(activeSubject.modules).map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.name}
                        </option>
                      ))}
                      <option value="wrong">Chỉ lấy từ Sổ tay câu làm sai</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500">
                      Chống học vẹt vị trí
                    </label>
                    <select
                      value={examShuffleOpt}
                      onChange={(e) => setExamShuffleOpt(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="yes">Đảo cả câu hỏi & vị trí A, B, C, D</option>
                      <option value="no">Chỉ đảo thứ tự câu hỏi</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500">
                      Hiển thị đáp án
                    </label>
                    <select
                      value={examFeedbackMode}
                      onChange={(e) =>
                        setExamFeedbackMode(e.target.value as 'end' | 'instant')
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="end">Khi nộp bài (Giống thi thật)</option>
                      <option value="instant">Báo Đúng/Sai ngay sau mỗi câu</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => startGeneratedExam()}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition"
                  >
                    Bắt Đầu Làm Đề Ngay
                  </button>
                  <span className="text-xs text-slate-500">
                    Các câu làm sai trong bài thi sẽ tự động được đưa vào mục{' '}
                    <strong>Câu Sai</strong> để bạn ôn lại.
                  </span>
                </div>
              </div>
            )}

            {examStage === 'running' && examQuestions.length > 0 && (
              <div className="space-y-4">
                {(() => {
                  const item = examQuestions[examCurrentIdx];
                  const total = examQuestions.length;
                  const answeredCount = examQuestions.filter(
                    (x) => x.selectedShuffledIdx !== null
                  ).length;
                  const m = String(Math.floor(Math.max(0, examRemainingSec) / 60)).padStart(
                    2,
                    '0'
                  );
                  const s = String(Math.max(0, examRemainingSec) % 60).padStart(2, '0');

                  return (
                    <>
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-extrabold text-sm font-mono-tabular">
                            {m}:{s}
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {examTitle}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono-tabular">
                              Đã chọn: <strong>{answeredCount}/{total}</strong> câu
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={finishExamNow}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition"
                          >
                            ✓ Nộp Bài & Chấm Điểm
                          </button>
                          <button
                            onClick={() => {
                              if (examTimerRef.current)
                                window.clearInterval(examTimerRef.current);
                              setExamStage('setup');
                            }}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            Thoát
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2 font-mono-tabular text-xs">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold">
                                Câu {examCurrentIdx + 1} / {total}
                              </span>
                              <span className="text-slate-400">
                                (Mã câu: #{item.qObj.id})
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                setExamQuestions((prev) =>
                                  prev.map((q, idx) =>
                                    idx === examCurrentIdx
                                      ? { ...q, flagged: !q.flagged }
                                      : q
                                  )
                                )
                              }
                              className="px-3 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 transition"
                            >
                              {item.flagged ? '★ Đã đặt cờ phân vân' : '☆ Đặt cờ phân vân'}
                            </button>
                          </div>

                          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                            {item.qObj.question}
                          </div>

                          <div className="space-y-2.5 pt-1">
                            {item.shuffledOptions.map((optItem, sIdx) => {
                              const isSelected = item.selectedShuffledIdx === sIdx;
                              const isCorrectOpt = optItem.origIdx === item.qObj.answer;
                              const showExamKey =
                                examFeedbackMode === 'instant' &&
                                item.selectedShuffledIdx !== null;

                              let cls =
                                'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:border-red-500';
                              let badgeCls =
                                'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';

                              if (showExamKey) {
                                if (isCorrectOpt) {
                                  cls =
                                    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-1 ring-emerald-500';
                                  badgeCls = 'bg-emerald-600 text-white';
                                } else if (isSelected) {
                                  cls =
                                    'border-rose-500 bg-rose-50 dark:bg-rose-950/50';
                                  badgeCls = 'bg-rose-600 text-white';
                                }
                              } else if (isSelected) {
                                cls =
                                  'border-red-600 bg-red-50/80 dark:bg-red-950/40 ring-1 ring-red-600';
                                badgeCls = 'bg-red-600 text-white';
                              }

                              const renderedExamOpt =
                                showExamKey && isCorrectOpt
                                  ? highlightTextWithKeyword(
                                      optItem.text,
                                      item.qObj.keyword,
                                      keywordHighlight
                                    )
                                  : optItem.text;

                              return (
                                <button
                                  key={sIdx}
                                  onClick={() =>
                                    setExamQuestions((prev) =>
                                      prev.map((q, idx) =>
                                        idx === examCurrentIdx
                                          ? { ...q, selectedShuffledIdx: sIdx }
                                          : q
                                      )
                                    )
                                  }
                                  className={`w-full p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${cls}`}
                                >
                                  <span
                                    className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${badgeCls}`}
                                  >
                                    {letters[sIdx]}
                                  </span>
                                  {showExamKey && isCorrectOpt ? (
                                    <span
                                      className="text-xs sm:text-sm font-medium leading-relaxed flex-1"
                                      dangerouslySetInnerHTML={{
                                        __html: renderedExamOpt,
                                      }}
                                    />
                                  ) : (
                                    <span className="text-xs sm:text-sm font-medium leading-relaxed flex-1">
                                      {renderedExamOpt}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {examFeedbackMode === 'instant' &&
                            item.selectedShuffledIdx !== null && (
                              <div className="rounded-xl p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm space-y-1">
                                <div className="font-bold text-amber-800 dark:text-amber-300">
                                  Từ khóa mẹo: &ldquo;{item.qObj.keyword}&rdquo;
                                </div>
                                <div className="text-slate-700 dark:text-slate-300">
                                  {item.qObj.explanation}
                                </div>
                              </div>
                            )}

                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                            <button
                              onClick={() =>
                                setExamCurrentIdx((i) => (i - 1 + total) % total)
                              }
                              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition"
                            >
                              ← Câu trước
                            </button>
                            <button
                              onClick={() => setExamCurrentIdx((i) => (i + 1) % total)}
                              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm transition"
                            >
                              Câu tiếp →
                            </button>
                          </div>
                        </div>

                        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                          <h3 className="font-bold text-xs sm:text-sm">
                            Danh sách câu trong đề
                          </h3>
                          <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-5 gap-1.5 font-mono-tabular">
                            {examQuestions.map((qItem, idx) => {
                              let c =
                                'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
                              if (qItem.selectedShuffledIdx !== null)
                                c = 'bg-red-600 text-white font-bold';
                              if (qItem.flagged)
                                c = 'bg-amber-400 text-slate-950 font-bold';
                              if (idx === examCurrentIdx)
                                c += ' ring-2 ring-offset-1 ring-slate-900 dark:ring-white';

                              return (
                                <button
                                  key={idx}
                                  onClick={() => setExamCurrentIdx(idx)}
                                  className={`h-8 rounded-lg text-xs transition ${c}`}
                                >
                                  {idx + 1}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {examStage === 'result' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-5">
                {(() => {
                  const total = examQuestions.length || 1;
                  const correctCount = examQuestions.filter((item) => {
                    const chosen =
                      item.selectedShuffledIdx !== null
                        ? item.shuffledOptions[item.selectedShuffledIdx]
                        : null;
                    return chosen && chosen.origIdx === item.qObj.answer;
                  }).length;
                  const wrongAdded = total - correctCount;
                  const score10 = ((correctCount / total) * 10).toFixed(1);
                  const passed = Number(score10) >= 5.0;

                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                          <div
                            className={`text-xs font-bold mb-1 ${
                              passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
                            }`}
                          >
                            {passed
                              ? '✓ ĐẠT YÊU CẦU (≥ 5.0 ĐIỂM)'
                              : '✗ CẦN ÔN TẬP THÊM (< 5.0 ĐIỂM)'}
                          </div>
                          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono-tabular">
                            Kết quả: <span className="text-red-600">{score10}</span>/10 điểm (
                            {correctCount}/{total} câu đúng)
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            {wrongAdded > 0
                              ? `Hệ thống đã tự động lưu ${wrongAdded} câu chưa đúng vào mục "Câu Sai" để bạn luyện lại.`
                              : 'Xuất sắc! Bạn không làm sai câu nào trong đề thi này.'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setCurrentView('wrong')}
                            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm transition"
                          >
                            Ôn Ngay Các Câu Vừa Sai
                          </button>
                          <button
                            onClick={() => setExamStage('setup')}
                            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm transition"
                          >
                            Tạo Đề Ngẫu Nhiên Mới
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                        {examQuestions.map((item, idx) => {
                          const chosenOpt =
                            item.selectedShuffledIdx !== null
                              ? item.shuffledOptions[item.selectedShuffledIdx]
                              : null;
                          const isCorrect =
                            chosenOpt && chosenOpt.origIdx === item.qObj.answer;
                          const correctShuffledIdx = item.shuffledOptions.findIndex(
                            (o) => o.origIdx === item.qObj.answer
                          );

                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border ${
                                isCorrect
                                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                                  : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                              } space-y-1.5`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-xs font-bold ${
                                    isCorrect
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {isCorrect
                                    ? `✓ Câu ${idx + 1} (Đúng)`
                                    : `✗ Câu ${idx + 1} (Sai - Đã lưu vào Sổ tay câu sai)`}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono-tabular">
                                  Mã #{item.qObj.id}
                                </span>
                              </div>
                              <div className="font-bold text-xs sm:text-sm">
                                {item.qObj.question}
                              </div>
                              <div className="text-xs">
                                Bạn chọn:{' '}
                                <strong>
                                  {chosenOpt && item.selectedShuffledIdx !== null
                                    ? `${letters[item.selectedShuffledIdx]}. ${chosenOpt.text}`
                                    : 'Chưa chọn'}
                                </strong>
                              </div>
                              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                                Đáp án đúng: {letters[correctShuffledIdx]}.{' '}
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: highlightTextWithKeyword(
                                      item.shuffledOptions[correctShuffledIdx]?.text || '',
                                      item.qObj.keyword,
                                      keywordHighlight
                                    ),
                                  }}
                                />
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                                <strong>Mẹo nhớ:</strong> &ldquo;{item.qObj.keyword}&rdquo; —{' '}
                                {item.qObj.explanation}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </section>
        )}

        {/* ==================== VIEW 5: WRONG ANSWERS REVIEW ==================== */}
        {currentView === 'wrong' && (
          <section className="space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  Sổ Tay Câu Đã Làm Sai & Chế Độ &ldquo;Trả Nợ Câu Sai&rdquo;
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Mỗi câu bạn trả lời sai đều được lưu tại đây. Khi luyện lại, bạn cần{' '}
                  <strong>trả lời đúng 2 lần liên tiếp (Tiến độ 2/2)</strong> để hệ thống tự động gỡ khỏi danh sách sai.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setExamSourceSelect('wrong');
                    setCurrentView('exam');
                    startGeneratedExam(30, 'wrong');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm transition"
                >
                  Làm Bài Kiểm Tra Câu Sai
                </button>
                <button
                  onClick={loadSampleWrongQuestions}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                >
                  + Nạp câu hay sai mẫu
                </button>
                <button
                  onClick={() => {
                    setAllProgress((prevAll) => {
                      const subMap = { ...(prevAll[activeSubject.id] || {}) };
                      Object.keys(subMap).forEach((k) => {
                        const num = Number(k);
                        if (subMap[num]?.status === 'wrong') {
                          subMap[num] = { ...subMap[num], status: 'mastered' };
                        }
                      });
                      return { ...prevAll, [activeSubject.id]: subMap };
                    });
                    showToast('Đã xóa danh sách câu làm sai.', 'info');
                  }}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 text-xs font-semibold transition"
                >
                  Xóa hết
                </button>
              </div>
            </div>

            {(() => {
              const wrongQuestions = activeSubject.questions.filter(
                (q) => currentProgressMap[q.id]?.status === 'wrong'
              );
              if (wrongQuestions.length === 0) {
                return (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                    <h3 className="text-base sm:text-lg font-bold">
                      Hiện tại bạn không có câu nào làm sai trong môn {activeSubject.shortName}!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                      Hãy vào mục <strong>Học Chi Tiết</strong> hoặc <strong>Thi Thử</strong>. Nếu muốn thử ngay tính năng &ldquo;Trả nợ câu sai&rdquo;, hãy bấm nút bên dưới.
                    </p>
                    <button
                      onClick={loadSampleWrongQuestions}
                      className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-bold"
                    >
                      + Nạp câu trắc nghiệm dễ nhầm lẫn để thử nghiệm
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {wrongQuestions.map((qObj) => {
                    const prog = currentProgressMap[qObj.id] || {
                      wrongCount: 1,
                      recoveryStreak: 0,
                    };
                    const streak = prog.recoveryStreak || 0;
                    const chosenAttempt = wrongAttemptSelected[qObj.id];
                    const fb = wrongFeedbackMsg[qObj.id];

                    return (
                      <div
                        key={qObj.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 font-mono-tabular">
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              Câu #{qObj.id}
                            </span>
                            <span>·</span>
                            <span className="font-sans text-slate-500">
                              {activeSubject.modules[qObj.module]?.name}
                            </span>
                            <span>·</span>
                            <span className="font-semibold text-rose-600">
                              Đã sai {prog.wrongCount || 1} lần
                            </span>
                          </div>
                          <div className="flex items-center gap-3 font-mono-tabular">
                            <span
                              className={`font-bold ${
                                streak === 1 ? 'text-amber-600' : 'text-slate-500'
                              }`}
                            >
                              Tiến độ trả nợ: {streak}/2 lần đúng
                            </span>
                            <button
                              onClick={() => {
                                updateQuestionProgress(activeSubject.id, qObj.id, (p) => ({
                                  ...p,
                                  status: 'mastered',
                                }));
                                showToast(`Đã đánh dấu thuộc câu #${qObj.id}.`, 'info');
                              }}
                              className="font-sans text-slate-400 hover:text-emerald-600 font-semibold"
                            >
                              ✓ Đã thuộc (Bỏ qua)
                            </button>
                          </div>
                        </div>

                        <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {qObj.question}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {qObj.options.map((optText, idx) => {
                            const hasAttempted = chosenAttempt !== undefined;
                            let cls =
                              'border-slate-200 dark:border-slate-800 hover:border-red-500 bg-slate-50/70 dark:bg-slate-800/50';
                            if (hasAttempted) {
                              if (idx === qObj.answer) {
                                cls =
                                  'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 ring-1 ring-emerald-500';
                              } else if (chosenAttempt === idx) {
                                cls = 'border-rose-500 bg-rose-50/90 dark:bg-rose-950/50';
                              }
                            }
                            return (
                              <button
                                key={idx}
                                onClick={() => handleWrongDrillSelect(qObj, idx)}
                                className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-start gap-2 ${cls}`}
                              >
                                <span className="font-bold text-red-600">{letters[idx]}.</span>
                                {hasAttempted && idx === qObj.answer ? (
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: highlightTextWithKeyword(
                                        optText,
                                        qObj.keyword,
                                        keywordHighlight
                                      ),
                                    }}
                                  />
                                ) : (
                                  <span>{optText}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {fb && (
                          <div className="rounded-xl p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                            <div
                              className={`font-bold ${
                                fb.isCorrect
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-rose-600'
                              }`}
                            >
                              {fb.text}
                            </div>
                            <div className="text-slate-600 dark:text-slate-300">
                              {qObj.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>
        )}

        {/* ==================== VIEW 6: SIÊU TRÍ NHỚ (MEMORY HUB) ==================== */}
        {currentView === 'memory' && (
          <MemoryHubView
            subject={activeSubject}
            keywordHighlight={keywordHighlight}
            diffFocusMode={diffFocusMode}
            onJumpToQuestion={(qid) => jumpToQuestionById(qid)}
          />
        )}

        {/* ==================== VIEW 7: STUDY PLANNER & PERSONAL NOTES ==================== */}
        {currentView === 'planner' && (
          <PlannerAndNotesView
            subjects={subjects}
            activeSubjectId={activeSubject.id}
            allProgress={allProgress}
            scheduleItems={scheduleItems}
            onSelectSubject={(subId) => {
              setActiveSubjectId(subId);
              setStudyCurrentIndex(0);
              showToast('Đã chuyển môn học!', 'info');
            }}
            onAddScheduleItem={(item) => {
              setScheduleItems((prev) => [item, ...prev]);
              showToast('Đã thêm mốc lịch học tại chức mới!', 'success');
            }}
            onToggleScheduleItem={(id) =>
              setScheduleItems((prev) =>
                prev.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it))
              )
            }
            onDeleteScheduleItem={(id) =>
              setScheduleItems((prev) => prev.filter((it) => it.id !== id))
            }
            onOpenCourseManager={() => setIsCourseModalOpen(true)}
            onJumpToQuestionInSubject={(subId, qid) => jumpToQuestionById(qid, subId)}
            onUpdateNote={(subId, qid, note) => handleSaveNote(qid, note, subId)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 grid grid-cols-6 gap-1">
        {[
          { id: 'dashboard', label: 'Tổng quan' },
          { id: 'study', label: 'Học' },
          { id: 'flashcards', label: 'Thẻ Nhớ' },
          { id: 'exam', label: 'Thi Thử' },
          { id: 'wrong', label: `Sai (${stats.wrong})` },
          { id: 'planner', label: 'Lịch & Note' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id as ViewMode)}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap shrink-0 ${
              currentView === item.id
                ? 'bg-red-600 text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Course Importer & Multi-Subject Manager Modal */}
      <CourseImporterModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        subjects={subjects}
        activeSubjectId={activeSubject.id}
        onSelectSubject={(id) => {
          setActiveSubjectId(id);
          setStudyCurrentIndex(0);
          showToast('Đã chuyển sang môn học mới!', 'success');
        }}
        onCreateSubject={(newSub) => {
          setSubjects((prev) => [...prev, newSub]);
          setActiveSubjectId(newSub.id);
          showToast(`Đã tạo môn học "${newSub.name}"! Hãy thêm câu hỏi vào môn học.`, 'success');
        }}
        onAddQuestionsToSubject={(subjectId, newQuestions, moduleName) => {
          setSubjects((prev) =>
            prev.map((sub) => {
              if (sub.id !== subjectId) return sub;
              const nextModId =
                newQuestions[0]?.module || Object.keys(sub.modules).length + 1;
              const updatedModules = { ...sub.modules };
              if (!updatedModules[nextModId]) {
                updatedModules[nextModId] = {
                  id: nextModId,
                  name: moduleName || `Chuyên đề ${nextModId}`,
                  range: `${newQuestions.length} câu`,
                  color: 'from-blue-600 to-indigo-600',
                };
              }
              return {
                ...sub,
                modules: updatedModules,
                questions: [...sub.questions, ...newQuestions],
              };
            })
          );
          setActiveSubjectId(subjectId);
          showToast(
            `Đã nhập thành công ${newQuestions.length} câu hỏi mới vào môn học!`,
            'success'
          );
        }}
        onDeleteSubject={(subjectId) => {
          setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
          if (activeSubjectId === subjectId) {
            setActiveSubjectId('chinhtri-300-2026');
          }
          showToast('Đã xóa môn học tự tạo.', 'info');
        }}
        showToast={showToast}
      />

      {/* Save History & Sync Code Modal */}
      <SaveSyncModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        subject={activeSubject}
        progressMap={currentProgressMap}
        syncCodeValue={syncCodeString}
        onRestoreSyncCode={handleRestoreSyncCode}
        onJumpToQuestion={(qid) => jumpToQuestionById(qid)}
        onFilterAnsweredInStudy={() => {
          setStudyModule('all');
          setStudyPack('all');
          setStudyStatus('answered');
          setStudyCurrentIndex(0);
          setCurrentView('study');
        }}
        showToast={showToast}
      />

      {/* Toast Notification Container */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-xl shadow-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
              t.type === 'error'
                ? 'bg-rose-600 text-white'
                : t.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
