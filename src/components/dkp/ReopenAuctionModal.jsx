import React, { useState } from "react";
import { X, RotateCcw, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ReopenAuctionModal({ auction, onClose, onConfirm }) {
  const [newClose, setNewClose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!newClose) return;
    setSubmitting(true);
    try {
      await onConfirm(auction, newClose);
      onClose();
    } catch (err) {
      console.error("Reopen failed:", err);
      setSubmitting(false);
    }
  };

  // Minimum: now (UTC, formatted for datetime-local input)
  const nowMin = new Date().toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-400" /> Reopen Auction
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-white font-semibold text-sm mb-1">"{auction.title}"</p>
          <p className="text-gray-400 text-xs">
            Status: <span className="text-red-400 font-medium">closed</span> → <span className="text-emerald-400 font-medium">open</span>
          </p>
        </div>

        <div>
          <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> New End Date / Time (UTC)
          </Label>
          <Input
            type="datetime-local"
            value={newClose}
            min={nowMin}
            onChange={(e) => setNewClose(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            The auction will reopen and close automatically at this time.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 border-white/10 text-gray-400 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!newClose || submitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            {submitting ? "Reopening..." : "Reopen"}
          </Button>
        </div>
      </div>
    </div>
  );
}