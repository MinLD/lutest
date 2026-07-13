import axios from "axios";

export type Movie = {
  id: string;
  title: string;
};

export const fallbackMovies: Movie[] = [
  { id: "m1", title: "Movie One" },
  { id: "m2", title: "Movie Two" },
];

export function localRuntimeUrl(path: string): string {
  const port = process.env.PORT ?? "3000";
  return new URL(path, `http://127.0.0.1:${port}`).toString();
}

export async function listMovies(): Promise<Movie[]> {
  try {
    const response = await axios.get<Movie[]>(localRuntimeUrl("/api/v1/movies"));
    return response.data;
  } catch {
    return fallbackMovies;
  }
}

export async function paginateMovies(): Promise<Movie[]> {
  try {
    const response = await axios.post<Movie[]>(localRuntimeUrl("/api/v1/movies/paginate"), {
      page: 1,
      pageSize: 12,
    });

    return response.data;
  } catch {
    return fallbackMovies;
  }
}
