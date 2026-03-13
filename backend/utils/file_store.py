import json
import os
from typing import List, Optional
from models.agent import AgentConfig

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "agents")

# Ensure directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def _get_file_path(agent_id: str) -> str:
    return os.path.join(DATA_DIR, f"{agent_id}.json")

def save_agent(agent: AgentConfig) -> AgentConfig:
    file_path = _get_file_path(agent.id)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(agent.model_dump(), f, indent=2)
    return agent

def get_agent(agent_id: str) -> Optional[AgentConfig]:
    file_path = _get_file_path(agent_id)
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return AgentConfig(**data)
    
    # Try slug lookup if ID lookup fails
    return get_agent_by_slug(agent_id)

def get_agent_by_slug(slug: str) -> Optional[AgentConfig]:
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(DATA_DIR, filename), "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("slug") == slug:
                    return AgentConfig(**data)
    return None

def list_agents() -> List[AgentConfig]:
    agents = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            agent_id = filename.replace(".json", "")
            agent = get_agent(agent_id)
            if agent:
                agents.append(agent)
    return agents

def delete_agent(agent_id: str) -> bool:
    file_path = _get_file_path(agent_id)
    if os.path.exists(file_path):
        os.remove(file_path)
        return True
    return False
