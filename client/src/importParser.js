// turns a spreadsheet (rows of cells) or pasted text into a list of songs
// output rows look like { title, artist, duration } where duration is seconds or null

// "3:45" -> 225, "1:02:03" -> 3723, 225 -> 225, "225" -> 225
// excel can also hand back a time cell as a Date or as a fraction of a day (0.0026)
export function parseDuration(value) {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    const seconds =
      value.getUTCHours() * 3600 +
      value.getUTCMinutes() * 60 +
      value.getUTCSeconds();
    return seconds > 0 ? seconds : null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value < 1) return Math.round(value * 86400);
    return Math.round(value);
  }

  const text = String(value).trim();

  if (/^\d+:\d{1,2}(:\d{1,2})?$/.test(text)) {
    const parts = text.split(":").map(Number);
    if (parts.slice(1).some((n) => n >= 60)) return null;
    const seconds = parts.reduce((total, n) => total * 60 + n, 0);
    return seconds > 0 ? seconds : null;
  }

  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    return seconds > 0 ? seconds : null;
  }

  return null;
}

const clean = (cell) => (cell === null || cell === undefined ? "" : String(cell).trim());

const looksLikeDuration = (cell) =>
  cell instanceof Date || parseDuration(cell) !== null;

// which column is which, from a header row like Track # | Title | Artist | Duration
function readHeader(row) {
  const find = (pattern) =>
    row.findIndex((cell) => pattern.test(clean(cell)));

  const title = find(/title|song|track\s*name|^name$|^track$/i);
  const artist = find(/artist|band|singer|performer/i);
  const duration = find(/duration|length|time|runtime/i);

  // it's a header row if it names at least the title and artist columns
  return title !== -1 && artist !== -1 ? { title, artist, duration } : null;
}

// rows = array of arrays of cells (what the xlsx reader gives, or pasted text split up)
export function rowsToSongs(rows) {
  const data = rows.filter((row) => row.some((cell) => clean(cell) !== ""));
  if (data.length === 0) return [];

  let columns = readHeader(data[0]);
  let body = data;

  if (columns) {
    body = data.slice(1);
  } else {
    // no header: guess. A first column of plain whole numbers is a "#" column.
    // Rows with a single cell ("Title - Artist") don't count either way.
    const multi = body.filter((row) => row.filter((cell) => clean(cell) !== "").length > 1);
    const hasNumberColumn =
      multi.length > 0 &&
      multi.every((row) => /^\d{1,3}\.?$/.test(clean(row[0]))) &&
      multi.every((row) => row.length >= 4 || (row.length === 3 && looksLikeDuration(row[2])));
    const offset = hasNumberColumn ? 1 : 0;
    columns = { title: offset, artist: offset + 1, duration: offset + 2 };
  }

  return body.map((row) => {
    // a single "Title - Artist" cell
    if (row.filter((cell) => clean(cell) !== "").length === 1) {
      const only = clean(row.find((cell) => clean(cell) !== ""));
      const split = only.split(/\s+[-–—]\s+/);
      if (split.length >= 2) {
        return { title: split[0], artist: split.slice(1).join(" - "), duration: null };
      }
    }

    return {
      title: clean(row[columns.title]),
      artist: clean(row[columns.artist]),
      duration:
        columns.duration >= 0 ? parseDuration(row[columns.duration]) : null,
    };
  });
}

// split one csv line, keeping commas that are inside "quotes" together
function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }

  cells.push(cell);
  return cells;
}

// pasted text or a .csv file. Tabs (copied from a table or sheet) are best,
// "Title, Artist, 3:45" works too even when the artist has a comma in it
export function textToSongs(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  // with a header row (Title,Artist,Duration) every line is a normal csv line
  const firstLine = lines[0].includes("\t") ? lines[0].split("\t") : splitCsvLine(lines[0]);
  const hasHeader = readHeader(firstLine) !== null;

  const rows = lines.map((line) => {
    if (line.includes("\t")) return line.split("\t");
    if (!line.includes(",")) return [line];
    if (hasHeader) return splitCsvLine(line);

    const cells = splitCsvLine(line);
    // unquoted commas inside the artist: keep the first cell as the title,
    // the last one as the duration (if it is one) and join the rest as the artist
    if (cells.length > 3 || (cells.length === 3 && !looksLikeDuration(cells[2]))) {
      const last = cells[cells.length - 1];
      if (looksLikeDuration(last)) {
        return [cells[0], cells.slice(1, -1).join(","), last];
      }
      return [cells[0], cells.slice(1).join(",")];
    }
    return cells;
  });

  return rowsToSongs(rows);
}
