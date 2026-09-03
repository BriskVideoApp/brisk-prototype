"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import {
  PersonalSettingsAccessBoundary,
  PersonalSettingsPageShell,
} from "@/components/settings/AccountSettingsShell";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getAuthenticationMethodLabel } from "@/data/client-account-settings";
import { prototypeCustomerPersonId, prototypeFreelancerPersonId, prototypeStudioPersonId } from "@/data/people";

export function PersonalSecurityPage() {
  const { selectedRole } = usePrototypeRole();
  const { people } = usePeople();
  const { account, access } = useClientAccountSettings();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const isFreelancer = selectedRole === "Studio Freelancer";
  const isStudioStaff = selectedRole === "Studio Staff";
  const customer = selectedRole === "Customer" ? people.find((person) => person.id === prototypeCustomerPersonId) ?? null : null;
  const freelancer = isFreelancer ? people.find((person) => person.id === prototypeFreelancerPersonId) ?? null : null;
  const studioMember = isStudioStaff ? people.find((person) => person.id === prototypeStudioPersonId) ?? null : null;
  const authenticationMethod = isStudioStaff ? "password" : access.authenticationMethod;
  const signInEmail = studioMember?.email ?? freelancer?.email ?? customer?.email ?? account.profile.signInEmail;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <PersonalSettingsAccessBoundary>
      <PersonalSettingsPageShell
        title="Security"
        description="Review how you sign in and protect your Brisk access."
      >
        <div className="account-security-sections">
          <section className="account-settings-card account-security-card" aria-labelledby="security-sign-in-heading">
            <header className="account-settings-card-heading">
              <span><DsIcon name="lock" size={20} /></span>
              <div>
                <h2 className="headings-xs-bold" id="security-sign-in-heading">Sign-in details</h2>
              </div>
            </header>
            <dl className="account-security-details">
              <div>
                <dt className="label-xs">Sign-in email</dt>
                <dd className="label-m-semibold">{signInEmail}</dd>
              </div>
              <div>
                <dt className="label-xs">Sign-in method</dt>
                <dd className="label-m-semibold">{getAuthenticationMethodLabel(authenticationMethod)}</dd>
              </div>
            </dl>
            {authenticationMethod === "password" ? (
              <div className="account-settings-row-action">
                <div>
                  <strong className="label-m-semibold">Password</strong>
                </div>
                <Button size="S" variant="secondary" onClick={() => setPasswordModalOpen(true)}>Change password</Button>
              </div>
            ) : (
              <div className="account-settings-info-block">
                <DsIcon name="info" size={18} />
                <p className="paragraph-s">
                  Password changes are not available because you sign in with {getAuthenticationMethodLabel(authenticationMethod)}.
                </p>
              </div>
            )}
          </section>

        </div>

        {passwordModalOpen ? (
          <ChangePasswordModal
            onClose={() => setPasswordModalOpen(false)}
            onSaved={() => {
              setPasswordModalOpen(false);
              setToast("Your password was changed.");
            }}
          />
        ) : null}

        {toast ? (
          <div className="account-settings-toast label-s-semibold" role="status">
            <DsIcon name="check-circle" size={16} />
            {toast}
          </div>
        ) : null}
      </PersonalSettingsPageShell>
    </PersonalSettingsAccessBoundary>
  );
}

function ChangePasswordModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const savePassword = () => {
    if (!currentPassword || newPassword.length < 8) {
      setError("Enter your current password and a new password with at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    onSaved();
  };

  return (
    <ClientModal
      title="Change password"
      onClose={onClose}
      footer={(
        <>
          <Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="M" onClick={savePassword}>Save password</Button>
        </>
      )}
    >
      <div className="account-security-password-form">
        <Input label="Current password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        <Input label="New password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <Input label="Confirm new password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        {error ? <p className="account-settings-field-error label-xs" role="alert">{error}</p> : null}
      </div>
    </ClientModal>
  );
}
