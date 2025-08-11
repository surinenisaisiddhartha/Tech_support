// frontend/src/app/lib/config.ts

export const API_CONFIG = {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "/api",
    ENDPOINTS: {
      // Auth endpoints
      AUTH: {
        LOGIN: "/auth/login",
        SIGNUP: "/auth/signup", 
        SET_FILTER: "/auth/set_filter"
      },
      // Chat endpoints
      CHAT: {
        ASK: "/chat/ask"
      },
      // History endpoints
      HISTORY: {
        RECENT: "/history/recent",
        CLEAR: "/history/clear"
      },
      // File endpoints
      FILES: {
        UPLOAD: "/upload",
        DELETE: "/delete",
        RESET: "/reset"
      }
    },
    HEADERS: {
      JSON: {
        'Content-Type': 'application/json'
      }
    }
  };