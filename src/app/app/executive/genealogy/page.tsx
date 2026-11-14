import { GenealogyWorkspace } from "@/components/portals/GenealogyWorkspace";

export const metadata = { title: "Forensic Genealogy" };

export default function GenealogyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Forensic genealogy workspace</h1>
        <p className="mt-2 text-sm text-silver">
          Competitive expansion #6 — research board with contradiction tracking. Not a legal determination engine.
        </p>
      </div>
      <GenealogyWorkspace />
    </div>
  );
}
