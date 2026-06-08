import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

export default function SyncDKPPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const queryClient = useQueryClient();

  const runSync = async () => {
    setConfirmOpen(false);
    setRunning(true);
    setReport(null);
    try {
      const res = await base44.functions.invoke("syncPlayerDKP", {});
      const data = res?.data || res;
      setReport(data);
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success(`Sync abgeschlossen: ${data.players_updated} von ${data.players_processed} Spielern korrigiert`);
    } catch (err) {
      toast.error(err?.message || "Sync fehlgeschlagen");
    } finally {
      setRunning(false);
    }
  };

  const diffs = report?.diffs || [];

  return (
    <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-400" /> DKP neu berechnen
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Synchronisiert <span className="text-gray-200">total_dkp</span> und <span className="text-gray-200">dkp_spent</span> aller Spieler mit den DKPTransaktionen. Listet anschließend alle gefundenen Differenzen auf.
          </p>
        </div>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={running}
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${running ? "animate-spin" : ""}`} />
          {running ? "Läuft..." : "Jetzt neu berechnen"}
        </Button>
      </div>

      {report && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-white">
              <span className="font-semibold text-emerald-400">{report.players_updated}</span>{" "}
              von <span className="font-semibold">{report.players_processed}</span> Spielern korrigiert
            </span>
          </div>

          {diffs.length === 0 ? (
            <div className="text-xs text-gray-400">Keine Differenzen — alle Spielerwerte sind synchron. ✨</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/20">
              <table className="w-full text-xs">
                <thead className="bg-white/5 text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Spieler</th>
                    <th className="text-right px-3 py-2 font-medium">total_dkp alt</th>
                    <th className="text-right px-3 py-2 font-medium">total_dkp neu</th>
                    <th className="text-right px-3 py-2 font-medium">Δ total</th>
                    <th className="text-right px-3 py-2 font-medium">dkp_spent alt</th>
                    <th className="text-right px-3 py-2 font-medium">dkp_spent neu</th>
                    <th className="text-right px-3 py-2 font-medium">Δ spent</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d, i) => (
                    <tr key={i} className="border-t border-white/5 text-gray-200">
                      <td className="px-3 py-2 font-medium">{d.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-400">{d.old_total}</td>
                      <td className="px-3 py-2 text-right font-mono">{d.new_total}</td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${d.total_diff > 0 ? "text-emerald-400" : d.total_diff < 0 ? "text-red-400" : "text-gray-500"}`}>
                        {d.total_diff > 0 ? "+" : ""}{d.total_diff}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-400">{d.old_spent}</td>
                      <td className="px-3 py-2 text-right font-mono">{d.new_spent}</td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${d.spent_diff > 0 ? "text-emerald-400" : d.spent_diff < 0 ? "text-red-400" : "text-gray-500"}`}>
                        {d.spent_diff > 0 ? "+" : ""}{d.spent_diff}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirmOpen(false)}>
          <div className="bg-[#111827] border border-white/10 rounded-xl p-5 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-white">DKP-Werte aller Spieler neu berechnen?</h4>
                <p className="text-sm text-gray-400 mt-1">
                  Liest alle DKPTransaktionen, berechnet <span className="text-gray-200">total_dkp</span> und <span className="text-gray-200">dkp_spent</span> neu und schreibt Korrekturen zurück. Diese Aktion kann einige Sekunden dauern.
                </p>
              </div>
              <button onClick={() => setConfirmOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} className="bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:text-white">
                Abbrechen
              </Button>
              <Button onClick={runSync} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <RefreshCw className="w-4 h-4 mr-1" /> Jetzt starten
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}