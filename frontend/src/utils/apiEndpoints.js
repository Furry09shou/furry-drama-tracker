const API = {
  // 认证
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    CHANGE_PASSWORD: '/api/auth/change-password',
    CHANGE_EMAIL: '/api/auth/change-email',
    REQUEST_EMAIL_CHANGE: '/api/auth/request-email-change',
    VERIFY_EMAIL_CHANGE: '/api/auth/verify-email-change',
    RESET_PASSWORD: '/api/auth/reset-password',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    VERIFY_EMAIL: '/api/auth/verify-email',
    RESEND_VERIFICATION: '/api/auth/resend-verification',
    CSRF_TOKEN: '/api/csrf-token',
    DELETION_STATUS: '/api/auth/deletion-status',
    REQUEST_DELETION: '/api/auth/request-deletion',
    CANCEL_DELETION: '/api/auth/cancel-deletion',
    EMAIL_NOTIFICATION_PREFS: '/api/auth/email-notification-prefs',
  },
  // 剧集
  EPISODES: '/api/episodes',
  // 系列
  SERIES: '/api/series',
  // 用户
  USERS: {
    AVATAR: '/api/users/avatar',
    EXPORT: '/api/users/export-my-data',
    PROFILE: '/api/users/profile',
    BACKGROUND_UPLOAD: '/api/users/background-upload',
    BACKGROUND_PREFS: '/api/users/background-prefs',
  },
  // 收藏/关注/历史
  FAVORITES: '/api/favorites',
  FOLLOWS: '/api/follows',
  HISTORIES: '/api/histories',
  // 评分
  RATINGS: '/api/ratings',
  // 文件夹
  FOLDERS: '/api/folders',
  // 通知
  NOTIFICATIONS: {
    STREAM: '/api/notifications/stream',
    LIST: '/api/notifications',
    UNREAD_COUNT: '/api/notifications/unread-count',
    MARK_READ: (id) => `/api/notifications/read/${id}`,
    MARK_ALL_READ: '/api/notifications/read-all',
    DELETE: (id) => `/api/notifications/${id}`,
  },
  // 管理
  ADMIN: {
    LOGIN: '/api/admin/login',
    VERIFY: '/api/admin/verify',
    LOGOUT: '/api/admin/logout',
    PENDING_COUNTS: '/api/admin/pending-counts',
    EPISODES: '/api/admin/episodes',
    USERS: '/api/admin/users',
    STATS: '/api/admin/stats',
    SESSIONS: '/api/admin/sessions',
    BANNERS: '/api/admin/banners',
    CATEGORIES: '/api/admin/categories',
    SITE_CONTENT: (key) => `/api/admin/site-content/${key}`,
    FRIEND_LINKS: '/api/admin/friend-links',
    FEEDBACK: '/api/admin/feedback',
    REPORTS: '/api/admin/reports',
    BACKUP_EXPORT: '/api/admin/backup/export',
    BACKUP_IMPORT: '/api/admin/backup/import',
    AUDIT_LOGS: '/api/admin/audit-logs',
    API_USAGE: '/api/admin/api-usage',
    ANALYTICS: '/api/admin/analytics',
    CREATOR_PROFILE: '/api/admin/creator-profile',
  },
  // 统计
  STATS: {
    OVERVIEW: '/api/stats/overview',
    REALTIME: '/api/stats/realtime',
    RECOMMENDATIONS: (id) => `/api/stats/recommendations/${id}`,
  },
  // 翻译
  TRANSLATE_BATCH: '/api/translate/batch',
  // 反馈
  FEEDBACK: '/api/feedback',
  // 举报
  REPORTS: '/api/reports',
  // 友链
  FRIEND_LINKS: '/api/friend-links',
  // 创作者
  CREATOR_PROFILES: '/api/creator-profiles',
  // 会话
  USER_SESSIONS: {
    CREATE: '/api/user-sessions/create',
    MY: '/api/user-sessions/my',
    HEARTBEAT: '/api/user-sessions/heartbeat',
    DELETE: (id) => `/api/user-sessions/${id}`,
    DELETE_ALL: '/api/user-sessions/my/all',
    UPDATE_NAME: (id) => `/api/user-sessions/${id}/name`,
  },
  // 健康检查
  HEALTH: '/api/health',
};

export default API;
