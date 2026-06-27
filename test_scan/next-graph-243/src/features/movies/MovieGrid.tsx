import { paginateMovies } from "../../services/movie-service";
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
