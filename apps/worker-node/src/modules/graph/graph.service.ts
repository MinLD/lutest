import type { GraphResponse } from "@lutest/contracts";
import { graphMapper } from "./graph.mapper";

export const graphService = {
  async getGraph(): Promise<GraphResponse> {
    return graphMapper.toInitialGraph({
      generatedAt: new Date().toISOString(),
    });
  },
};
