import React from "react";
import CheckinsClientPage from "./CheckinsClientPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GPS Check-ins Dashboard",
};

export default function DepartmentCheckinsPage() {
  return <CheckinsClientPage />;
}
