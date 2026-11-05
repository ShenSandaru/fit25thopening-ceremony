"use client";

import type { CeremonyStatus } from "@fit-expo/shared";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

type CeremonyControlsProps = {
  status: CeremonyStatus;
  busy: boolean;
  onPrepare: () => Promise<void>;
  onStart: () => Promise<void>;
  onAbort: (reason?: string) => Promise<void>;
  onReset: () => Promise<void>;
};

export function CeremonyControls({
  status,
  busy,
  onPrepare,
  onStart,
  onAbort,
  onReset,
}: CeremonyControlsProps) {
  const [confirmDialog, setConfirmDialog] = useState<"abort" | "reset" | null>(null);
  const [abortReason, setAbortReason] = useState("");

  const canPrepare = status === "WAITING" && !busy;
  const canStart = status === "READY" && !busy;
  const canAbort =
    (status === "READY" || status === "COLLECTING_ACTIVATIONS" || status === "COUNTDOWN") && !busy;
  const canReset =
    (status === "READY" ||
      status === "COLLECTING_ACTIVATIONS" ||
      status === "OPENED" ||
      status === "ABORTED") &&
    !busy;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h2 className="font-heading text-lg font-bold text-navy-blue">Ceremony Controls</h2>
      <p className="mt-1 text-xs text-slate-500">
        Control the progression of the opening ceremony. Actions strictly follow server-validated
        state transitions.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Prepare Button */}
        <button
          type="button"
          disabled={!canPrepare}
          onClick={() => void onPrepare()}
          className="flex flex-col items-start rounded-lg border border-slate-300 bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-blue disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="font-heading text-sm font-bold text-navy-blue">1. Prepare Ceremony</span>
          <span className="mt-1 text-xs text-slate-600">
            Arms the system for the ceremony. Transitions from WAITING to READY.
          </span>
        </button>

        {/* Start Activation Phase Button */}
        <button
          type="button"
          disabled={!canStart}
          onClick={() => void onStart()}
          className="flex flex-col items-start rounded-lg border border-blue-300 bg-blue-50/70 p-4 text-left transition-colors hover:bg-blue-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-blue disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="font-heading text-sm font-bold text-navy-blue">
            2. Start Activation Phase
          </span>
          <span className="mt-1 text-xs text-slate-600">
            Unlocks guest tablets to allow slide activation.
          </span>
        </button>

        {/* Reset Button (Requires Confirmation) */}
        <button
          type="button"
          disabled={!canReset}
          onClick={() => setConfirmDialog("reset")}
          className="flex flex-col items-start rounded-lg border border-amber-300 bg-amber-50/70 p-4 text-left transition-colors hover:bg-amber-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="font-heading text-sm font-bold text-amber-900">Reset Ceremony</span>
          <span className="mt-1 text-xs text-slate-600">
            Clears activations and starts a fresh run ID.
          </span>
        </button>

        {/* Abort Button (Requires Confirmation) */}
        <button
          type="button"
          disabled={!canAbort}
          onClick={() => {
            setAbortReason("");
            setConfirmDialog("abort");
          }}
          className="flex flex-col items-start rounded-lg border border-red-300 bg-red-50/70 p-4 text-left transition-colors hover:bg-red-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="font-heading text-sm font-bold text-red-900">Abort Ceremony</span>
          <span className="mt-1 text-xs text-slate-600">
            Immediately halts active countdown or activations.
          </span>
        </button>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmDialog === "reset"}
        title="Reset Ceremony Run?"
        description="Are you sure you want to reset the ceremony? This will clear all recorded guest activations, cancel any idle state, and generate a new ceremony run ID. Device sessions will remain active."
        confirmText="Yes, Reset Ceremony"
        onConfirm={async () => {
          setConfirmDialog(null);
          await onReset();
        }}
        onCancel={() => setConfirmDialog(null)}
      />

      <ConfirmDialog
        isOpen={confirmDialog === "abort"}
        title="Emergency Abort Ceremony?"
        description="Are you sure you want to abort the ceremony? The countdown or activation phase will stop immediately and the display will show the aborted screen."
        confirmText="Abort Ceremony Immediately"
        isDestructive={true}
        onConfirm={async () => {
          const reason = abortReason.trim() || undefined;
          setConfirmDialog(null);
          await onAbort(reason);
        }}
        onCancel={() => setConfirmDialog(null)}
      />
    </section>
  );
}

