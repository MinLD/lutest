import { Button } from "../components/ui/Button";

export function useAuthModal() {
  return {
    element: (
      <div role="dialog" aria-label="Auth modal">
        <p>Please sign in</p>
        <Button type="button">Continue</Button>
      </div>
    ),
  };
}
