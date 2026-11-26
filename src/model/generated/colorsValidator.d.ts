import type { ErrorObject } from "ajv/dist/2020.js";

type StandaloneValidate = {
  (data: unknown): boolean;
  errors?: ErrorObject[] | null;
};

declare const validate: StandaloneValidate;
export default validate;
