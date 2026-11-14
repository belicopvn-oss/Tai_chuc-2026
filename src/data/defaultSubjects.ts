import { QuestionItem, ModuleMeta, CheatSheetItem, OFFICIAL_300_BANK, OFFICIAL_MODULES, OFFICIAL_CHEATSHEET_DATA } from './official300Bank';

export interface SubjectCourse {
  id: string;
  code: string;
  name: string;
  shortName: string;
  description: string;
  credits: number;
  examDate: string;
  dailyGoal: number;
  isBuiltIn?: boolean;
  modules: Record<number, ModuleMeta>;
  questions: QuestionItem[];
  cheatSheet: CheatSheetItem[];
}

export interface StudyScheduleItem {
  id: string;
  subjectId: string;
  title: string;
  date: string;
  timeSlot: string;
  locationOrRoom: string;
  type: 'exam' | 'class' | 'self_study' | 'deadline';
  completed: boolean;
}

export interface QuestionProgress {
  selectedOption?: number;
  status?: 'mastered' | 'wrong';
  confidence?: 'sure' | 'uncertain';
  starred?: boolean;
  wrongCount?: number;
  recoveryStreak?: number;
  answeredAt?: number;
  note?: string;
}

export const DEFAULT_SUBJECTS: SubjectCourse[] = [
  {
    id: 'chinhtri-300-2026',
    code: 'CT-2026',
    name: 'Nhận thức Chính trị 2026 (300 Câu Chuẩn)',
    shortName: 'Chính Trị 300+ (2026)',
    description: 'Phụ lục VI · Ngân hàng 300 Câu Kiểm tra Nhận thức Chính trị năm 2026 dành cho Sĩ quan & CCQP (Bản chuẩn xếp theo vần A, B, C).',
    credits: 4,
    examDate: '2026-12-15',
    dailyGoal: 30,
    isBuiltIn: true,
    modules: OFFICIAL_MODULES,
    questions: OFFICIAL_300_BANK,
    cheatSheet: OFFICIAL_CHEATSHEET_DATA,
  },
  {
    id: 'phapluat-quansu-2026',
    code: 'PLQS-102',
    name: 'Pháp luật Quân sự & Điều lệnh Quản lý Bộ đội',
    shortName: 'Pháp Luật & Điều Lệnh',
    description: 'Học phần tại chức bổ trợ về Luật Sĩ quan QĐND Việt Nam sửa đổi, Điều lệnh Quản lý bộ đội và quy định kỷ luật, lễ tiết tác phong.',
    credits: 3,
    examDate: '2026-12-22',
    dailyGoal: 15,
    isBuiltIn: false,
    modules: {
      1: { id: 1, name: 'Chuyên đề 1: Luật Sĩ quan & Chế độ chính sách', range: 'Cơ bản & Nâng cao', color: 'from-blue-600 to-indigo-600' },
      2: { id: 2, name: 'Chuyên đề 2: Điều lệnh Quản lý Bộ đội & Kỷ luật', range: 'Thực hành tại đơn vị', color: 'from-emerald-600 to-teal-600' },
    },
    questions: [
      {
        id: 1,
        module: 1,
        pack: 1,
        pack30: 1,
        first_letter: 'N',
        question: 'Nghĩa vụ của sĩ quan Quân đội nhân dân Việt Nam được quy định đầu tiên trong Luật Sĩ quan là gì?',
        options: [
          'Sẵn sàng chiến đấu, hy sinh bảo vệ độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Tổ quốc.',
          'Sẵn sàng chiến đấu, hy sinh bảo vệ độc lập, chủ quyền, toàn vẹn lãnh thổ chỉ trong phạm vi đơn vị đóng quân.',
          'Hoàn thành nhiệm vụ huấn luyện thường xuyên trong giờ hành chính và chấp hành sự phân công của cấp trên.',
          'Tham gia phát triển kinh tế địa phương là nhiệm vụ trung tâm hàng đầu trước khi thực hiện nhiệm vụ sẵn sàng chiến đấu.'
        ],
        answer: 0,
        keyword: 'bảo vệ độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Tổ quốc',
        explanation: 'Đáp án đúng là A. Nghĩa vụ hàng đầu của sĩ quan là sẵn sàng chiến đấu, hy sinh bảo vệ độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Tổ quốc.',
        twins: [2]
      },
      {
        id: 2,
        module: 1,
        pack: 1,
        pack30: 1,
        first_letter: 'T',
        question: 'Tiêu chuẩn chung đầu tiên của sĩ quan Quân đội nhân dân Việt Nam được xác định như thế nào?',
        options: [
          'Có trình độ chuyên môn kỹ thuật cao và ưu tiên công tác ở một số địa bàn trọng điểm.',
          'Có bản lĩnh chính trị vững vàng, tuyệt đối trung thành với Tổ quốc và nhân dân, với Đảng Cộng sản Việt Nam và Nhà nước Cộng hòa XHCN Việt Nam.',
          'Có phẩm chất đạo đức tốt nhưng không đặt nặng yêu cầu về lý luận chính trị khi làm công tác chuyên môn kỹ thuật.',
          'Có năng lực chỉ huy trong điều kiện thuận lợi và hoàn thành nhiệm vụ theo từng đợt phát động thi đua.'
        ],
        answer: 1,
        keyword: 'bản lĩnh chính trị vững vàng, tuyệt đối trung thành với Tổ quốc và nhân dân',
        explanation: 'Đáp án đúng là B. Bản lĩnh chính trị vững vàng, tuyệt đối trung thành với Tổ quốc, Nhân dân, Đảng và Nhà nước là tiêu chuẩn số 1.',
        twins: [1]
      },
      {
        id: 3,
        module: 2,
        pack: 1,
        pack30: 1,
        first_letter: 'C',
        question: 'Chế độ làm việc và sinh hoạt trong ngày của quân nhân tại đơn vị được duy trì nhằm mục đích cốt lõi nào?',
        options: [
          'Bảo đảm sự thống nhất, chính quy, rèn luyện tính tổ chức, tính kỷ luật và duy trì khả năng sẵn sàng chiến đấu cao trong mọi tình huống.',
          'Bảo đảm sự thống nhất trong giờ hành chính, còn ngoài giờ hành chính mỗi cá nhân tự sắp xếp theo nhu cầu riêng.',
          'Chỉ tập trung vào việc kiểm tra quân số buổi sáng và buổi tối để phục vụ công tác báo cáo định kỳ.',
          'Giúp bộ đội làm quen với nền nếp sinh hoạt khi có đoàn kiểm tra của cấp trên.'
        ],
        answer: 0,
        keyword: 'duy trì khả năng sẵn sàng chiến đấu cao trong mọi tình huống',
        explanation: 'Đáp án đúng là A. Chế độ trong ngày nhằm bảo đảm tính chính quy, kỷ luật và khả năng sẵn sàng chiến đấu trong mọi tình huống.',
        twins: []
      },
      {
        id: 4,
        module: 2,
        pack: 1,
        pack30: 1,
        first_letter: 'K',
        question: 'Khi cấp dưới nhận mệnh lệnh của người chỉ huy mà xét thấy mệnh lệnh đó chưa sát thực tế, quân nhân phải xử lý như thế nào đúng Điều lệnh?',
        options: [
          'Tạm dừng chấp hành mệnh lệnh và chỉ thực hiện khi đã có sự đồng thuận của toàn bộ tập thể đơn vị.',
          'Kịp thời báo cáo đề đạt ý kiến với người ra lệnh; nếu người chỉ huy vẫn quyết định thi hành thì phải chấp hành nghiêm chỉnh và báo cáo lên cấp trên trực tiếp của người ra lệnh.',
          'Thực hiện một phần mệnh lệnh trong điều kiện thuận lợi và bỏ qua các nội dung khó khăn.',
          'Chờ đến kỳ sinh hoạt đơn vị cuối tháng mới nêu ý kiến để giữ hòa khí khi có sai phạm hoặc bất đồng.'
        ],
        answer: 1,
        keyword: 'phải chấp hành nghiêm chỉnh và báo cáo lên cấp trên trực tiếp của người ra lệnh',
        explanation: 'Đáp án đúng là B. Quân nhân có quyền đề đạt ý kiến nhưng khi người chỉ huy vẫn giữ quyết định thì phải chấp hành nghiêm và được quyền báo cáo cấp trên trực tiếp của người ra lệnh.',
        twins: []
      }
    ],
    cheatSheet: [
      {
        code: 'Nghĩa vụ số 1 của Sĩ quan',
        content: 'Sẵn sàng chiến đấu, hy sinh bảo vệ độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Tổ quốc',
        trap: 'Cẩn thận bẫy thu hẹp phạm vi "chỉ trong phạm vi đơn vị đóng quân"',
        qid: 1
      },
      {
        code: 'Nguyên tắc Chấp hành Mệnh lệnh',
        content: 'Báo cáo đề đạt ý kiến; nếu người chỉ huy vẫn quyết định thì phải chấp hành nghiêm chỉnh và báo cáo cấp trên trực tiếp',
        trap: 'Không được tự ý dừng chấp hành mệnh lệnh',
        qid: 4
      }
    ]
  },
  {
    id: 'chuyendoiso-hanhchinh-2026',
    code: 'CDS-205',
    name: 'Chuyển đổi số & Hành chính Quân sự Hiện đại',
    shortName: 'Chuyển Đổi Số & HCQS',
    description: 'Môn học tại chức về ứng dụng CNTT, an toàn thông tin, chữ ký số và cải cách hành chính quân sự theo Nghị quyết 57-NQ/TW.',
    credits: 2,
    examDate: '2026-12-28',
    dailyGoal: 10,
    isBuiltIn: false,
    modules: {
      1: { id: 1, name: 'Chuyên đề 1: An toàn thông tin & Bảo mật dữ liệu quân sự', range: 'Trọng tâm thực hành', color: 'from-purple-600 to-violet-600' }
    },
    questions: [
      {
        id: 1,
        module: 1,
        pack: 1,
        pack30: 1,
        first_letter: 'N',
        question: 'Nguyên tắc bảo đảm an toàn thông tin khi soạn thảo, lưu trữ văn bản có nội dung bí mật quân sự trên máy tính là gì?',
        options: [
          'Được phép soạn thảo trên máy tính kết nối Internet công cộng nếu đã cài phần mềm diệt virus.',
          'Tuyệt đối không soạn thảo, lưu trữ bí mật nhà nước, bí mật quân sự trên máy tính có kết nối mạng Internet hoặc mạng không được phép xử lý thông tin mật.',
          'Chỉ hạn chế kết nối Internet trong giờ hành chính khi đang xử lý văn bản mật.',
          'Có thể dùng thiết bị nhớ USB cá nhân để sao chép văn bản mật giữa máy tính Internet và máy tính mạng nội bộ khi cần gấp.'
        ],
        answer: 1,
        keyword: 'Tuyệt đối không soạn thảo, lưu trữ bí mật nhà nước, bí mật quân sự trên máy tính có kết nối mạng Internet',
        explanation: 'Đáp án đúng là B. Tuyệt đối nghiêm cấm soạn thảo, lưu trữ tài liệu mật trên máy tính kết nối Internet hoặc dùng USB cá nhân cắm lẫn.',
        twins: []
      },
      {
        id: 2,
        module: 1,
        pack: 1,
        pack30: 1,
        first_letter: 'M',
        question: 'Mục tiêu phát triển Chính phủ số và chuyển đổi số trong cơ quan, đơn vị hướng tới ba trụ cột cốt lõi nào?',
        options: [
          'Phát triển hạ tầng số, dữ liệu số và nhân lực số gắn với bảo đảm an toàn thông tin, an ninh mạng vững chắc.',
          'Chỉ tập trung mua sắm máy tính cấu hình cao mà chưa chú trọng đào tạo nguồn nhân lực số.',
          'Triển khai phần mềm quản lý văn bản ở một số địa bàn trọng điểm trước khi áp dụng quy định bảo mật.',
          'Số hóa toàn bộ hồ sơ nhưng không đặt nặng yêu cầu kiểm soát truy cập và phân quyền.'
        ],
        answer: 0,
        keyword: 'hạ tầng số, dữ liệu số và nhân lực số gắn với bảo đảm an toàn thông tin',
        explanation: 'Đáp án đúng là A. Ba trụ cột cốt lõi là hạ tầng số, dữ liệu số và nhân lực số gắn chặt với an toàn thông tin, an ninh mạng.',
        twins: []
      }
    ],
    cheatSheet: [
      {
        code: '3 Trụ cột Chuyển đổi số',
        content: 'Hạ tầng số, Dữ liệu số và Nhân lực số gắn với an toàn thông tin, an ninh mạng',
        trap: 'Tránh phương án chỉ tập trung mua sắm phần cứng mà bỏ qua nhân lực và dữ liệu',
        qid: 2
      }
    ]
  }
];

