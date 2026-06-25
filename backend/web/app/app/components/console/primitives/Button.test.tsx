import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";
import { resources } from "~/i18n/resources";

describe("Button", () => {
  it("renders as an accessible button", () => {
    render(<Button>{resources["en-US"].common.actions.submit}</Button>);
    expect(
      screen.getByRole("button", { name: resources["en-US"].common.actions.submit }),
    ).toBeInTheDocument();
  });

  it("keeps loading state accessible", () => {
    render(<Button loading>{resources["en-US"].common.actions.submit}</Button>);
    expect(
      screen.getByRole("button", { name: resources["en-US"].common.actions.submit }),
    ).toHaveAttribute("aria-busy", "true");
  });
});
