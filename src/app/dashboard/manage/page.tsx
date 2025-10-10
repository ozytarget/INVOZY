import { SettingsForm } from "@/components/manage/settings-form";

export default function ManagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Manage Settings</h1>
        <p className="text-muted-foreground text-sm">Update your company and personal information here.</p>
      </div>
      <SettingsForm />
    </div>
  );
}
