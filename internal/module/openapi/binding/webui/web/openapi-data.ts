// openapi-data is the read-only parsing and request-building layer over the
// OpenAPI contract snapshot (webui/src/generated/openapi-spec.ts), R075-004:
// it projects the generated JSON into view rows for the platform components
// and builds executable requests (same-origin fetch semantics). The page owns
// no parsing or request-shaping logic. It consumes the OpenAPI 3.0.x shape
// emitted by the generator (Huma output) and has no runtime dependencies.

export const OPENAPI_HTTP_METHODS = ["get", "post", "patch", "put", "delete"] as const;

export type HTTPMethod = (typeof OPENAPI_HTTP_METHODS)[number];

export type SchemaObject = {
  type?: string;
  format?: string;
  items?: SchemaObject;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  $ref?: string;
  enum?: unknown[];
  description?: string;
  additionalProperties?: boolean | SchemaObject;
};

export type ParameterObject = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: SchemaObject;
  explode?: boolean;
};

export type ContentObject = Record<string, { schema?: SchemaObject }>;
export type ResponseObject = { description?: string; content?: ContentObject };
export type RequestBodyObject = { description?: string; required?: boolean; content?: ContentObject };
export type SecurityRequirement = Array<Record<string, string[]>>;

export type OperationObject = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
  security?: SecurityRequirement;
};

export type OpenAPIDocument = {
  openapi?: string;
  info?: { title?: string; version?: string; description?: string };
  paths?: Record<string, Partial<Record<HTTPMethod, OperationObject>>>;
  components?: { schemas?: Record<string, SchemaObject> };
  security?: SecurityRequirement;
};

// isOpenAPIDocument checks whether the snapshot is a displayable OpenAPI object
// (a top-level object with an openapi version and a paths map).
export function isOpenAPIDocument(value: unknown): value is OpenAPIDocument {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as OpenAPIDocument;
  return typeof candidate.openapi === "string" && typeof candidate.paths === "object" && candidate.paths !== null;
}

// refName extracts the last segment of a $ref (e.g. AccountResponse from
// "#/components/schemas/AccountResponse").
export function refName(ref: string): string {
  const segment = ref.split("/").pop();
  return segment && segment.length > 0 ? segment : ref;
}

// schemaSummary projects a schema to a one-line type text: ref / base type / array / any.
export function schemaSummary(schema: SchemaObject | undefined): string {
  if (!schema) return "";
  if (typeof schema.$ref === "string" && schema.$ref !== "") return `ref ${refName(schema.$ref)}`;
  if (schema.type === "array") return `array<${schemaSummary(schema.items)}>`;
  const format = schema.format ? ` (${schema.format})` : "";
  return `${schema.type ?? "any"}${format}`;
}

export type OperationRow = {
  id: string;
  method: string;
  path: string;
  operationId: string;
  summary?: string;
  description?: string;
  parameters: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Array<{ status: string; description?: string; schema?: SchemaObject }>;
  security?: SecurityRequirement;
};

export type OperationGroup = { tag: string; operations: OperationRow[] };

// groupedOperations groups operations by their first tag, keeping a stable
// intra-group order that follows the contract path traversal order.
export function groupedOperations(spec: OpenAPIDocument): OperationGroup[] {
  const groups = new Map<string, OperationRow[]>();
  const order: string[] = [];
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const method of OPENAPI_HTTP_METHODS) {
      const operation = item?.[method];
      if (!operation) continue;
      const tag = operation.tags?.[0]?.trim() || "default";
      const row: OperationRow = {
        id: `${method}-${path}`,
        method: method.toUpperCase(),
        path,
        operationId: operation.operationId ?? "",
        summary: operation.summary,
        description: operation.description,
        parameters: operation.parameters ?? [],
        requestBody: operation.requestBody,
        responses: Object.entries(operation.responses ?? {}).map(([status, response]) => ({
          status,
          description: response.description,
          schema: firstSchema(response.content),
        })),
        security: operation.security,
      };
      if (!groups.has(tag)) {
        groups.set(tag, []);
        order.push(tag);
      }
      groups.get(tag)!.push(row);
    }
  }
  return order.map((tag) => ({ tag, operations: groups.get(tag)! }));
}

// filterOperationGroups narrows the tree by a case-insensitive query over
// method/path/operationId; groups without matches are dropped.
export function filterOperationGroups(groups: OperationGroup[], query: string): OperationGroup[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return groups;
  return groups
    .map((group) => ({ ...group, operations: group.operations.filter((row) => `${row.method} ${row.path} ${row.operationId}`.toLowerCase().includes(needle)) }))
    .filter((group) => group.operations.length > 0);
}

// hasSecurityScheme reports whether an operation requires the given scheme.
export function hasSecurityScheme(operation: OperationRow, scheme: string): boolean {
  return (operation.security ?? []).some((requirement) => Object.keys(requirement).includes(scheme));
}

