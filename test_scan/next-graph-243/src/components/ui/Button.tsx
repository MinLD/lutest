import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function Button(props: ButtonProps) {
  const { children, ...rest } = props;

  return <button {...rest}>{children}</button>;
}
