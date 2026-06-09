import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Send, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import DKPValue from "@/components/dkp/DKPValue";
import DiscordPreviewModal from "@/components/dkp/DiscordPreviewModal";

export default function ConfirmedAuctionResults({ auction, channelId }) {
  const { t } = useTranslation();
  const [showDiscordPreview, setShowDiscordPreview] = useState(false);

  // Derive a human-readable "why this rank" badge from the stored AuctionResult.
  // The tiebreaker_note already encodes Fixed / ReservedNext / Tiebreak / Fallback / Random.
  const reasonInfo = (r, note, isFixed, isReserved) => {
    if (isFixed) {
      return { label: `📌 ${note.replace(/^Fixed:\s*/, t("auctionResults.reasonFixed") + ": ")}`, cls: "text-amber-400 bg-amber-500/10 border border-amber-500/20" };
    }
    if (isReserved) {
      const rest = note.replace(/^ReservedNext:\s*/, "").trim();
      return { label: `🔄 ${t("auctionResults.reasonReserved")}${rest ? " · " + rest : ""}`, cls: "text-blue-400 bg-blue-500/10 border border-blue-500/20" };
    }
    if (r.is_friendly_zone) {
      return { label: `🤝 ${t("auctionResults.reasonFriendlyZone")}`, cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" };
    }
    if (note.startsWith("Tiebreak")) {
      return { label: `⚖ ${note}`, cls: "text-purple-400 bg-purple-500/10 border border-purple-500/20" };
    }
    if (note.startsWith("Fallback")) {
      return { label: note, cls: "text-blue-400 bg-blue-500/10 border border-blue-500/20" };
    }
    if (note.startsWith("Random")) {
      return { label: note, cls: "text-orange-400 bg-orange-500/10 border border-orange-500/20" };
    }
    if (note) {
      return { label: note, cls: "text-purple-400 bg-purple-500/10 border border-purple-500/20" };
    }
    // No note → normal highest-bid winner
    return { label: t("auctionResults.reasonHighestBid"), cls: "text-gray-500" };
  };

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["auction-results", auction.id],
    queryFn: () => base44.entities.AuctionResult.filter({ auction_id: auction.id }, "rank", 100),
  });

  // Rebuild the results embed from stored AuctionResult records (same format as on confirm)
  const buildEmbed = () => {
    const resultsPageUrl = "https://mge.era003.com/Results";
    const lines = results.map((r) => {
      const isFixed = typeof r.tiebreaker_note === "string" && r.tiebreaker_note.startsWith("Fixed:");
      let line = `${r.rank}. **${r.player_name}**`;
      if (isFixed) {
        line += ` 📌 _(${r.tiebreaker_note})_`;
      } else {
        line += ` — ${r.dkp_bid || 0} DKP`;
        if (r.target_score) line += ` | Target: ${r.target_score.toLocaleString()}`;
        if (r.hero_medals) line += ` | Medals: ${r.hero_medals}`;
        if (r.is_friendly_zone) line += ` 🤝 _(Friendly Zone)_`;
        if (r.tiebreaker_note) line += ` _(${r.tiebreaker_note})_`;
      }
      return line;
    }).join("\n");

    const fields = [
      { name: `Winners (Top ${results.length})`, value: lines || "No results", inline: false },
      { name: "Total Participants", value: String(results.length), inline: true },
      { name: "🔗 Link", value: `[View Results](${resultsPageUrl})`, inline: false },
    ];

    return {
      title: "🏆 Auction Results Ready",
      description: auction.title,
      color: 0x10b981,
      url: resultsPageUrl,
      fields,
      footer: { text: "DKP System" },
    };
  };

  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> {t("results.title")}
        </p>
        {results.length > 0 && (
          <Button
            size="sm"
            onClick={() => setShowDiscordPreview(true)}
            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs"
          >
            <Send className="w-3.5 h-3.5 mr-1" /> {t("auctionResults.resend")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-3">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : results.length === 0 ? (
        <p className="text-xs text-gray-500 py-2">{t("results.noResults")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">{t("results.columns.rank")}</th>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">{t("results.columns.player")}</th>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">{t("results.columns.dkpBid")}</th>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">{t("results.columns.medals")}</th>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">{t("results.columns.targetScore")}</th>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-400 uppercase">{t("auctionResults.rankReason")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results.map((r) => {
                const note = typeof r.tiebreaker_note === "string" ? r.tiebreaker_note : "";
                const isFixed = note.startsWith("Fixed:");
                const isReserved = note.startsWith("ReservedNext:");
                const reason = reasonInfo(r, note, isFixed, isReserved);
                return (
                  <tr key={r.id} className={isFixed ? "bg-amber-500/5" : isReserved ? "bg-blue-500/5" : r.is_friendly_zone ? "bg-emerald-500/5" : ""}>
                    <td className="px-2 py-1.5">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        r.rank <= 3 ? "bg-amber-500/20 text-amber-400" : "bg-gray-700/50 text-gray-400"
                      }`}>
                        {r.rank}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-sm text-white">
                      {r.player_name}
                      {r.is_friendly_zone && <span className="ml-2 text-xs text-emerald-400">🤝</span>}
                    </td>
                    <td className="px-2 py-1.5">
                      {isFixed ? <span className="text-xs text-gray-500">—</span> : <DKPValue value={r.dkp_bid || 0} size="sm" />}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-400 hidden sm:table-cell">{r.hero_medals ?? "—"}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-400 font-mono hidden sm:table-cell">{r.target_score ? r.target_score.toLocaleString() : "—"}</td>
                    <td className="px-2 py-1.5">
                      {reason ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded inline-block max-w-[280px] truncate align-middle ${reason.cls}`} title={reason.label}>
                          {reason.label}
                        </span>
                      ) : <span className="text-xs text-gray-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showDiscordPreview && (
        <DiscordPreviewModal
          embed={buildEmbed()}
          channelId={channelId}
          onClose={() => setShowDiscordPreview(false)}
          onSent={() => {}}
        />
      )}
    </div>
  );
}