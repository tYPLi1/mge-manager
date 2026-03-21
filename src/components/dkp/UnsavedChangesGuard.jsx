import React, { useEffect, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UnsavedChangesGuard({ hasChanges, onSave, onDiscard, showDialog, setShowDialog }) {
  // Browser tab close / reload warning
  useEffect(() => {
    const handler = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="bg-[#111827] border border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            You have unsaved changes. Would you like to save them before leaving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onDiscard}
            className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
          >
            Discard
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onSave}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
          >
            Save Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}