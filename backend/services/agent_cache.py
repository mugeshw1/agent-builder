import hashlib
import json
from typing import Dict, Any, Optional

class AgentCache:
    """
    In-memory cache for LangChain agent bundles (chains).
    This ensures we don't rebuild the entire RAG pipeline/LLM setup on every request.
    """
    def __init__(self):
        # Maps agent_id -> { 'hash': config_hash, 'bundle': agent_bundle }
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _generate_hash(self, config_dict: dict) -> str:
        """Create a hash of the configuration to detect changes."""
        # Convert to string and hash
        config_str = json.dumps(config_dict, sort_keys=True)
        return hashlib.md5(config_str.encode()).hexdigest()

    def get(self, agent_id: str, config_dict: dict) -> Optional[Dict[str, Any]]:
        """Retrieve an agent bundle from cache if the config hash matches."""
        current_hash = self._generate_hash(config_dict)
        
        if agent_id in self._cache:
            cached_item = self._cache[agent_id]
            if cached_item['hash'] == current_hash:
                return cached_item['bundle']
        
        return None

    def set(self, agent_id: str, config_dict: dict, bundle: Dict[str, Any]):
        """Store an agent bundle in the cache."""
        current_hash = self._generate_hash(config_dict)
        self._cache[agent_id] = {
            'hash': current_hash,
            'bundle': bundle
        }

    def invalidate(self, agent_id: str):
        """Remove an agent from cache (e.g., when deleted)."""
        if agent_id in self._cache:
            del self._cache[agent_id]

# Singleton instance
agent_cache = AgentCache()
