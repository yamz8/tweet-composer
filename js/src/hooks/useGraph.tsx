import { useState } from "react";
import { createClient } from "./utils";
import { setCookie } from "@/lib/cookies";
import { ASSISTANT_ID_COOKIE } from "@/constants";

export interface GraphInput {
  messages: Record<string, any>[];
  hasAcceptedText: boolean;
  contentGenerated: boolean;
  systemRules: string | undefined;
}

export function useGraph() {
  const [threadId, setThreadId] = useState<string>();
  const [assistantId, setAssistantId] = useState<string>();
  const [isGetAssistantsLoading, setIsGetAssistantsLoading] = useState(false);

  const createAssistant = async (
    graphId: string,
    userId: string,
    extra?: {
      assistantName?: string;
      assistantDescription?: string;
      overrideExisting?: boolean;
    }
  ) => {
    if (assistantId && !extra?.overrideExisting) return;
    const client = createClient();
    const metadata = {
      userId,
      assistantName: extra?.assistantName,
      assistantDescription: extra?.assistantDescription,
    };

    const assistant = await client.assistants.create({ graphId, metadata });
    setAssistantId(assistant.assistant_id);
    setCookie(ASSISTANT_ID_COOKIE, assistant.assistant_id);
    return assistant;
  };

  const createThread = async () => {
    const client = createClient();
    const thread = await client.threads.create();
    setThreadId(thread.thread_id);
    return thread;
  };

  const streamMessage = async (params: GraphInput) => {
    const { messages, hasAcceptedText, contentGenerated, systemRules } = params;
    if (!assistantId) {
      throw new Error("Assistant ID is required");
    }
    let tmpThreadId = threadId;
    if (!tmpThreadId) {
      const thread = await createThread();
      // Must assign to a tmp variable as the state update may not be immediate.
      tmpThreadId = thread.thread_id;
    }

    const client = createClient();
    const input = { messages, hasAcceptedText, contentGenerated, systemRules };
    return client.runs.stream(tmpThreadId, assistantId, {
      input,
      streamMode: "events",
    });
  };

  const sendMessage = async (
    params: GraphInput
  ): Promise<Record<string, any>> => {
    const { messages, hasAcceptedText, contentGenerated, systemRules } = params;
    if (!assistantId) {
      throw new Error("Assistant ID is required");
    }
    let tmpThreadId = threadId;
    if (!tmpThreadId) {
      const thread = await createThread();
      // Must assign to a tmp variable as the state update may not be immediate.
      tmpThreadId = thread.thread_id;
    }

    const client = createClient();
    const input = { messages, hasAcceptedText, contentGenerated, systemRules };
    return await client.runs.wait(tmpThreadId, assistantId, {
      input,
      streamMode: "events",
    });
  };

  const getAssistantsByUserId = async (userId: string) => {
    setIsGetAssistantsLoading(true);
    const client = createClient();
    const query = {
      metadata: { userId },
    };
    const results = await client.assistants.search(query);
    setIsGetAssistantsLoading(false);
    return results;
  };

  const updateAssistant = (assistantId: string) => {
    setAssistantId(assistantId);
    setCookie(ASSISTANT_ID_COOKIE, assistantId);
  };

  return {
    assistantId,
    setAssistantId: updateAssistant,
    streamMessage,
    sendMessage,
    createAssistant,
    isGetAssistantsLoading,
    getAssistantsByUserId,
  };
}
