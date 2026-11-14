import type { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/features/auth/require-admin";
import { parseMediaQuery } from "@/features/media/library";
import {
  toPickerMedia,
  typeFilterFor,
  type MediaAccept,
  type PickerPage,
} from "@/features/media/picker";
import {
  countUnclassifiedMedia,
  listMediaFolders,
  searchAdminMedia,
} from "@/features/media/queries";

const NO_STORE = { "Cache-Control": "no-store" };

function toAccept(value: string | null): MediaAccept {
  return value === "IMAGE" || value === "DOCUMENT" ? value : "ALL";
}

/**
 * Lecture paginée de la médiathèque pour le sélecteur universel (administration
 * seulement). Lecture pure : les associations ne changent qu'à l'enregistrement
 * du formulaire concerné, dont le service revérifie le type du média.
 */
export async function GET(request: NextRequest) {
  // Barrière réelle : proxy.ts ne couvre pas /api.
  if (!(await getCurrentAdmin())) {
    return Response.json(
      { error: "Session expirée : reconnectez-vous." },
      { status: 401, headers: NO_STORE },
    );
  }

  const params = request.nextUrl.searchParams;
  const accept = toAccept(params.get("accept"));
  const query = parseMediaQuery(params);
  // Le contexte impose le type : un paramètre « type » contraire est ignoré.
  if (accept !== "ALL") query.type = typeFilterFor(accept);
  query.vue = "tous";

  const folders = await listMediaFolders();
  const [result, unclassifiedCount] = await Promise.all([
    searchAdminMedia(query, folders),
    countUnclassifiedMedia(),
  ]);

  const body: PickerPage = {
    items: result.items.map(toPickerMedia),
    total: result.total,
    page: result.page,
    pageCount: result.pageCount,
    folders: folders.map(({ id, name, parentId, _count }) => ({
      id,
      name,
      parentId,
      mediaCount: _count.media,
    })),
    unclassifiedCount,
  };
  return Response.json(body, { headers: NO_STORE });
}
