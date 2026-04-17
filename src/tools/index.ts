import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { client } from '../client';

// ── Tool definitions ──────────────────────────────────────────────────────────

export const tools: Tool[] = [
  {
    name: 'create_interrupt',
    description: 'Create a new human-in-the-loop interrupt request. Use when your agent hits a decision point requiring human approval before proceeding.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId:    { type: 'string',  description: 'Identifier of the calling agent' },
        userId:     { type: 'string',  description: 'User who should review this interrupt' },
        action:     { type: 'string',  description: 'Human-readable description of what the agent wants to do' },
        context:    { type: 'object',  description: 'Relevant data for the human to review (JSON object)' },
        urgency:    { type: 'string',  enum: ['low', 'medium', 'high'], description: 'How time-sensitive this is (default: medium)' },
        expiresIn:  { type: 'number',  description: 'Seconds until this interrupt expires (default: 3600)' },
        callbackUrl:{ type: 'string',  description: 'Optional webhook URL to call when a decision is made' },
      },
      required: ['agentId', 'userId', 'action', 'context'],
    },
  },
  {
    name: 'get_interrupt_status',
    description: 'Poll the status of an interrupt request. Returns current status and the decision if one has been made.',
    inputSchema: {
      type: 'object',
      properties: {
        interruptId: { type: 'string', description: 'ID of the interrupt to check' },
      },
      required: ['interruptId'],
    },
  },
  {
    name: 'list_pending_interrupts',
    description: 'List all pending interrupt requests for a user. Use to see what decisions are waiting for human review.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User whose pending interrupts to list' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'decide_interrupt',
    description: 'Submit a human decision on an interrupt request (approve or reject).',
    inputSchema: {
      type: 'object',
      properties: {
        interruptId:    { type: 'string', description: 'ID of the interrupt to decide' },
        decision:       { type: 'string', enum: ['approved', 'rejected'], description: 'The decision' },
        reason:         { type: 'string', description: 'Optional explanation for the decision' },
        modifiedParams: { type: 'object', description: 'Optional modified parameters the agent should use instead' },
      },
      required: ['interruptId', 'decision'],
    },
  },
  {
    name: 'cancel_interrupt',
    description: 'Cancel a pending interrupt request. Use when the agent no longer needs the decision.',
    inputSchema: {
      type: 'object',
      properties: {
        interruptId: { type: 'string', description: 'ID of the interrupt to cancel' },
      },
      required: ['interruptId'],
    },
  },
  {
    name: 'get_interrupt_analytics',
    description: 'Get interrupt usage analytics for a user — total count, approval rate, average response time, and top action types.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User whose analytics to retrieve' },
      },
      required: ['userId'],
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────

export async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'create_interrupt':
      return client.post('/interrupts', args);

    case 'get_interrupt_status':
      return client.get(`/interrupts/${args['interruptId']}`);

    case 'list_pending_interrupts':
      return client.get(`/interrupts/pending/${args['userId']}`);

    case 'decide_interrupt': {
      const { interruptId, ...body } = args;
      return client.post(`/interrupts/${interruptId}/decide`, body);
    }

    case 'cancel_interrupt':
      return client.delete(`/interrupts/${args['interruptId']}`);

    case 'get_interrupt_analytics':
      return client.get(`/analytics/${args['userId']}`);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
