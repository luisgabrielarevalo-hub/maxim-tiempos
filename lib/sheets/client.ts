import "server-only";

import type { JWT } from "google-auth-library";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export class SheetsError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "SheetsError";
    this.status = status;
  }
}

export interface SheetProperties {
  sheetId: number;
  title: string;
  index: number;
  gridProperties?: {
    rowCount?: number;
    columnCount?: number;
  };
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  properties?: { title?: string };
  sheets?: { properties: SheetProperties }[];
}

export interface ValueRange {
  range?: string;
  majorDimension?: string;
  values?: string[][];
}

export interface GridCell {
  value: string;
  note: string;
}

interface GridDataResponse {
  sheets?: {
    data?: {
      rowData?: {
        values?: { formattedValue?: string; note?: string }[];
      }[];
    }[];
  }[];
}

interface ServiceAccountCredentials {
  email: string;
  key: string;
}

interface ServiceAccountJson {
  client_email?: string;
  private_key?: string;
}

let authClient: JWT | null = null;

/** Quita comillas envolventes y normaliza los `\n` escapados de la clave. */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, "\n").trim();
}

function parseCredentials(
  raw: string,
  source: string,
): ServiceAccountCredentials {
  let parsed: ServiceAccountJson;

  try {
    parsed = JSON.parse(raw) as ServiceAccountJson;
  } catch {
    throw new SheetsError(
      `${source} no contiene un JSON de cuenta de servicio válido.`,
    );
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new SheetsError(
      `${source} no tiene client_email ni private_key.`,
    );
  }

  return {
    email: parsed.client_email.trim(),
    key: normalizePrivateKey(parsed.private_key),
  };
}

/** Acepta el JSON tal cual o en base64, cuando el panel no admite saltos. */
function decodeJsonEnv(value: string): string | null {
  const text = value.trim();

  if (text.startsWith("{")) return text;

  const decoded = Buffer.from(text, "base64").toString("utf8").trim();

  return decoded.startsWith("{") ? decoded : null;
}

