// openapi-data is the read-only parsing layer over the OpenAPI contract snapshot
// (webui/src/generated/openapi-spec.ts), R075-003: it projects the generated JSON
// into view rows for the platform components, so the page owns no parsing logic.
// It consumes the OpenAPI 3.0.x shape emitted by the generator (Huma output) and
// has no runtime dependencies.

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

export type OperationObject = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
  security?: Array<Record<string, string[]>>;
};

export type OpenAPIDocument = {
  openapi?: string;
  info?: { title?: string; version?: string; description?: string };
  paths?: Record<string, Partial<Record<HTTPMethod, OperationObject>>>;
  components?: { schemas?: Record<string, SchemaObject> };
  security?: Array<Record<string, string[]>>;
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

// firstSchema returns the first JSON media type's schema (application/json
// preferred) from a content map.
function firstSchema(content: ContentObject | undefined): SchemaObject | undefined {
  if (!content) return undefined;
  const entry = Object.entries(content).find(([mediaType]) => mediaType.includes("json"));
  return entry?.[1].schema ?? Object.values(content)[0]?.schema;
}

export type ParameterRow = { name: string; location: string; required: boolean; type: string; description: string };

// parameterRows projects operation parameters to table rows (plain data;
// copy is localised by the page).
export function parameterRows(operation: OperationRow): ParameterRow[] {
  return operation.parameters.map((parameter) => ({
    name: parameter.name,
    location: parameter.in,
    required: Boolean(parameter.required),
    type: schemaSummary(parameter.schema),
    description: parameter.description ?? "",
  }));
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

export type RequestBodyRow = { description: string; required: boolean; schema: string };

// requestBodyRow returns the request body summary (first JSON media type schema
// type and the required flag).
export function requestBodyRow(operation: OperationRow): RequestBodyRow | undefined {
  const body = operation.requestBody;
  if (!body) return undefined;
  return {
    description: body.description ?? "",
    required: Boolean(body.required),
    schema: schemaSummary(firstSchema(body.content)),
  };
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