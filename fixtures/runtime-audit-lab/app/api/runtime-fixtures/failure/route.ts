export async function GET() {
  return Response.json({ status: "expected-failure" }, { status: 503 });
}
