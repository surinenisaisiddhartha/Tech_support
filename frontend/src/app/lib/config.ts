// frontend/src/app/lib/config.ts

export const API_CONFIG = {
  // Default to FastAPI backend if no env var is set
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",

  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      LOGIN: "/auth/login",
      SIGNUP: "/auth/signup",
      SET_FILTER: "/auth/set_filter",
    },
    // Chat endpoints
    CHAT: {
      ASK: "/chat/ask",
    },
    // History endpoints
    HISTORY: {
      RECENT: "/history/recent",
      CLEAR: "/history/clear",
    },
    // File endpoints
    FILES: {
      UPLOAD: "/upload",
      UPLOAD_URL: "/upload/url",
      DELETE: "/delete",
      RESET: "/reset",
    },
  },

  HEADERS: {
    JSON: {
      "Content-Type": "application/json",
    },
  },
};
