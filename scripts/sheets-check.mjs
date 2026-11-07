#!/usr/bin/env node
/**
 * Diagnóstico de la hoja "CUADRO DE PERSONAL".
 *
 * Uso:
 *   npm run sheets:check                       # resumen del mes actual
 *   npm run sheets:check -- tabs               # pestañas del libro
 *   npm run sheets:check -- employees 2026-11-05
 *   npm run sheets:check -- read "LUIS AREVALO" 2026-11-05
 *   npm run sheets:check -- write "LUIS AREVALO" 2026-11-05 DE --yes
 *   npm run sheets:check -- write AVD12 2026-11-06 ED --note "SFRA100 TRZ · Cambio de sarta" --yes
 *   npm run sheets:check -- month AVD12 2026-11
 *   npm run sheets:check -- total AVD12 [YYYY-MM]
 *
 * Necesita GOOGLE_SHEETS_SPREADSHEET_ID y las credenciales de la cuenta de
 * servicio en el entorno (ver .env.example).
 */
import { readFile } from "node:fs/promises";
import { JWT } from "google-auth-library";

const API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const MONTHS = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];
const FIRST_DAY_COLUMN = 3;
const EMPLOYEE_FIRST_ROW = 7;
const EMPLOYEE_LAST_ROW = 200;
const TOTAL_REST_DAYS_COLUMN = 46;
const TOTAL_REST_DAYS_HEADER_ROW = 6;

const [, , command = "summary", ...args] = process.argv;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function todayLocal() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) fail(`Fecha inválida: "${iso}". Usa YYYY-MM-DD.`);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) fail(`Mes inválido en "${iso}".`);
  if (day < 1 || day > 31) fail(`Día inválido en "${iso}".`);
  return { month, day };
}

function parseMonthArg(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) fail(`Mes inválido: "${value}". Usa YYYY-MM.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) fail(`Mes inválido en "${value}".`);
  return { year, monthIndex: month - 1 };
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function statusFromSheetCode(raw) {
  const code = String(raw ?? "").trim().toUpperCase();
  if (!code || code === "FE") return null;
  return { DE: "descanso", BA: "base", LI: "licencia" }[code] ?? "pozo";
}

function monthTab(iso) {
  return MONTHS[parseIsoDate(iso).month - 1];
}

function columnLetter(column) {
  let remaining = column;
  let label = "";
  while (remaining > 0) {
    label = String.fromCharCode(65 + ((remaining - 1) % 26)) + label;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return label;
}

function dayColumnIndex(iso) {
  return FIRST_DAY_COLUMN + parseIsoDate(iso).day - 1;
}

function dayColumn(iso) {
  return columnLetter(dayColumnIndex(iso));
}

function formatRestDays(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "—";
  const value = Number(text);
  if (!Number.isFinite(value)) return text;
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value);
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function parseEmployees(rows) {
  const employees = [];
  let section = "";
  rows.forEach((row, index) => {
    const id = String(row?.[0] ?? "").trim();
    const name = String(row?.[1] ?? "").trim();
    if (!id && name) {
      section = name;
      return;
    }
    if (!id) return;
    employees.push({ row: EMPLOYEE_FIRST_ROW + index, id, name, section });
  });
  return employees;
}

async function loadCredentials() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE?.trim();
  if (keyFile) {
    let raw;
    try {
      raw = await readFile(keyFile, "utf8");
    } catch {
      fail(
        `No encontré la clave de servicio en "${keyFile}". Descarga el JSON de la cuenta de servicio y guárdalo en esa ruta.`,
      );
    }
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) {
      fail(`"${keyFile}" no es una clave de cuenta de servicio válida.`);
    }
    return { email: parsed.client_email, key: parsed.private_key };
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!email || !key) {
    fail(
      "Faltan credenciales. Define GOOGLE_SERVICE_ACCOUNT_KEY_FILE o GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }
  return { email, key };
}

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
if (!spreadsheetId) fail("Falta GOOGLE_SHEETS_SPREADSHEET_ID.");

const credentials = await loadCredentials();
const auth = new JWT({
  email: credentials.email,
  key: credentials.key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function request(path, init = {}) {
  const { token } = await auth.getAccessToken();
  const response = await fetch(`${API_BASE}/${spreadsheetId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    fail(payload?.error?.message ?? `Sheets respondió ${response.status}.`);
  }
  return payload;
}

async function getValues(range) {
  const data = await request(`/values/${encodeURIComponent(range)}?majorDimension=ROWS`);
  return data.values ?? [];
}

