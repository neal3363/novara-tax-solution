import { GenealogyWorkspace } from "@/components/portals/GenealogyWorkspace";

export const metadata = { title: "Attorney Genealogy" };

export default function AttorneyGenealogyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Genealogy & evidence research</h1>
        <p className="mt-2 text-sm text-silver">
          Professional research workspace. Final heirship conclusions remain with qualified counsel.
        </p>
      </div>
      <GenealogyWorkspace />
    </div>
  );
}
