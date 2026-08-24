"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { PeopleAvatar } from "@/components/people/PeoplePrimitives";
import {
  PersonalSettingsAccessBoundary,
  PersonalSettingsPageShell,
} from "@/components/settings/AccountSettingsShell";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { PersonalProfile } from "@/data/client-account-settings";
import {
  prototypeCustomerPersonId,
  prototypeFreelancerPersonId,
  prototypeStudioPersonId,
  type Person,
  type PersonAvailability,
  type PersonProfileUpdate,
  type PersonType,
} from "@/data/people";

const timezoneOptions = [
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane" },
  { value: "Australia/Perth", label: "Australia/Perth" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland" },
  { value: "Europe/London", label: "Europe/London" },
] as const;

const availabilityOptions: ReadonlyArray<{ value: PersonAvailability; label: string }> = [
  { value: "Available", label: "Available" },
  { value: "Busy", label: "Busy" },
  { value: "Away", label: "Away" },
];

export function PersonalProfilePage() {
  const { selectedRole } = usePrototypeRole();
  const { account, access, saveProfile } = useClientAccountSettings();
  const { people, updatePersonIdentity } = usePeople();
  const customer = people.find((person) => person.id === prototypeCustomerPersonId) ?? null;
  const freelancer = people.find((person) => person.id === prototypeFreelancerPersonId) ?? null;
  const studioMember = people.find((person) => person.id === prototypeStudioPersonId) ?? null;

  if (selectedRole === "Studio Staff" && !studioMember) {
    throw new Error("The prototype Studio Staff profile is missing from People");
  }
  if (selectedRole === "Studio Freelancer" && !freelancer) {
    throw new Error("The prototype Freelancer profile is missing from People");
  }
  if (selectedRole === "Customer" && !customer) {
    throw new Error("The prototype Client profile is missing from People");
  }

  return (
    <PersonalSettingsAccessBoundary>
      <PersonalSettingsPageShell
        title="My profile"
        description="Manage the personal details used across Brisk."
      >
        {selectedRole === "Studio Staff" && studioMember ? (
          <>
            <PersonalProfileForm
              personType="Team"
              showClientMembership={false}
              studioName="North Star Films"
              value={profileFromPerson(studioMember)}
              onSave={(profile) => updatePersonIdentity(studioMember.id, {
                name: profile.fullName,
                avatarUrl: profile.photoUrl,
                phone: profile.phoneNumber,
                timezone: profile.timezone,
              })}
            />
            <TeamMemberWorkDetailsCard person={studioMember} onSave={(update) => updatePersonIdentity(studioMember.id, update)} />
          </>
        ) : selectedRole === "Studio Freelancer" && freelancer ? (
          <>
            <PersonalProfileForm
              personType="Freelancer"
              showClientMembership={false}
              studioName="North Star Films"
              value={profileFromPerson(freelancer)}
              onSave={(profile) => updatePersonIdentity(freelancer.id, {
                name: profile.fullName,
                avatarUrl: profile.photoUrl,
                phone: profile.phoneNumber,
                timezone: profile.timezone,
              })}
            />
            <FreelancerWorkDetailsCard person={freelancer} onSave={(update) => updatePersonIdentity(freelancer.id, update)} />
          </>
        ) : selectedRole === "Customer" && customer ? (
          <>
            <PersonalProfileForm
              companyName={account.company.name}
              roleLabel={access.role}
              studioName="North Star Films"
              value={profileFromPerson(customer)}
              onSave={(profile) => updatePersonIdentity(customer.id, {
                name: profile.fullName,
                avatarUrl: profile.photoUrl,
                phone: profile.phoneNumber,
                timezone: profile.timezone,
              })}
            />
            <ClientContactWorkDetailsCard person={customer} onSave={(update) => updatePersonIdentity(customer.id, update)} />
          </>
        ) : (
          <PersonalProfileForm
            companyName={account.company.name}
            roleLabel={access.role}
            studioName="North Star Films"
            value={account.profile}
            onSave={saveProfile}
          />
        )}
      </PersonalSettingsPageShell>
    </PersonalSettingsAccessBoundary>
  );
}

export function PersonalProfileForm({
  companyName,
  onSave,
  personType = "Client contact",
  roleLabel,
  showClientMembership = true,
  studioName,
  value,
}: {
  companyName?: string;
  onSave: (profile: PersonalProfile) => void;
  personType?: PersonType;
  roleLabel?: string;
  showClientMembership?: boolean;
  studioName: string;
  value: PersonalProfile;
}) {
  const [draft, setDraft] = useState<PersonalProfile>(() => ({ ...value }));
  const [toast, setToast] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(value), [draft, value]);

  useEffect(() => setDraft({ ...value }), [value]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;
      setDraft((current) => ({ ...current, photoUrl: reader.result as string }));
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({ ...draft });
    setToast("Your profile was updated.");
  };

  return (
    <section className="account-settings-card account-profile-card" aria-label="Personal profile">
      <form onSubmit={submit}>
        <section className="account-profile-photo-section" aria-labelledby="profile-photo-heading">
          <div className="account-profile-avatar">
            <PeopleAvatar
              person={{ avatarUrl: draft.photoUrl, name: draft.fullName, type: personType }}
              size="L"
            />
          </div>
          <div className="account-profile-photo-copy">
            <h2 className="headings-xs-bold" id="profile-photo-heading">Profile photo</h2>
            <div className="account-settings-inline-actions">
              <input
                className="sr-only"
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={uploadPhoto}
              />
              <Button size="S" type="button" variant="secondary" onClick={() => photoInputRef.current?.click()}>
                <span className="account-settings-button-content">
                  <DsIcon name="upload-simple" size={16} />
                  {draft.photoUrl ? "Replace photo" : "Upload photo"}
                </span>
              </Button>
              {draft.photoUrl ? (
                <Button size="S" type="button" variant="ghost" onClick={() => setDraft((current) => ({ ...current, photoUrl: null }))}>
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="account-profile-contact-section" aria-labelledby="profile-contact-heading">
          <h2 className="headings-xs-bold" id="profile-contact-heading">Contact details</h2>

          <div className="account-settings-field-grid">
            <Input
              label="Full name"
              value={draft.fullName}
              onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
            />
            <Input
              label="Phone number"
              type="tel"
              value={draft.phoneNumber}
              onChange={(event) => setDraft((current) => ({ ...current, phoneNumber: event.target.value }))}
            />
            <label className="account-settings-select-field">
              <span className="label-m-semibold">Personal timezone</span>
              <BriskSelect
                ariaLabel="Personal timezone"
                clearable={false}
                options={timezoneOptions}
                placeholder="Choose timezone"
                searchable
                value={draft.timezone}
                onChange={(timezone) => setDraft((current) => ({ ...current, timezone }))}
              />
            </label>
          </div>

          <dl className="account-settings-readonly-grid">
            <div>
              <dt className="label-xs">Sign-in email</dt>
              <dd className="label-m-semibold">{draft.signInEmail}</dd>
            </div>
            {showClientMembership ? (
              <>
                <div>
                  <dt className="label-xs">Current role</dt>
                  <dd className="label-m-semibold">{roleLabel}</dd>
                </div>
                <div>
                  <dt className="label-xs">Client company</dt>
                  <dd className="label-m-semibold">{companyName}</dd>
                </div>
              </>
            ) : null}
            <div>
              <dt className="label-xs">Studio</dt>
              <dd className="label-m-semibold">{studioName}</dd>
            </div>
          </dl>
        </section>

        <div className="account-settings-form-actions">
          <Button size="M" type="button" variant="secondary" onClick={() => setDraft({ ...value })}>
            Discard changes
          </Button>
          <Button size="M" type="submit">Save changes</Button>
        </div>
      </form>

      {toast ? (
        <div className="account-settings-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={16} />
          {toast}
        </div>
      ) : null}
      {!hasChanges ? <span className="sr-only">All profile changes are saved.</span> : null}
    </section>
  );
}

function TeamMemberWorkDetailsCard({
  onSave,
  person,
}: {
  onSave: (update: PersonProfileUpdate) => void;
  person: Person;
}) {
  const savedDetails = useMemo(() => ({
    primaryRole: person.jobTitles[0] ?? "",
    skills: person.skills.join(", "),
    styles: person.styles.join(", "),
    portfolioUrl: person.portfolioUrl,
    availability: person.availability ?? "Available",
    location: person.location,
  }), [person.availability, person.jobTitles, person.location, person.portfolioUrl, person.skills, person.styles]);
  const [draft, setDraft] = useState(savedDetails);
  const [toast, setToast] = useState<string | null>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedDetails), [draft, savedDetails]);

  useEffect(() => setDraft(savedDetails), [savedDetails]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      jobTitles: [draft.primaryRole.trim() || "Team Member"],
      skills: toProfileList(draft.skills),
      styles: toProfileList(draft.styles),
      portfolioUrl: draft.portfolioUrl.trim(),
      availability: draft.availability,
      location: draft.location.trim(),
    });
    setToast("Your work details were updated.");
  };

  return (
    <section className="account-settings-card account-work-details-card" aria-labelledby="team-work-details-heading">
      <form onSubmit={submit}>
        <header className="account-settings-card-heading">
          <span><DsIcon name="film-slate" size={20} /></span>
          <div>
            <h2 className="headings-xs-bold" id="team-work-details-heading">Work details</h2>
            <p className="paragraph-s">Keep the professional details your Studio uses for project work up to date.</p>
          </div>
        </header>

        <dl className="account-settings-readonly-grid account-work-readonly-grid">
          <div>
            <dt className="label-xs">Worker type</dt>
            <dd className="label-m-semibold">Team Member</dd>
          </div>
          <div>
            <dt className="label-xs">Department</dt>
            <dd className="label-m-semibold">{person.department || "Not assigned"}</dd>
          </div>
          <div>
            <dt className="label-xs">Weekly capacity</dt>
            <dd className="label-m-semibold">{person.weeklyCapacityHours ? `${person.weeklyCapacityHours} hours` : "Not set"}</dd>
          </div>
        </dl>

        <section className="account-work-details-section" aria-labelledby="team-professional-profile-heading">
          <h3 className="label-m-semibold" id="team-professional-profile-heading">Professional profile</h3>
          <div className="account-settings-field-grid">
            <Input
              label="Primary role"
              value={draft.primaryRole}
              onChange={(event) => setDraft((current) => ({ ...current, primaryRole: event.target.value }))}
            />
            <label className="account-settings-select-field">
              <span className="label-m-semibold">Availability</span>
              <BriskSelect
                ariaLabel="Availability"
                clearable={false}
                options={availabilityOptions}
                placeholder="Choose availability"
                searchable={false}
                value={draft.availability}
                onChange={(availability) => availability && setDraft((current) => ({ ...current, availability }))}
              />
            </label>
            <Input
              label="Location"
              value={draft.location}
              onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
            />
            <Input
              label="Portfolio or reel"
              type="url"
              placeholder="https://"
              value={draft.portfolioUrl}
              onChange={(event) => setDraft((current) => ({ ...current, portfolioUrl: event.target.value }))}
            />
            <Input
              label="Skills and specialties"
              hint="Separate skills with commas"
              value={draft.skills}
              onChange={(event) => setDraft((current) => ({ ...current, skills: event.target.value }))}
            />
            <Input
              label="Styles and genres"
              hint="Separate styles with commas"
              value={draft.styles}
              onChange={(event) => setDraft((current) => ({ ...current, styles: event.target.value }))}
            />
          </div>
        </section>

        <div className="account-settings-info-block">
          <DsIcon name="info" size={18} />
          <p className="paragraph-s">Studio Owners and Admins control your department, weekly capacity, worker type and Studio access.</p>
        </div>

        <div className="account-settings-form-actions">
          <Button size="M" type="button" variant="secondary" onClick={() => setDraft(savedDetails)}>Discard changes</Button>
          <Button size="M" type="submit">Save changes</Button>
        </div>
      </form>

      {toast ? <div className="account-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
      {!hasChanges ? <span className="sr-only">All work detail changes are saved.</span> : null}
    </section>
  );
}

