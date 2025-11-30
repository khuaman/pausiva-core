"""Single LangGraph agent for Chat V2."""

from typing import Annotated, Literal, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, SystemMessage  # noqa: F401
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition  # noqa: F401

from app.shared.llm import get_chat_model_with_fallbacks

from .prompts import get_system_prompt
from .tools import ALL_TOOLS


class AgentState(TypedDict, total=False):
    """State for the chat V2 agent.

    Input fields (required for invocation):
    - messages: Conversation history
    - phone_number: Patient phone
    - is_new_patient: True if no existing patient record
    - is_new_conversation: True if starting fresh conversation
    - patient_data: Existing patient data if available
    - user_id: Optional user ID

    Output fields (filled by agent, not required as input):
    - risk_level, risk_score, symptom_summary, etc.
    """

    # Input fields (always provided by service)
    messages: Annotated[list[BaseMessage], add_messages]
    phone_number: str
    is_new_patient: bool
    is_new_conversation: bool
    patient_data: dict | None
    user_id: str | None
    # Output fields (optional, filled by agent)
    risk_level: str
    risk_score: int
    symptom_summary: str
    medication_schedule: list[dict]
    appointments: list[dict]
    follow_up_questions: list[str]
    actions: list[str]
    onboarding_state: str | None


def create_agent_node():
    """Create the agent node function."""

    async def agent_node(state: AgentState) -> dict:
        """
        Main agent node that processes messages and decides on tool calls.
        """
        # Get the model with fallbacks (gpt-5.1 -> gemini-2.0-flash)
        model = get_chat_model_with_fallbacks(temperature=0.7)

        # Bind all tools to the model with parallel execution and strict schema
        model_with_tools = model.bind_tools(
            ALL_TOOLS,
            strict=True,
            parallel_tool_calls=True,
        )

        # Build system prompt with context
        system_prompt = get_system_prompt(
            phone_number=state.get("phone_number", ""),
            is_new_patient=state.get("is_new_patient", False),
            is_new_conversation=state.get("is_new_conversation", False),
            patient_data=state.get("patient_data"),
        )

        # Prepare messages with system prompt
        messages = [SystemMessage(content=system_prompt)] + list(state["messages"])

        # Invoke the model
        response = await model_with_tools.ainvoke(messages)

        return {"messages": [response]}

    return agent_node


def should_continue(state: AgentState) -> Literal["tools", "end"]:
    """
    Determine if we should continue to tools or end.

    Uses langgraph's tools_condition for standard tool detection.
    """
    messages = state["messages"]
    last_message = messages[-1]

    # Check if the last message has tool calls
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "end"


def build_graph() -> StateGraph:
    """
    Build the LangGraph for chat V2.

    This is a simple agent-tool loop:
    1. Agent receives message and decides action
    2. If tool calls needed, execute tools
    3. Return to agent with tool results
    4. Repeat until agent responds without tool calls
    """
    # Create the graph
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("agent", create_agent_node())
    graph.add_node(
        "tools",
        ToolNode(
            tools=ALL_TOOLS,
            handle_tool_errors=True,
        ),
    )

    # Set entry point
    graph.set_entry_point("agent")

    # Add conditional edges from agent
    graph.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "end": END,
        },
    )

    # Tools always return to agent
    graph.add_edge("tools", "agent")

    return graph


def compile_graph(checkpointer=None):
    """
    Compile the graph with optional checkpointer for memory.

    Args:
        checkpointer: Optional checkpointer for conversation memory

    Returns:
        Compiled graph ready for execution
    """
    graph = build_graph()
    return graph.compile(checkpointer=checkpointer)
