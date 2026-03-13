import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import PageHeader from "@/components/dkp/PageHeader";

export default function Rules() {
  const { data: settings = [] } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPublicSettings", {});
      return res.data?.settings || [];
    },
  });

  const rulesText = settings.find((s) => s.key === "rules_text")?.value || "";

  return (
    <div>
      <PageHeader title="Guild Rules" subtitle="DKP system rules and guidelines" icon={BookOpen} />

      <div className="bg-[#111827] rounded-xl border border-white/5 p-6 sm:p-8">
        {rulesText ? (
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-gray-300 prose-strong:text-amber-400 prose-a:text-amber-400">
            <ReactMarkdown>{rulesText}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No rules have been published yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}