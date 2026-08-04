"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function IncidentTasksAliasRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/incidents/${params.id}/incident-tasks`);
    }
  }, [params, router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="size-8 animate-spin text-emerald-500" />
      <p className="text-xs font-semibold">Redirecting to Incident Tasks Checklist...</p>
    </div>
  );
}
