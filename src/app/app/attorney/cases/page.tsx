import { Panel } from "@/components/ui/Panel";

export const metadata = { title: "Attorney Cases" };

export default function AttorneyCasesPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-white">Probate & heirship review</h1>
      <Panel>
        <p className="text-sm text-silver">
          Heir Agent outputs are probable graphs only. Final heirship determinations require
          professional review and cannot be automated by AI.
        </p>
      </Panel>
      <Panel gold>
        <div className="font-display text-2xl text-white">Dallas Probate — Estate asset graph</div>
        <ul className="mt-3 space-y-2 text-sm text-silver">
          <li>Governing memo: TX + Probate Property + Acquisition (draft)</li>
          <li>Contradiction queue: 2 unresolved name variants</li>
          <li>Next deadline: inventory affidavit window (synthetic)</li>
        </ul>
      </Panel>
    </div>
  );
}
