import React from "react";
import AdminSessionGuard from "./AdminSessionGuard";

export default function AdminGuard({ children }) {
  return (
    <AdminSessionGuard>
      {children}
    </AdminSessionGuard>
  );
}