function ClientContactWorkDetailsCard({
  onSave,
  person,
}: {
  onSave: (update: PersonProfileUpdate) => void;
  person: Person;
}) {
  const savedDetails = useMemo(() => ({
    jobTitle: person.jobTitles[0] ?? "",
    location: person.location,
  }), [person.jobTitles, person.location]);
  const [draft, setDraft] = useState(savedDetails);
  const [toast, setToast] = useState<string | null>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedDetails), [draft, savedDetails]);

  useEffect(() => setDraft(savedDetails), [savedDetails]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      jobTitles: [draft.jobTitle.trim() || "Client contact"],
      location: draft.location.trim(),
    });
    setToast("Your work details were updated.");
  };

  return (
    <section className="account-settings-card account-work-details-card" aria-labelledby="client-work-details-heading">
      <form onSubmit={submit}>
        <header className="account-settings-card-heading">
          <span><DsIcon name="users-three" size={20} /></span>
          <div>
            <h2 className="headings-xs-bold" id="client-work-details-heading">Work details</h2>
            <p className="paragraph-s">Keep the details North Star Films uses when working with you up to date.</p>
          </div>
        </header>

        <div className="account-settings-field-grid">
          <Input
            label="Job title"
            value={draft.jobTitle}
            onChange={(event) => setDraft((current) => ({ ...current, jobTitle: event.target.value }))}
          />
          <Input
            label="Location"
            value={draft.location}
            onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
          />
        </div>

        <div className="account-settings-info-block">
          <DsIcon name="info" size={18} />
          <p className="paragraph-s">Your Client role and project access are managed separately by your Client Admin and North Star Films.</p>
        </div>

        <div className="account-settings-form-actions">
          <Button size="M" type="button" variant="secondary" onClick={() => setDraft(savedDetails)}>
            Discard changes
          </Button>
          <Button size="M" type="submit">Save changes</Button>
        </div>
      </form>

      {toast ? (
        <div className="account-settings-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={16} />
          {toast}
        </div>
      ) : null}
      {!hasChanges ? <span className="sr-only">All work detail changes are saved.</span> : null}
    </section>
  );
}

