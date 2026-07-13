import { listMovies, localRuntimeUrl } from "../../services/movie-service";

export default async function WatchPage() {
  const movies = await listMovies();
  const title = movies[0]?.title ?? "Watch";
  const description = "This page intentionally performs browser-style network behavior.";
  const enabled = true;
  const endpoint = localRuntimeUrl("/api/v1/movies");
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
