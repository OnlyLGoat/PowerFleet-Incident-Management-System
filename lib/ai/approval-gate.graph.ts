import { StateGraph, Annotation, interrupt } from "@langchain/langgraph";

// Define LangGraph State Schema
const ProposalState = Annotation.Root({
  incidentId: Annotation<number>(),
  actionType: Annotation<"TRIAGE_ESCALATE" | "SUBMIT_TASKS">(),
  proposalData: Annotation<Record<string, unknown>>(),
  managerApproved: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  resultMessage: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});

/**
 * Step 1: Formulate AI Proposal
 */
async function generateProposalNode(state: typeof ProposalState.State) {
  return {
    resultMessage: `AI Proposal created for Incident #${state.incidentId}: ${state.actionType}. Awaiting Support Manager approval.`,
  };
}

/**
 * Step 2: Human Approval Interruption Gate
 */
async function approvalGateNode(state: typeof ProposalState.State) {
  if (!state.managerApproved) {
    // Trigger LangGraph Interrupt Gate — execution pauses until manager posts approval payload
    const approvalResponse = interrupt({
      message: `Support Manager Approval Required for ${state.actionType}`,
      incidentId: state.incidentId,
      proposalData: state.proposalData,
    }) as { approved: boolean; modifiedData?: Record<string, unknown> };

    if (!approvalResponse.approved) {
      return {
        managerApproved: false,
        resultMessage: "AI proposal was rejected by Support Manager. No database changes executed.",
      };
    }

    return {
      managerApproved: true,
      proposalData: approvalResponse.modifiedData || state.proposalData,
      resultMessage: "AI proposal approved by Support Manager.",
    };
  }

  return { managerApproved: true };
}

/**
 * Construct LangGraph Workflow
 */
const workflow = new StateGraph(ProposalState)
  .addNode("formulate_proposal", generateProposalNode)
  .addNode("approval_gate", approvalGateNode)
  .addEdge("__start__", "formulate_proposal")
  .addEdge("formulate_proposal", "approval_gate")
  .addEdge("approval_gate", "__end__");

export const approvalGraph = workflow.compile();
