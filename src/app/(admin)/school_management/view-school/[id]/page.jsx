"use client";
import React from "react";
import PageHeader from "@/components/PageHeader";
import { useParams } from "next/navigation";

function Page() {
  const { id } = useParams();
  return (
    <div className="space-y-6">
      <PageHeader
        HeaderText={`School Details - ID: ${id}`}
        SubHeaderText="View and manage the details of the selected school."
      />
    </div>
  );
}

export default Page;
