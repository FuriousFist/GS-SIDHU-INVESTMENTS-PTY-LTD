import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterInput, FilterSelect } from "@/components/ui/filter-input";

describe("FilterInput", () => {
  test("empty input uses grey text and switches to black once typed", async () => {
    const user = userEvent.setup();

    render(<FilterInput aria-label="Search" type="text" placeholder="e.g." />);

    const input = screen.getByLabelText("Search");
    expect(input).toHaveClass("text-neutral-500");
    expect(input).not.toHaveClass("text-neutral-900");
    expect(input).toHaveClass("bg-white", "placeholder:text-neutral-500");

    await user.type(input, "Winslow");

    expect(input).toHaveValue("Winslow");
    expect(input).toHaveClass("text-neutral-900");
    expect(input).not.toHaveClass("text-neutral-500");
  });

  test("pre-filled input starts black and turns grey when cleared", async () => {
    const user = userEvent.setup();

    render(<FilterInput aria-label="Search" type="text" defaultValue="abc" />);

    const input = screen.getByLabelText("Search");
    expect(input).toHaveClass("text-neutral-900");

    await user.clear(input);

    expect(input).toHaveValue("");
    expect(input).toHaveClass("text-neutral-500");
  });

  test("date input with a value is black", () => {
    render(
      <FilterInput
        aria-label="From"
        type="date"
        name="from"
        defaultValue="2026-08-01"
      />
    );

    const input = screen.getByLabelText("From");
    expect(input).toHaveValue("2026-08-01");
    expect(input).toHaveAttribute("name", "from");
    expect(input).toHaveClass("text-neutral-900");
  });

  test("forwards extra props and merges className", () => {
    render(
      <FilterInput
        id="my-id"
        name="q"
        type="text"
        placeholder="hint"
        className="w-full"
      />
    );

    const input = screen.getByPlaceholderText("hint");
    expect(input).toHaveAttribute("id", "my-id");
    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveClass("w-full", "text-neutral-500");
  });
});

describe("FilterSelect", () => {
  function renderSelect(defaultValue?: string) {
    render(
      <FilterSelect aria-label="Type" name="type" defaultValue={defaultValue}>
        <option value="">All</option>
        <option value="concrete">Concrete</option>
        <option value="aggregates">Aggregates</option>
      </FilterSelect>
    );
    return screen.getByLabelText("Type") as HTMLSelectElement;
  }

  test('"All" (empty value) is grey, picking a type turns it black', async () => {
    const user = userEvent.setup();
    const select = renderSelect();

    expect(select.value).toBe("");
    expect(select).toHaveClass("text-neutral-500");
    expect(select).toHaveClass("bg-white");

    await user.selectOptions(select, "concrete");

    expect(select.value).toBe("concrete");
    expect(select).toHaveClass("text-neutral-900");
    expect(select).not.toHaveClass("text-neutral-500");
  });

  test("pre-selected type is black and returns to grey on All", async () => {
    const user = userEvent.setup();
    const select = renderSelect("aggregates");

    expect(select.value).toBe("aggregates");
    expect(select).toHaveClass("text-neutral-900");

    await user.selectOptions(select, "");

    expect(select).toHaveClass("text-neutral-500");
  });
});