async function getRowCells(range) {
  const query = new URLSearchParams({
    ranges: range,
    includeGridData: "true",
    fields: "sheets.data.rowData.values(formattedValue,note)",
  });
  const data = await request(`?${query.toString()}`);
  const values = data?.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values ?? [];
  return values.map((cell) => ({
    value: String(cell.formattedValue ?? "").trim(),
    note: String(cell.note ?? "").trim(),
  }));
}

async function updateCell(tab, row, column, value, note) {
  const data = await request("");
  const sheet = (data.sheets ?? []).find(
    (candidate) => candidate.properties.title === tab,
  );

  if (!sheet) fail(`No encontré la pestaña "${tab}".`);

  await request(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          updateCells: {
            range: {
              sheetId: sheet.properties.sheetId,
              startRowIndex: row - 1,
              endRowIndex: row,
              startColumnIndex: column - 1,
              endColumnIndex: column,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredValue: { stringValue: value },
                    note,
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

async function listTabs() {
  const data = await request("");
  return (data.sheets ?? []).map((sheet) => sheet.properties);
}

async function listEmployees(iso) {
  const rows = await getValues(
    `${monthTab(iso)}!A${EMPLOYEE_FIRST_ROW}:B${EMPLOYEE_LAST_ROW}`,
  );
  return parseEmployees(rows);
}

async function findEmployee(key, iso) {
  const employees = await listEmployees(iso);
  const match =
    employees.find((employee) => employee.id === key.trim()) ??
    employees.find((employee) => normalize(employee.name) === normalize(key));
  if (!match) fail(`No encontré a "${key}" en ${monthTab(iso)}.`);
  return match;
}

async function findRowByCode(key, monthIndex) {
  const rows = await getValues(
    `${MONTHS[monthIndex]}!A${EMPLOYEE_FIRST_ROW}:A${EMPLOYEE_LAST_ROW}`,
  );
  const code = key.trim().toUpperCase();
  const index = rows.findIndex(
    (row) => String(row?.[0] ?? "").trim().toUpperCase() === code,
  );
  return index === -1 ? null : EMPLOYEE_FIRST_ROW + index;
}

function cell(employee, iso) {
  return `${monthTab(iso)}!${dayColumn(iso)}${employee.row}`;
}

async function printTabs() {
  const tabs = await listTabs();
  console.log(`\n${tabs.length} pestañas:\n`);
  for (const tab of tabs) {
    const { rowCount = "?", columnCount = "?" } = tab.gridProperties ?? {};
    console.log(
      `  ${String(tab.index + 1).padStart(2)}. ${tab.title.padEnd(22)} ${rowCount} × ${columnCount}  (id ${tab.sheetId})`,
    );
  }
  console.log();
}

async function printEmployees(iso) {
  const employees = await listEmployees(iso);
  console.log(`\n${employees.length} empleados en ${monthTab(iso)} (${iso}):\n`);
  let current = "";
  for (const employee of employees) {
    if (employee.section !== current) {
      current = employee.section;
      console.log(`  ${current}`);
    }
    console.log(
      `    fila ${String(employee.row).padStart(3)}  ${employee.name.padEnd(28)} ${employee.id}`,
    );
  }
  console.log();
}

async function printMonth(employeeKey, monthArg) {
  if (!employeeKey || !monthArg) fail("Uso: month <id> YYYY-MM");
  const { year, monthIndex } = parseMonthArg(monthArg);
  const tab = MONTHS[monthIndex];
  const row = await findRowByCode(employeeKey, monthIndex);

  if (row === null) {
    fail(`No encontré "${employeeKey}" en la columna A de ${tab}.`);
  }

  const lastDay = daysInMonth(year, monthIndex);
  const lastColumn = columnLetter(FIRST_DAY_COLUMN + lastDay - 1);
  const cells = await getRowCells(`${tab}!C${row}:${lastColumn}${row}`);

  console.log(
    `\nCUADRO DE PERSONAL ${year} · ${tab} · ${employeeKey.trim()} (fila ${row})`,
  );

  for (let day = 1; day <= lastDay; day += 1) {
    const cellValue = cells[day - 1];

    if (!cellValue) continue;

    const status = statusFromSheetCode(cellValue.value);

    if (!status) continue;

    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const note = cellValue.note ? `  · ${cellValue.note.replace(/\s+/g, " ")}` : "";

    console.log(
      `  ${date}  ${status.padEnd(10)}${cellValue.value.trim().toUpperCase()}${note}`,
    );
  }

  const totalColumn = columnLetter(TOTAL_REST_DAYS_COLUMN);
  const totalValues = await getValues(`${tab}!${totalColumn}${row}`);
  const totalRaw = totalValues[0]?.[0] ?? "";

  console.log(
    `\n  TOTAL DE DIAS A DESCANSAR (${totalColumn}${row}): ${JSON.stringify(totalRaw)} → ${formatRestDays(totalRaw)} días\n`,
  );
}

async function printTotal(employeeKey, monthArg) {
  const month = monthArg ?? todayLocal().slice(0, 7);
  const { year, monthIndex } = parseMonthArg(month);
  const tab = MONTHS[monthIndex];
  const row = await findRowByCode(employeeKey, monthIndex);

  if (row === null) {
    fail(`No encontré "${employeeKey}" en la columna A de ${tab}.`);
  }

  const totalColumn = columnLetter(TOTAL_REST_DAYS_COLUMN);
  const headerRange = `${tab}!${totalColumn}${TOTAL_REST_DAYS_HEADER_ROW}`;
  const valueRange = `${tab}!${totalColumn}${row}`;
  const [headerValues, valueValues] = await Promise.all([
    getValues(headerRange),
    getValues(valueRange),
  ]);
  const header = headerValues[0]?.[0] ?? "";
  const raw = valueValues[0]?.[0] ?? "";

  console.log(
    `\nCUADRO DE PERSONAL ${year} · ${tab} · ${employeeKey.trim()} (fila ${row})`,
  );
  console.log(`  ${totalColumn}${TOTAL_REST_DAYS_HEADER_ROW}: ${JSON.stringify(header)}`);
  console.log(
    `  ${totalColumn}${row}: ${JSON.stringify(raw)} → ${formatRestDays(raw)} días\n`,
  );
}

switch (command) {
  case "tabs":
    await printTabs();
    break;

  case "employees":
    await printEmployees(args[0] ?? todayLocal());
    break;

  case "month": {
    const [employeeKey, month] = args;
    await printMonth(employeeKey, month);
    break;
  }

  case "total": {
    const [employeeKey, month] = args;
    if (!employeeKey) fail("Uso: total <id> [YYYY-MM]");
    await printTotal(employeeKey, month);
    break;
  }

  case "read": {
    const [employeeKey] = args;
    if (!employeeKey) fail('Uso: read "<empleado>" [YYYY-MM-DD]');
    const date = args[1] ?? todayLocal();
    const employee = await findEmployee(employeeKey, date);
    const range = cell(employee, date);
    const cells = await getRowCells(range);
    const current = cells[0] ?? { value: "", note: "" };
    console.log(`\n${employee.id} — ${date} — ${range}`);
    console.log(`  código actual: ${JSON.stringify(current.value)}`);
    console.log(`  nota actual: ${JSON.stringify(current.note)}\n`);
    break;
  }

  case "write": {
    const [employeeKey, date, code] = args;
    if (!employeeKey || !date || !code) {
      fail('Uso: write "<empleado>" YYYY-MM-DD <código> [--note "texto"] --yes');
    }
    if (!args.includes("--yes")) fail("Agrega --yes para confirmar la escritura.");
    const noteIndex = args.indexOf("--note");
    const note = noteIndex === -1 ? "" : (args[noteIndex + 1] ?? "");
    const employee = await findEmployee(employeeKey, date);
    const range = cell(employee, date);
    const beforeCells = await getRowCells(range);
    const before = beforeCells[0] ?? { value: "", note: "" };
    await updateCell(
      monthTab(date),
      employee.row,
      dayColumnIndex(date),
      code,
      note,
    );
    console.log(`\n${employee.id} — ${date} — ${range}`);
    console.log(
      `  código antes: ${JSON.stringify(before.value)} → ahora: ${JSON.stringify(code)}`,
    );
    console.log(
      `  nota antes: ${JSON.stringify(before.note)} → ahora: ${JSON.stringify(note)}\n`,
    );
    break;
  }

  case "summary":
  default: {
    const iso = todayLocal();
    const [tabs, employees] = await Promise.all([listTabs(), listEmployees(iso)]);
    console.log(`\nLibro: ${spreadsheetId}`);
    console.log(`Pestañas: ${tabs.length} · Empleados en ${monthTab(iso)}: ${employees.length}`);
    console.log(`Fecha de referencia: ${iso}\n`);
    console.log("Primeros empleados:");
    for (const employee of employees.slice(0, 5)) {
      console.log(`  fila ${String(employee.row).padStart(3)}  ${employee.name}`);
    }
    console.log(
      "\nComandos: tabs | employees [fecha] | read <empleado> [fecha] | write <empleado> <fecha> <código> [--note \"texto\"] --yes | month <id> YYYY-MM | total <id> [YYYY-MM]\n",
    );
    break;
  }
}
