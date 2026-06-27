export default function ProfilePage(props) {
  const user = props.query?.user ?? "guest";

  return (
    <main>
      <h1>Profile {user}</h1>
    </main>
  );
}
