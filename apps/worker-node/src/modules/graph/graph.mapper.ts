import type { GraphResponse } from "@lutest/contracts";

const toInitialGraph = (input: { generatedAt: string }): GraphResponse => {
  return {
    generatedAt: input.generatedAt,
    nodes: [
      {
        id: "project",
        type: "project",
        label: "Current Project",
      },
      {
        id: "route-home",
        type: "route",
        label: "/",
      },
    ],
    edges: [
      {
        id: "project-route-home",
        source: "project",
        target: "route-home",
        type: "contains",
      },
    ],
  };
};

export const graphMapper = {
  toInitialGraph,
};