export const DEFAULT_SCHEDULE_ITEMS: StudyScheduleItem[] = [
  {
    id: 'sch-1',
    subjectId: 'chinhtri-300-2026',
    title: 'Ôn hoàn thành Phần I & Phần II (120 câu Nhận thức Chính trị)',
    date: '2026-11-20',
    timeSlot: '19:30 - 21:00',
    locationOrRoom: 'Tự học trực tuyến / Phòng đọc đơn vị',
    type: 'self_study',
    completed: false
  },
  {
    id: 'sch-2',
    subjectId: 'chinhtri-300-2026',
    title: 'Thi thử tổng duyệt 50 câu Nhận thức Chính trị năm 2026',
    date: '2026-12-05',
    timeSlot: '08:00 - 09:00',
    locationOrRoom: 'Hội trường A - Đơn vị',
    type: 'exam',
    completed: false
  },
  {
    id: 'sch-3',
    subjectId: 'chinhtri-300-2026',
    title: 'Kiểm tra chính thức Nhận thức Chính trị Sĩ quan & CCQP 2026',
    date: '2026-12-15',
    timeSlot: '07:30 - 11:00',
    locationOrRoom: 'Phòng thi máy tính trung tâm',
    type: 'exam',
    completed: false
  },
  {
    id: 'sch-4',
    subjectId: 'phapluat-quansu-2026',
    title: 'Lớp học tại chức cuối tuần: Pháp luật Quân sự & Điều lệnh',
    date: '2026-11-28',
    timeSlot: '13:30 - 17:00',
    locationOrRoom: 'Giảng đường B2',
    type: 'class',
    completed: false
  }
];
