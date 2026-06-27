import { MovieCard } from "../../../components/MovieCard";

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
