import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PageNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center mb-6">
        <Trophy className="w-8 h-8 text-amber-400" />
      </div>
      <h1 className="text-4xl font-bold text-white mb-2">404</h1>
      <p className="text-gray-500 mb-6">This page doesn't exist in our guild records.</p>
      <Link to={createPageUrl("Leaderboard")}>
        <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leaderboard
        </Button>
      </Link>
    </div>
  );
}