// isMutation reports whether the HTTP method mutates server state.
export function isMutation(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

// firstSchema returns the first JSON media type's schema (application/json
// preferred) from a content map.
function firstSchema(content: ContentObject | undefined): SchemaObject | undefined {
  if (!content) return undefined;
  const entry = Object.entries(content).find(([mediaType]) => mediaType.includes("json"));
  return entry?.[1].schema ?? Object.values(content)[0]?.schema;
}

export type RequestBodySchema = { description: string; required: boolean; schema?: SchemaObject };

// requestBodySchema returns the request body summary (first JSON media type
// schema and the required flag).
export function requestBodySchema(operation: OperationRow): RequestBodySchema | undefined {
  const body = operation.requestBody;
  if (!body) return undefined;
  return { description: body.description ?? "", required: Boolean(body.required), schema: firstSchema(body.content) };
}

export type ResponseRow = { status: string; description: string; schema: string };

// responseRows projects operation responses to table rows; statuses sort
// numerically with "default" last.
export function responseRows(operation: OperationRow): ResponseRow[] {
  const rows = operation.responses.map((response) => ({
    status: response.status,
    description: response.description ?? "",
    schema: schemaSummary(response.schema),
  }));
  const rank = (row: ResponseRow): number => {
    const numeric = Number.parseInt(row.status, 10);
    return Number.isNaN(numeric) ? Number.MAX_SAFE_INTEGER : numeric;
  };
  return [...rows].sort((left, right) => rank(left) - rank(right));
}

export type SchemaPropertyRow = { name: string; type: string; required: boolean; description: string };

// schemaPropertyRows projects a model's top-level properties to table rows;
// nested objects are presented as type text.
export function schemaPropertyRows(schema: SchemaObject | undefined): SchemaPropertyRow[] {
  const requiredSet = new Set(schema?.required ?? []);
  return Object.entries(schema?.properties ?? {}).map(([name, property]) => ({
    name,
    type: schemaSummary(property),
    required: requiredSet.has(name),
    description: property.description ?? "",
  }));
}

// ---------------------------------------------------------------------------
// Request building (pure)
// ---------------------------------------------------------------------------

export type ExecutionParameterRow = { name: string; location: "query" | "path"; required: boolean; type: string; value: string };

// executionParameters projects query/path parameters with initial editable
// values derived from the schema type (plain data; editing lives in the page).
export function executionParameters(operation: OperationRow): ExecutionParameterRow[] {
  return operation.parameters
    .filter((parameter) => parameter.in === "query" || parameter.in === "path")
    .map((parameter) => ({
      name: parameter.name,
      location: parameter.in === "path" ? "path" : "query",
      required: Boolean(parameter.required),
      type: schemaSummary(parameter.schema),
      value: parameterDefaultValue(parameter.schema),
    }));
}

// parameterDefaultValue returns the initial editable value for a schema type.
export function parameterDefaultValue(schema: SchemaObject | undefined): string {
  if (!schema) return "";
  if (schema.type === "boolean") return "false";
  if (schema.type === "integer" || schema.type === "number") return "0";
  if (schema.type === "array") return "[]";
  return "";
}

// sampleJSON builds a JSON sample from a schema (refs resolved through the
// components schemas map, depth-limited to stay safe on recursive types).
export function sampleJSON(schema: SchemaObject | undefined, schemas: Record<string, SchemaObject> | undefined, depth = 0): unknown {
  if (!schema || depth > 4) return null;
  if (typeof schema.$ref === "string" && schema.$ref !== "") {
    const target = schemas?.[refName(schema.$ref)];
    return target ? sampleJSON(target, schemas, depth + 1) : null;
  }
  switch (schema.type) {
    case "object": {
      const value: Record<string, unknown> = {};
      for (const [name, property] of Object.entries(schema.properties ?? {})) value[name] = sampleJSON(property, schemas, depth + 1);
      return value;
    }
    case "array":
      return [sampleJSON(schema.items, schemas, depth + 1)];
    case "boolean":
      return true;
    case "integer":
    case "number":
      return 0;
    case "string":
      return schema.format === "date-time" ? "2026-01-01T00:00:00Z" : "string";
    default:
      return null;
  }
}

export type BuiltRequest = { url: string; method: string; headers: Record<string, string>; body?: string };

// buildRequest assembles the executable same-origin request from the operation
// and the current editor values (R075-004):
// - path parameters are substituted and encoded; query parameters with a
//   non-empty value become the query string;
// - a non-empty body sets Content-Type: application/json;
// - bearerAuth injects Authorization; webuiSession mutations attach Origin and
//   X-CSRF-Token (session cookie itself is carried by the browser).
export function buildRequest(
  operation: OperationRow,
  options: {
    pathValues: Record<string, string>;
    queryValues: Record<string, string>;
    bodyText?: string;
    bearerToken?: string;
    csrfToken?: string;
    origin: string;
  },
): BuiltRequest {
  let url = operation.path;
  for (const parameter of operation.parameters) {
    if (parameter.in !== "path") continue;
    const value = options.pathValues[parameter.name] ?? "";
    url = url.replace(`{${parameter.name}}`, encodeURIComponent(value));
  }
  const query = operation.parameters
    .filter((parameter) => parameter.in === "query")
    .map((parameter) => ({ name: parameter.name, value: options.queryValues[parameter.name] }))
    .filter((entry) => entry.value !== undefined && entry.value !== "");
  if (query.length > 0) {
    url += "?" + query.map((entry) => `${encodeURIComponent(entry.name)}=${encodeURIComponent(entry.value)}`).join("&");
  }
  const headers: Record<string, string> = {};
  const body = options.bodyText !== undefined && options.bodyText.trim() !== "" ? options.bodyText : undefined;
  if (body) headers["Content-Type"] = "application/json";
  if (hasSecurityScheme(operation, "bearerAuth") && options.bearerToken && options.bearerToken.trim() !== "") {
    headers["Authorization"] = `Bearer ${options.bearerToken.trim()}`;
  }
  if (hasSecurityScheme(operation, "webuiSession") && isMutation(operation.method)) {
    headers["Origin"] = options.origin;
    if (options.csrfToken && options.csrfToken.trim() !== "") headers["X-CSRF-Token"] = options.csrfToken.trim();
  }
  return { url, method: operation.method, headers, body };
}