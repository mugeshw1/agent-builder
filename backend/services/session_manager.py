from langchain_core.chat_history import InMemoryChatMessageHistory
from typing import Dict

class SessionManager:
    """
    Manages chat history for different user sessions.
    Currently uses an in-memory store.
    """
    def __init__(self):
        # Maps session_id -> InMemoryChatMessageHistory
        self._sessions: Dict[str, InMemoryChatMessageHistory] = {}

    def get_history(self, session_id: str) -> InMemoryChatMessageHistory:
        """Retrieve or create chat history for a session."""
        if session_id not in self._sessions:
            self._sessions[session_id] = InMemoryChatMessageHistory()
        return self._sessions[session_id]

    def clear_session(self, session_id: str):
        """Clear history for a session."""
        if session_id in self._sessions:
            del self._sessions[session_id]

# Singleton instance
session_manager = SessionManager()
