// frontend/src/app/page.tsx
import { AuthProvider } from './contexts/AuthContext';
import ChatbotInterface from './components/chatbotInterface';

export default function Home() {
  return (
    <AuthProvider>
      <ChatbotInterface />
    </AuthProvider>
  );
}