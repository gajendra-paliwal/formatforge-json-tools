export {
  formatJson,
  type FormatJsonOptions
} from "./formatter/format";

export {
  isValidJson,
  JsonParseError,
  parseJson,
  validateJson,
  type JsonValidationError,
  type JsonValidationResult
} from "./validator/validate";

export {
  deepClone,
  deepMerge,
  flattenJson,
  removeEmpty,
  sortJsonKeys,
  unflattenJson,
  type DeepMergeOptions,
  type FlattenedJson,
  type FlattenJsonOptions,
  type RemoveEmptyOptions,
  type SortJsonKeysOptions,
  type UnflattenJsonOptions
} from "./transform";

export type { JsonObject, JsonPrimitive, JsonValue } from "./types/json";

export {
  compareJson,
  diffJson,
  isDeepEqual,
  type DiffJsonOptions,
  type JsonComparisonResult,
  type JsonDifference,
  type JsonDifferenceType
} from "./compare";

export {
  applyPatch,
  createPatch,
  invertPatch,
  JsonPatchError,
  validatePatch,
  type ApplyPatchOptions,
  type ApplyPatchResult,
  type JsonPatchOperation,
  type PatchValidationError,
  type PatchValidationResult
} from "./patch";

export {
  escapePointer,
  getPointer,
  hasPointer,
  JsonPointerError,
  listPointers,
  parsePointer,
  removePointer,
  setPointer,
  unescapePointer,
  type ListPointersOptions
} from "./pointer";

export {
  exists,
  find,
  first,
  JsonPathError,
  parseJsonPath,
  query,
  select,
  type JsonPathMatch
} from "./path";

export {
  generateSchema,
  inferSchema,
  isValidAgainstSchema,
  mergeSchemas,
  validateAgainstSchema,
  type GenerateSchemaOptions,
  type JsonSchema,
  type JsonSchemaType,
  type SchemaValidationError,
  type SchemaValidationResult
} from "./schema";

export {
  canonicalize,
  canonicalizeJson,
  isCanonicalJson,
  JsonCanonicalizationError,
  stableStringify,
  type StableStringifyComparator,
  type StableStringifyOptions
} from "./canonical";
