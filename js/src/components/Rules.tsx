"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
import { getCookie } from "@/lib/cookies";
import { ASSISTANT_ID_COOKIE } from "@/constants";
import { Button } from "./ui/button";

export function Rules() {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<{
    styleRules: string[];
    contentRules: string[];
  } | null>(null);

  async function getRules(assistantId: string) {
    const response = await fetch("/api/rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assistantId }),
    });

    const data = await response.json();
    if (data?.styleRules?.length || data?.contentRules?.length) {
      console.log("gots rules", data);
      setRules(data);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (rules?.contentRules || rules?.styleRules) return;

    const assistantId =
      process.env.NEXT_PUBLIC_ASSISTANT_ID ?? getCookie(ASSISTANT_ID_COOKIE);

    if (assistantId) {
      void getRules(assistantId);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div
          onClick={() => setOpen(true)}
          className="fixed top-4 right-4 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-sm transition-colors duration-200 cursor-pointer flex items-center space-x-2"
        >
          <p className="text-sm">Rules</p>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-xl p-6 bg-white rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-semibold text-gray-800">
            Rules
          </DialogTitle>
          <DialogDescription className="mt-2 text-md text-gray-600">
            {rules
              ? "Below are the current rules generated by the assistant to be used when generating tweets."
              : "No rules have been generated yet. Follow the steps below to generate rules."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {rules ? (
            <>
              {rules.styleRules.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-medium text-gray-700 sticky top-0 bg-white py-2 mb-3">
                    Style Rules:
                  </h2>
                  <ul className="list-disc list-inside space-y-2">
                    {rules.styleRules.map((rule, index) => (
                      <li key={index} className="text-gray-600">
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rules.contentRules.length > 0 && (
                <div>
                  <h2 className="text-xl font-medium text-gray-700 sticky top-0 bg-white py-2 mb-3">
                    Content Rules:
                  </h2>
                  <ul className="list-disc list-inside space-y-2">
                    {rules.contentRules.map((rule, index) => (
                      <li key={index} className="text-gray-600">
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">To generate rules:</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Ask the assistant to generate a tweet</li>
                <li>Revise & save, or copy the generated tweet</li>
                <li>This will trigger rule generation</li>
              </ol>
              <p className="text-gray-600">
                Once rules are generated, they will appear here.{" "}
                <p className="text-gray-500 text-sm">
                  (You may need to refresh the page first)
                </p>{" "}
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => setOpen(false)}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded shadow transition"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
