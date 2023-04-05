import crypto from "crypto";

export const isEmpty = (...args: string[]): boolean => {
  let push: boolean = false;
  args.every((e: string) => {
    if (!e || e.trim() === "") push = true;
    return false;
  });
  return push;
};

export const isValidUsername = (val: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  return usernameRegex.test(val);
};

export const isValidName = (name: string): boolean => {
  // const nameRegex = /^[a-zA-Z ]+$/;
  return /^[a-zA-Z ]+$/.test(name);
};

export const caseInSensitiveRegex = (val: string): RegExp => {
  return new RegExp(`^${val}$`, "i");
};

export const capitalizeFirstLetter = (val: string): string => {
  return val.charAt(0).toUpperCase() + val.slice(1);
};

export const generateRandomToken = (): string => {
  return crypto.randomBytes(16).toString("hex");
};
