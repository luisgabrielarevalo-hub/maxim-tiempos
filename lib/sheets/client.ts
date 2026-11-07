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

let authClient: JWT | null = null;

async function loadCredentials(): Promise<ServiceAccountCredentials> {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE?.trim();

  if (keyFile) {
    const { readFile } = await import("node:fs/promises");
    let raw: string;

    try {
      raw = await readFile(keyFile, "utf8");
    } catch {
      throw new SheetsError(`No pude leer la clave de servicio en "${keyFile}".`);
    }

    const parsed = JSON.parse(raw) as {
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.client_email || !parsed.private_key) {
      throw new SheetsError(
        `"${keyFile}" no es una clave de cuenta de servicio válida.`,
      );
    }

    return { email: parsed.client_email, key: parsed.private_key };
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  ).trim();

  if (!email || !key) {
    throw new SheetsError(
      "Faltan credenciales de Google Sheets: define GOOGLE_SERVICE_ACCOUNT_KEY_FILE o GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  return { email, key };
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
