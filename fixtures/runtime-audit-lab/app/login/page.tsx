import { LoginForm } from "../../components/auth-fixture/login-form";
import { sanitizeNextPath } from "../../lib/auth-fixture/session";

export default async function LoginFixturePage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const params = await searchParams;
  return <LoginForm nextPath={sanitizeNextPath(params.next)} reason={params.reason} />;
}
