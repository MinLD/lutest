import axios from "axios";

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
