import { publicConfig } from "@/lib/genlayer/config";
import { apiOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  return apiOk({ config: publicConfig() });
}
