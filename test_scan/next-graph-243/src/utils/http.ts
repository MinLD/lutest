import ky from "ky";
import { ofetch } from "ofetch";

export async function loadReport() {
  return ofetch("/api/report");
}

export async function healthCheck() {
  return ky.get("/api/health").json();
}
