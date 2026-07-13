import { fallbackMovies } from "../../services/movie-service";
import { MovieCard } from "../../components/MovieCard";

export function MovieGrid() {
  return (
    <section>
      {fallbackMovies.map((movie) => (
        <MovieCard key={movie.id} title={movie.title} />
      ))}
    </section>
  );
}
