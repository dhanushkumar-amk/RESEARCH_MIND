import logging
import asyncio
from typing import Optional, Iterator, Any, AsyncIterator
import pickle
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple
from langgraph.checkpoint.memory import MemorySaver

from app.agents.state import AgentState
from app.agents.retrieval_agent import retrieval_agent
from app.agents.research_agent import research_agent
from app.agents.critic_agent import critic_agent
from app.agents.summary_agent import summary_agent
from app.agents.memory_agent import memory_agent
from app.rag.retriever import sync_db

logger = logging.getLogger("researchmind")

# -------------------------------------------------------------
# PRODUCTION-GRADE MONGODB CHECKPOINTER FOR LANGGRAPH STATE PERSISTENCE
# -------------------------------------------------------------
class MongoCheckpointer(BaseCheckpointSaver):
    """
    Subclasses BaseCheckpointSaver to store graph state checkpoints
    directly in MongoDB for persistent agent execution context.
    """
    def __init__(self):
        super().__init__()
        self.collection = sync_db["agent_checkpoints"]

    def get_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        configurable = config.get("configurable", {})
        thread_id = configurable.get("thread_id")
        checkpoint_id = configurable.get("checkpoint_id")
        
        if not thread_id:
            return None
            
        query = {"thread_id": thread_id}
        if checkpoint_id:
            query["checkpoint_id"] = checkpoint_id
            
        # Get last checkpoint
        doc = self.collection.find_one(query, sort=[("checkpoint_id", -1)])
        if not doc:
            return None
            
        checkpoint = pickle.loads(doc["checkpoint"])
        metadata = pickle.loads(doc["metadata"])
        parent_config = pickle.loads(doc["parent_config"]) if doc.get("parent_config") else None
        
        return CheckpointTuple(
            config=config,
            checkpoint=checkpoint,
            metadata=metadata,
            parent_config=parent_config
        )

    def put(self, config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata, new_versions: Any) -> RunnableConfig:
        configurable = config.get("configurable", {})
        thread_id = configurable.get("thread_id")
        checkpoint_id = checkpoint["id"]
        
        if not thread_id:
            return config
            
        doc = {
            "thread_id": thread_id,
            "checkpoint_id": checkpoint_id,
            "checkpoint": pickle.dumps(checkpoint),
            "metadata": pickle.dumps(metadata),
            "parent_config": pickle.dumps(config.get("parent_config")) if config.get("parent_config") else None,
            "updated_at": pickle.dumps(checkpoint.get("ts"))
        }
        
        self.collection.update_one(
            {"thread_id": thread_id, "checkpoint_id": checkpoint_id},
            {"$set": doc},
            upsert=True
        )
        return config

    def list(self, config: Optional[RunnableConfig], *, filter: Optional[CheckpointMetadata] = None, before: Optional[RunnableConfig] = None, limit: Optional[int] = None) -> Iterator[CheckpointTuple]:
        configurable = config.get("configurable", {}) if config else {}
        thread_id = configurable.get("thread_id")
        
        query = {}
        if thread_id:
            query["thread_id"] = thread_id
            
        cursor = self.collection.find(query, sort=[("checkpoint_id", -1)])
        if limit:
            cursor = cursor.limit(limit)
            
        for doc in cursor:
            checkpoint = pickle.loads(doc["checkpoint"])
            metadata = pickle.loads(doc["metadata"])
            parent_config = pickle.loads(doc["parent_config"]) if doc.get("parent_config") else None
            
            yield CheckpointTuple(
                config={"configurable": {"thread_id": doc["thread_id"], "checkpoint_id": doc["checkpoint_id"]}},
                checkpoint=checkpoint,
                metadata=metadata,
                parent_config=parent_config
            )

    async def aget_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        """Async implementation of get_tuple using asyncio.to_thread."""
        return await asyncio.to_thread(self.get_tuple, config)

    async def aput(
        self, 
        config: RunnableConfig, 
        checkpoint: Checkpoint, 
        metadata: CheckpointMetadata, 
        new_versions: Any
    ) -> RunnableConfig:
        """Async implementation of put using asyncio.to_thread."""
        return await asyncio.to_thread(self.put, config, checkpoint, metadata, new_versions)

    async def alist(
        self, 
        config: Optional[RunnableConfig], 
        *, 
        filter: Optional[CheckpointMetadata] = None, 
        before: Optional[RunnableConfig] = None, 
        limit: Optional[int] = None
    ) -> AsyncIterator[CheckpointTuple]:
        """Async implementation of list using asyncio.to_thread."""
        items = await asyncio.to_thread(
            lambda: list(self.list(config, filter=filter, before=before, limit=limit))
        )
        for item in items:
            yield item

# Instantiate the checkpointers
mongo_checkpointer = MongoCheckpointer()
memory_checkpointer = MemorySaver()

# -------------------------------------------------------------
# GRAPH ASSEMBLY & FLOW CONFIGURATION
# -------------------------------------------------------------
workflow = StateGraph(AgentState)

# Add all agent nodes
workflow.add_node("retrieval_agent", retrieval_agent)
workflow.add_node("research_agent", research_agent)
workflow.add_node("critic_agent", critic_agent)
workflow.add_node("summary_agent", summary_agent)
workflow.add_node("memory_agent", memory_agent)

# Configure Parallel fan-out from START to Retrieval and Research
workflow.add_edge(START, "retrieval_agent")
workflow.add_edge(START, "research_agent")

# Configure fan-in (join) from both agents into the Critic
workflow.add_edge("retrieval_agent", "critic_agent")
workflow.add_edge("research_agent", "critic_agent")

# Define conditional edge logic from Critic Agent
def route_from_critic(state: AgentState) -> str:
    """
    Evaluates whether Critic Agent quality criteria were met,
    routing back to Retrieval Agent on retry or forward to Summary Agent.
    """
    needs_retry = state.get("needs_retry", False)
    retry_count = state.get("retry_count", 0)
    
    if needs_retry and retry_count < 2:
        logger.info(f"[Graph Router] Routing back to Retrieval Agent (Retry count: {retry_count})")
        return "retrieval_agent"
        
    logger.info("[Graph Router] Routing to Summary Agent.")
    return "summary_agent"

workflow.add_conditional_edges(
    "critic_agent",
    route_from_critic,
    {
        "retrieval_agent": "retrieval_agent",
        "summary_agent": "summary_agent"
    }
)

# Complete the sequential nodes flow
workflow.add_edge("summary_agent", "memory_agent")
workflow.add_edge("memory_agent", END)

# Compile graph with MongoDB checkpointer (fallback to MemorySaver on any connection issues)
try:
    logger.info("[Graph] Compiling LangGraph workflow with persistent MongoDB checkpointer...")
    compiled_graph = workflow.compile(checkpointer=mongo_checkpointer)
except Exception as e:
    logger.error(f"[Graph] Failed compiling with MongoDB checkpointer: {e}. Falling back to MemorySaver.")
    compiled_graph = workflow.compile(checkpointer=memory_checkpointer)
