import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DateInput } from "./DateInput";

vi.mock("react-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-dom")>();
  return {
    ...mod,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe("DateInput inputClassName", () => {
  it("leaves the text input without ui-field when inputClassName is omitted", () => {
    render(<DateInput id="d1" value="2026-04-09" onChange={() => {}} />);
    const field = document.getElementById("d1");
    expect(field).toBeTruthy();
    expect(field?.className).toBe("");
  });

  it("applies inputClassName to the text input only", () => {
    render(
      <DateInput
        id="d2"
        value="2026-04-09"
        inputClassName="ui-field"
        onChange={() => {}}
      />,
    );
    expect(document.getElementById("d2")).toHaveClass("ui-field");
  });

  it("still commits a typed ISO date on blur", () => {
    const onChange = vi.fn();
    render(<DateInput id="d3" value="2026-04-09" inputClassName="ui-field" onChange={onChange} />);
    const input = document.getElementById("d3") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "2026-04-10" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("2026-04-10");
  });
});
