export interface StatusResponse {
    status: "ok" | "error";
    uptime: number;
    service: "lutest-worker";
    runtime: "node";
}