async function loadCredentials(): Promise<ServiceAccountCredentials> {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (rawJson) {
    const json = decodeJsonEnv(rawJson);

    if (!json) {
      throw new SheetsError(
        "GOOGLE_SERVICE_ACCOUNT_JSON no contiene un JSON válido.",
      );
    }

    return parseCredentials(json, "GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE?.trim();

  if (keyFile) {
    // En un despliegue sin sistema de archivos el valor puede ser el JSON mismo.
    if (keyFile.startsWith("{")) {
      return parseCredentials(keyFile, "GOOGLE_SERVICE_ACCOUNT_KEY_FILE");
    }

    const { readFile } = await import("node:fs/promises");

    try {
      return parseCredentials(
        await readFile(keyFile, "utf8"),
        `"${keyFile}"`,
      );
    } catch (error) {
      if (error instanceof SheetsError) throw error;

      console.warn(
        `[sheets] No pude leer GOOGLE_SERVICE_ACCOUNT_KEY_FILE ("${keyFile}"); intento con GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.`,
      );
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ? normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
    : "";

  if (!email || !key) {
    throw new SheetsError(
      "Faltan credenciales de Google Sheets: define GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_KEY_FILE o GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  return { email, key };
}

/** Motivo legible del fallo; solo para logs del servidor. */
export function describeSheetsError(error: unknown): string {
  if (error instanceof SheetsError) {
    return error.status
      ? `${error.message} (HTTP ${error.status})`
      : error.message;
  }

  return error instanceof Error ? error.message : String(error);
}

/** La interfaz mantiene el aviso genérico; el detalle queda en los logs. */
export function logSheetsError(context: string, error: unknown): void {
  console.error(`[sheets] ${context}: ${describeSheetsError(error)}`);
}

async function getAuthClient(): Promise<JWT> {
  if (authClient) return authClient;

  const { JWT: JwtClient } = await import("google-auth-library");
  const credentials = await loadCredentials();

  authClient = new JwtClient({
    email: credentials.email,
    key: credentials.key,
    scopes: [SHEETS_SCOPE],
  });

  return authClient;
}

export function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();

  if (!id) {
    throw new SheetsError(
      "Falta GOOGLE_SHEETS_SPREADSHEET_ID en el entorno.",
    );
  }

  return id;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const client = await getAuthClient();
  const { token } = await client.getAccessToken();

  if (!token) {
    throw new SheetsError("Google no devolvió un access token.");
  }

  const response = await fetch(`${API_BASE}/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new SheetsError(
      payload?.error?.message ?? `Sheets respondió ${response.status}.`,
      response.status,
    );
  }

  return payload as T;
}

export function getSpreadsheetMetadata(): Promise<SpreadsheetMetadata> {
  return request<SpreadsheetMetadata>(getSpreadsheetId());
}

export async function getValues(range: string): Promise<string[][]> {
  const data = await request<ValueRange>(
    `${getSpreadsheetId()}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
  );

  return data.values ?? [];
}

/**
 * Valores y notas de una fila en una sola llamada. El índice 0 corresponde a
 * la primera columna del rango.
 */
export async function getRowCells(range: string): Promise<GridCell[]> {
  const query = new URLSearchParams({
    ranges: range,
    includeGridData: "true",
    fields: "sheets.data.rowData.values(formattedValue,note)",
  });

  const data = await request<GridDataResponse>(
    `${getSpreadsheetId()}?${query.toString()}`,
  );

  const values = data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values ?? [];

  return values.map((cell) => ({
    value: (cell.formattedValue ?? "").trim(),
    note: (cell.note ?? "").trim(),
  }));
}

export interface CellUpdate {
  tab: string;
  row: number;
  column: number;
  value: string;
  note: string;
}

/**
 * Escribe valor y nota de una celda en una sola petición. `fields` preserva el
 * formato, la validación de datos y demás propiedades de la celda.
 */
export async function updateCell(update: CellUpdate): Promise<void> {
  const metadata = await getSpreadsheetMetadata();
  const sheet = metadata.sheets?.find(
    (candidate) => candidate.properties.title === update.tab,
  );

  if (!sheet) {
    throw new SheetsError(`No encontré la pestaña "${update.tab}".`);
  }

  await request(`${getSpreadsheetId()}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          updateCells: {
            range: {
              sheetId: sheet.properties.sheetId,
              startRowIndex: update.row - 1,
              endRowIndex: update.row,
              startColumnIndex: update.column - 1,
              endColumnIndex: update.column,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredValue: { stringValue: update.value },
                    note: update.note,
                  },
                ],
              },
            ],
            fields: "userEnteredValue,note",
          },
        },
      ],
    }),
  });
}

export async function updateValues(
  range: string,
  values: (string | number)[][],
  valueInputOption: "RAW" | "USER_ENTERED" = "RAW",
): Promise<{ updatedCells: number; updatedRange: string }> {
  const data = await request<{ updatedCells?: number; updatedRange?: string }>(
    `${getSpreadsheetId()}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`,
    {
      method: "PUT",
      body: JSON.stringify({ range, majorDimension: "ROWS", values }),
    },
  );

  return {
    updatedCells: data.updatedCells ?? 0,
    updatedRange: data.updatedRange ?? range,
  };
}

export async function batchUpdateValues(
  updates: { range: string; values: (string | number)[][] }[],
  valueInputOption: "RAW" | "USER_ENTERED" = "RAW",
): Promise<{ totalUpdatedCells: number }> {
  const data = await request<{ totalUpdatedCells?: number }>(
    `${getSpreadsheetId()}/values:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({
        valueInputOption,
        data: updates.map((update) => ({
          range: update.range,
          majorDimension: "ROWS",
          values: update.values,
        })),
      }),
    },
  );

  return { totalUpdatedCells: data.totalUpdatedCells ?? 0 };
}
