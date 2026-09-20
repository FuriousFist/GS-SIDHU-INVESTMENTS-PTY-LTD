export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const REGISTRATION_STATES = [
  "QLD",
  "NSW",
  "VIC",
  "SA",
  "WA",
  "TAS",
  "NT",
  "ACT",
] as const;
export type RegistrationState = (typeof REGISTRATION_STATES)[number];

export const TRUCK_TYPES = ["agitator", "tipper"] as const;
export type TruckType = (typeof TRUCK_TYPES)[number];

export const SUPPLIERS = ["Holcim", "Barro"] as const;
