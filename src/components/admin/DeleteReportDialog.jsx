import React from "react";
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
import { useTranslation } from "@/lib/i18n";

export default function DeleteReportDialog({ open, onOpenChange, hasScreenshot, onConfirm }) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#1a1e27] border-white/10 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{t("adminReports.deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {hasScreenshot ? t("adminReports.deleteConfirmScreenshot") : t("adminReports.deleteConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          >
            {t("adminReports.deleteAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}