function FreelancerWorkDetailsCard({
  onSave,
  person,
}: {
  onSave: (update: PersonProfileUpdate) => void;
  person: Person;
}) {
  const savedDetails = useMemo(() => ({
    primaryDiscipline: person.jobTitles[0] ?? "",
    skills: person.skills.join(", "),
    styles: person.styles.join(", "),
    portfolioUrl: person.portfolioUrl,
    availability: person.availability ?? "Available",
    businessName: person.businessName ?? "",
    taxNumber: person.taxNumber ?? "",
    location: person.location,
  }), [
    person.availability,
    person.businessName,
    person.jobTitles,
    person.location,
    person.portfolioUrl,
    person.skills,
    person.styles,
    person.taxNumber,
  ]);
  const [draft, setDraft] = useState(savedDetails);
  const [toast, setToast] = useState<string | null>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedDetails), [draft, savedDetails]);

  useEffect(() => setDraft(savedDetails), [savedDetails]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      jobTitles: [draft.primaryDiscipline.trim() || "Freelancer"],
      skills: toProfileList(draft.skills),
      styles: toProfileList(draft.styles),
      portfolioUrl: draft.portfolioUrl.trim(),
      availability: draft.availability,
      businessName: draft.businessName.trim(),
      taxNumber: draft.taxNumber.trim(),
      location: draft.location.trim(),
    });
    setToast("Your work details were updated.");
  };

  return (
    <section className="account-settings-card account-work-details-card" aria-labelledby="work-details-heading">
      <form onSubmit={submit}>
        <header className="account-settings-card-heading">
          <span><DsIcon name="film-slate" size={20} /></span>
          <div>
            <h2 className="headings-xs-bold" id="work-details-heading">Work details</h2>
            <p className="paragraph-s">Keep the professional details your Studio uses for project work up to date.</p>
          </div>
        </header>

        <dl className="account-settings-readonly-grid account-work-readonly-grid">
          <div>
            <dt className="label-xs">Worker type</dt>
            <dd className="label-m-semibold">Freelancer</dd>
          </div>
        </dl>

        <section className="account-work-details-section" aria-labelledby="professional-profile-heading">
          <h3 className="label-m-semibold" id="professional-profile-heading">Professional profile</h3>
          <div className="account-settings-field-grid">
            <Input
              label="Primary role or discipline"
              value={draft.primaryDiscipline}
              onChange={(event) => setDraft((current) => ({ ...current, primaryDiscipline: event.target.value }))}
            />
            <label className="account-settings-select-field">
              <span className="label-m-semibold">Availability</span>
              <BriskSelect
                ariaLabel="Availability"
                clearable={false}
                options={availabilityOptions}
                placeholder="Choose availability"
                searchable={false}
                value={draft.availability}
                onChange={(availability) => availability && setDraft((current) => ({ ...current, availability }))}
              />
            </label>
            <Input
              label="Location"
              value={draft.location}
              onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
            />
            <Input
              label="Portfolio or reel"
              type="url"
              placeholder="https://"
              value={draft.portfolioUrl}
              onChange={(event) => setDraft((current) => ({ ...current, portfolioUrl: event.target.value }))}
            />
            <Input
              label="Skills and specialties"
              hint="Separate skills with commas"
              value={draft.skills}
              onChange={(event) => setDraft((current) => ({ ...current, skills: event.target.value }))}
            />
            <Input
              label="Styles and genres"
              hint="Separate styles with commas"
              value={draft.styles}
              onChange={(event) => setDraft((current) => ({ ...current, styles: event.target.value }))}
            />
          </div>
        </section>

        <section className="account-work-details-section" aria-labelledby="business-details-heading">
          <h3 className="label-m-semibold" id="business-details-heading">Business details</h3>
          <div className="account-settings-field-grid">
            <Input
              label="Business or trading name"
              hint="Optional"
              value={draft.businessName}
              onChange={(event) => setDraft((current) => ({ ...current, businessName: event.target.value }))}
            />
            <Input
              label="ABN or tax number"
              hint="Optional"
              value={draft.taxNumber}
              onChange={(event) => setDraft((current) => ({ ...current, taxNumber: event.target.value }))}
            />
          </div>
        </section>

        <div className="account-settings-info-block">
          <DsIcon name="info" size={18} />
          <p className="paragraph-s">Studio Staff control worker type and Studio membership because they affect pricing and expense handling.</p>
        </div>

        <div className="account-settings-form-actions">
          <Button size="M" type="button" variant="secondary" onClick={() => setDraft(savedDetails)}>
            Discard changes
          </Button>
          <Button size="M" type="submit">Save changes</Button>
        </div>
      </form>

      {toast ? (
        <div className="account-settings-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={16} />
          {toast}
        </div>
      ) : null}
      {!hasChanges ? <span className="sr-only">All work detail changes are saved.</span> : null}
    </section>
  );
}

function profileFromPerson(person: Person): PersonalProfile {
  return {
    fullName: person.name,
    signInEmail: person.email,
    phoneNumber: person.phone,
    photoUrl: person.avatarUrl,
    timezone: person.timezone,
  };
}

function toProfileList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
