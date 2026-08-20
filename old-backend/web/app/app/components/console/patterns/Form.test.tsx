import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ConsoleForm, ConsoleTextField } from "./Form";

type DemoValues = {
  email: string;
};

const schema = z.object({
  email: z.string().email("Enter a valid email."),
});

function DemoForm({ onSubmit = vi.fn() }: { onSubmit?: (values: DemoValues) => void }) {
  const form = useForm<DemoValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(schema),
  });

  return (
    <ConsoleForm form={form} onSubmit={onSubmit}>
      <ConsoleTextField<DemoValues> label="Email" name="email" />
      <button type="submit">Submit</button>
    </ConsoleForm>
  );
}

describe("ConsoleForm", () => {
  it("surfaces React Hook Form validation errors through platform fields", async () => {
    render(<DemoForm />);

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Enter a valid email.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });
});
