import { useEffect, useState } from "react";
import { createClient } from "./utils";
import { getCookie, setCookie } from "@/lib/cookies";
import { ASSISTANT_ID_COOKIE, USER_TIED_TO_ASSISTANT } from "@/constants";

export interface GraphInput {
  messages: Record<string, any>[];
  hasAcceptedText: boolean;
  contentGenerated: boolean;
  systemRules: string | undefined;
}

export interface UseGraphInput {
  userId: string | undefined;
  refreshAssistants: () => void;
}

export function useGraph(input: UseGraphInput) {
  const [threadId, setThreadId] = useState<string>();
  const [assistantId, setAssistantId] = useState<string>();
  const [isGetAssistantsLoading, setIsGetAssistantsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (assistantId) return;
    if (!process.env.NEXT_PUBLIC_LANGGRAPH_GRAPH_ID) {
      throw new Error("Graph ID is required");
    }

    const assistantIdCookie = getCookie(ASSISTANT_ID_COOKIE);

    if (assistantIdCookie) {
      setAssistantId(assistantIdCookie);
    } else if (input.userId) {
      createAssistant(
        process.env.NEXT_PUBLIC_LANGGRAPH_GRAPH_ID,
        input.userId
      ).then((assistant) => {
        if (!assistant) {
          throw new Error("Failed to create assistant");
        }
        const newAssistantId = assistant.assistant_id;
        setCookie(ASSISTANT_ID_COOKIE, newAssistantId);
        setAssistantId(newAssistantId);
      });
    }
  }, [input.userId]);

  // TODO: remove after a couple days when all existing users have been updated.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!input.userId) return;
    void ensureAssistantIsTiedToUser(input.userId);
  }, [assistantId, input.userId]);

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
    const input = { messages, contentGenerated, systemRules };
    const config = { configurable: { systemRules, hasAcceptedText } };
    return client.runs.stream(tmpThreadId, assistantId, {
      input,
      config,
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
    const input = { messages, contentGenerated };
    const config = { configurable: { systemRules, hasAcceptedText } };
    return await client.runs.wait(tmpThreadId, assistantId, {
      input,
      config,
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
    input.refreshAssistants();
  };

  const updateAssistantMetadata = async (
    assistantId: string,
    fields: {
      metadata: Record<string, any>;
    }
  ) => {
    const client = createClient();
    const updatedAssistant = await client.assistants.update(
      assistantId,
      fields
    );
    input.refreshAssistants();
    return updatedAssistant;
  };

  const ensureAssistantIsTiedToUser = async (userId: string) => {
    if (!assistantId || !getCookie(USER_TIED_TO_ASSISTANT)) return;
    const client = createClient();
    const currentAssistant = await client.assistants.get(assistantId);
    if (currentAssistant.metadata && "userId" in currentAssistant.metadata) {
      setCookie(USER_TIED_TO_ASSISTANT, "true");
      return;
    }
    // Update assistant metadata to include userId
    await updateAssistantMetadata(assistantId, {
      metadata: { userId },
    });
    setCookie(USER_TIED_TO_ASSISTANT, "true");
  };

  return {
    assistantId,
    setAssistantId: updateAssistant,
    streamMessage,
    sendMessage,
    createAssistant,
    isGetAssistantsLoading,
    getAssistantsByUserId,
    updateAssistantMetadata,
  };
}
