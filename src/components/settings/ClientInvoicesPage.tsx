"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import {
  ClientInvoicesPageShell,
  ClientSettingsAccessBoundary,
} from "@/components/settings/AccountSettingsShell";
import { DsIcon } from "@/components/video-review/DsIcon";

export function ClientInvoicesPage() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <ClientSettingsAccessBoundary requireBilling>
      <ClientInvoicesPageShell>
        <section className="account-settings-info-block account-invoice-portal-message" aria-label="Stripe billing">
          <DsIcon name="lock" size={20} />
          <p className="paragraph-s">Payment details, invoice history and payments are managed securely in Stripe.</p>
          <Button size="M" onClick={() => setToast("Stripe Customer Portal would open here.")}>Manage billing in Stripe</Button>
        </section>

        {toast ? <div className="account-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
      </ClientInvoicesPageShell>
    </ClientSettingsAccessBoundary>
  );
}
