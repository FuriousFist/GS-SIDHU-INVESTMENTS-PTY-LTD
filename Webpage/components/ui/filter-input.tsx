"use client";

import { useState } from "react";

// Shared look for every filter control. Text colour is set explicitly
// (never inherited from body) and switches from grey while empty to black
// once a value is present. This needs state rather than :placeholder-shown
// because that pseudo-class doesn't apply to type="date" inputs.
const BASE_CLASSES =
  "rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm placeholder:text-neutral-500 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/20 focus:outline-none";

const EMPTY_CLASSES = "text-neutral-500";
const FILLED_CLASSES = "text-neutral-900";

function joinClasses(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type FilterInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "defaultValue" | "onChange"
> & {
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export function FilterInput({
  defaultValue = "",
  onChange,
  className,
  ...props
}: FilterInputProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <input
      {...props}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        onChange?.(event);
      }}
      className={joinClasses(
        BASE_CLASSES,
        value === "" ? EMPTY_CLASSES : FILLED_CLASSES,
        className
      )}
    />
  );
}

type FilterSelectProps = Omit<
  React.ComponentProps<"select">,
  "value" | "defaultValue" | "onChange"
> & {
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
};

export function FilterSelect({
  defaultValue = "",
  onChange,
  className,
  children,
  ...props
}: FilterSelectProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <select
      {...props}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        onChange?.(event);
      }}
      className={joinClasses(
        BASE_CLASSES,
        value === "" ? EMPTY_CLASSES : FILLED_CLASSES,
        className
      )}
    >
      {children}
    </select>
  );
}
