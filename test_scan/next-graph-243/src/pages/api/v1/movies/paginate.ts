import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json([
    { id: "m1", title: "Movie One" },
    { id: "m2", title: "Movie Two" },
  ]);
}
