import React, { useState } from "react";
import PreviewShell from "@/components/designPreview/PreviewShell";
import LeaderboardPreview from "@/components/designPreview/LeaderboardPreview";
import AuctionPreview from "@/components/designPreview/AuctionPreview";
import AdminPreview from "@/components/designPreview/AdminPreview";

export default function DesignPreview() {
  const [view, setView] = useState("leaderboard");

  return (
    <PreviewShell view={view} onViewChange={setView}>
      {view === "leaderboard" && <LeaderboardPreview />}
      {view === "auction" && <AuctionPreview />}
      {view === "admin" && <AdminPreview />}
    </PreviewShell>
  );
}