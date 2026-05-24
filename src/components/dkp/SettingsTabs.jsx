import React from "react";
import { Settings, Settings2, Gavel } from "lucide-react";

export default function SettingsTabs({ active, onChange, t }) {
  const tabs = [
    { key: "general", label: t("admin.settings.tabGeneral") || "General", icon: Settings },
    { key: "events", label: t("admin.settings.tabEvents") || "Events", icon: Settings2 },
    { key: "auctions", label: t("admin.settings.tabAuctions") || "Auctions", icon: Gavel },
  ];

  return (
    <div className="flex gap-1 border-b border-white/5 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              isActive
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}