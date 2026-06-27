const fs = require("node:fs");
const path = require("node:path");

const root = path.join(process.cwd(), "fixtures", "next-graph-243");

function write(filePath, content) {
  const fullPath = path.join(root, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trimStart(), "utf8");
}

function touch(filePath, content = "export {};\n") {
  write(filePath, content);
}

fs.rmSync(root, { recursive: true, force: true });

write("package.json", `{
  "name": "next-graph-243",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "axios": "latest",
    "ky": "latest",
    "next": "latest",
    "ofetch": "latest",
    "react": "latest",
    "react-dom": "latest",
    "typescript": "^5.4.0"
  },
  "devDependencies": {}
}
`);

write("tsconfig.json", `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": true,
    "checkJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "src/**/*"],
  "exclude": ["node_modules"]
}
`);

write("next-env.d.ts", `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`);

write("src/app/page.tsx", `import { MovieGrid } from "../features/movies/MovieGrid";

export default function HomePage() {
  return (
    <main>
      <h1>Home</h1>
      <MovieGrid />
    </main>
  );
}
`);

write("src/app/movies/[id]/page.tsx", `import { MovieCard } from "../../../components/MovieCard";

type MoviePageProps = {
  params: {
    id: string;
  };
};

export default function MoviePage(props: MoviePageProps) {
  return (
    <main>
      <h1>Movie {props.params.id}</h1>
      <MovieCard title="Dynamic Movie" />
    </main>
  );
}
`);

write("src/app/watch/page.tsx", `import { listMovies } from "../../services/movie-service";

export default async function WatchPage() {
  const movies = await listMovies();
  const title = movies[0]?.title ?? "Watch";
  const description = "This page intentionally performs browser-style network behavior.";
  const enabled = true;
  const endpoint = "/api/v1/movies";
  const headers = { accept: "application/json" };
  const cacheMode: RequestCache = "no-store";
  const response = await fetch(endpoint, { headers, cache: cacheMode });
  const payload = enabled ? await response.json() : null;

  return (
    <main>
      <h1>{title}</h1>
      <p>{description}</p>
      <pre>{JSON.stringify(payload)}</pre>
    </main>
  );
}
`);

write("src/pages/dashboard.tsx", `import { MovieGrid } from "../features/movies/MovieGrid";

export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <MovieGrid />
    </main>
  );
}
`);

write("src/pages/profile/[user].jsx", `export default function ProfilePage(props) {
  const user = props.query?.user ?? "guest";

  return (
    <main>
      <h1>Profile {user}</h1>
    </main>
  );
}
`);

write("src/components/ui/Button.tsx", `import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function Button(props: ButtonProps) {
  const { children, ...rest } = props;

  return <button {...rest}>{children}</button>;
}
`);

write("src/components/MovieCard.tsx", `type MovieCardProps = {
  title: string;
};

export function MovieCard(props: MovieCardProps) {
  return (
    <article>
      <h2>{props.title}</h2>
    </article>
  );
}
`);

write("src/features/movies/MovieGrid.tsx", `import { paginateMovies } from "../../services/movie-service";
import { MovieCard } from "../../components/MovieCard";

export async function MovieGrid() {
  const movies = await paginateMovies();

  return (
    <section>
      {movies.map((movie) => (
        <MovieCard key={movie.id} title={movie.title} />
      ))}
    </section>
  );
}
`);

write("src/hooks/useAuthModal.tsx", `import { Button } from "../components/ui/Button";

export function useAuthModal() {
  return {
    element: (
      <div role="dialog" aria-label="Auth modal">
        <p>Please sign in</p>
        <Button type="button">Continue</Button>
      </div>
    ),
  };
}
`);

write("src/app/api/auth/route.ts", `import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, service: "auth" });
}
`);

write("src/pages/api/v1/movies.ts", `import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json([
    { id: "m1", title: "Movie One" },
    { id: "m2", title: "Movie Two" }
  ]);
}
`);

write("src/services/movie-service.ts", `import axios from "axios";

export type Movie = {
  id: string;
  title: string;
};

export async function listMovies(): Promise<Movie[]> {
  const response = await axios.get<Movie[]>("/api/v1/movies");
  return response.data;
}

export async function paginateMovies(): Promise<Movie[]> {
  const response = await axios.post<Movie[]>("/api/v1/movies/paginate", {
    page: 1,
    pageSize: 12,
  });

  return response.data;
}
`);

write("src/utils/http.ts", `import ky from "ky";
import { ofetch } from "ofetch";

export async function loadReport() {
  return ofetch("/api/report");
}

export async function healthCheck() {
  return ky.get("/api/health").json();
}
`);

write("src/utils/math.ts", `export function add(a: number, b: number): number {
  return a + b;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
`);

write("src/constants/config.ts", `export const APP_NAME = "Next Graph Fixture";
export const FEATURE_FLAGS = {
  graphFixture: true,
  behavioralApiDetection: true,
} as const;
`);

for (let index = 1; index <= 44; index += 1) {
  touch(
    `src/components/generated/GeneratedCard${String(index).padStart(3, "0")}.tsx`,
    `export function GeneratedCard${String(index).padStart(3, "0")}() {
  return <article>Generated component ${index}</article>;
}
`,
  );
}

for (let index = 1; index <= 45; index += 1) {
  touch(
    `src/features/generated/feature-${String(index).padStart(3, "0")}.ts`,
    `export const feature${String(index).padStart(3, "0")} = {
  id: "feature-${index}",
  enabled: ${index % 2 === 0},
};
`,
  );
}

for (let index = 1; index <= 40; index += 1) {
  touch(
    `src/utils/generated/helper-${String(index).padStart(3, "0")}.ts`,
    `export function helper${String(index).padStart(3, "0")}(value: string): string {
  return value.trim();
}
`,
  );
}

for (let index = 1; index <= 30; index += 1) {
  touch(
    `src/constants/generated/config-${String(index).padStart(3, "0")}.ts`,
    `export const config${String(index).padStart(3, "0")} = "config-${index}";
`,
  );
}

for (let index = 1; index <= 25; index += 1) {
  touch(
    `src/app/generated-page-${String(index).padStart(3, "0")}/page.tsx`,
    `export default function GeneratedPage${String(index).padStart(3, "0")}() {
  return <main>Generated page ${index}</main>;
}
`,
  );
}

for (let index = 1; index <= 20; index += 1) {
  touch(
    `src/pages/generated-page-${String(index).padStart(3, "0")}.tsx`,
    `export default function GeneratedPagesRouter${String(index).padStart(3, "0")}() {
  return <main>Generated pages router ${index}</main>;
}
`,
  );
}

for (let index = 1; index <= 20; index += 1) {
  touch(
    `src/pages/api/generated/api-${String(index).padStart(3, "0")}.ts`,
    `import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ id: "api-${index}" });
}
`,
  );
}

for (let index = 1; index <= 1; index += 1) {
  touch(
    `src/types/generated/type-${String(index).padStart(3, "0")}.ts`,
    `export type GeneratedType${String(index).padStart(3, "0")} = {
  id: string;
};
`,
  );
}

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else files.push(path.relative(root, fullPath).replaceAll("\\", "/"));
  }
}
walk(root);

if (files.length !== 243) {
  throw new Error(`Expected 243 files, got ${files.length}`);
}

console.log(`Generated ${files.length} files at ${root}`);