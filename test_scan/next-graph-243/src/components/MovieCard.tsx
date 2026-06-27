type MovieCardProps = {
  title: string;
};

export function MovieCard(props: MovieCardProps) {
  return (
    <article>
      <h2>{props.title}</h2>
    </article>
  );
}
