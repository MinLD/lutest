import type { Request, Response } from "express";
import type { GraphResponse } from "@lutest/contracts";
import { graphService } from "./graph.service";

export const graphController = {
  async getGraph(_req: Request, res: Response<GraphResponse>): Promise<void> {
    const graph = await graphService.getGraph();
    res.json(graph);
  },
};
