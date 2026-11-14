import { Panel } from "@/components/ui/Panel";

const notes = [
  "Identity verification reminder — action required",
  "Document vault ready for encrypted upload",
  "Approved communication: no partner contact outside portal",
];

export const metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Notifications</h1>
      {notes.map((note) => (
        <Panel key={note}>
          <div className="text-sm text-white">{note}</div>
        </Panel>
      ))}
    </div>
  );
}
