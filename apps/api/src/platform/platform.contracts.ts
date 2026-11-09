/**
 * Reserved platform contracts for later phases.
 * Domain apps should depend on these interfaces instead of calling providers directly.
 */

export type AiContextChunk = {
  appKey: string;
  ref: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export interface AiGateway {
  chat(input: { workspaceId: string; userId: string; messages: Array<{ role: string; content: string }>; context?: AiContextChunk[] }): Promise<{ content: string }>;
  generateMilestones(input: { goal: string; context?: AiContextChunk[] }): Promise<Array<{ title: string; dueInDays?: number }>>;
}

export interface FilesGateway {
  store(input: { workspaceId: string; userId: string; filename: string; mimeType: string; bytes: Buffer }): Promise<{ fileId: string }>;
  getDownloadUrl(fileId: string): Promise<string>;
}

export interface IntegrationsGateway {
  connect(input: { userId: string; provider: string; scopes: string[] }): Promise<{ authUrl: string }>;
  sync(input: { userId: string; provider: string }): Promise<{ ok: boolean }>;
}

export interface GoalsGateway {
  createGoal(input: { workspaceId: string; userId: string; title: string; sourceApp?: string; sourceRef?: string }): Promise<{ goalId: string }>;
  addMilestone(input: { goalId: string; title: string }): Promise<{ milestoneId: string }>;
}

export interface AiContextAdapter {
  toAiContext(ref: string): Promise<AiContextChunk | null>;
}
