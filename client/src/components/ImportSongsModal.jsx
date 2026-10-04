import { useEffect, useRef, useState } from "react";
import { formatDuration, getPreview } from "../api";
import { parseDuration, rowsToSongs, textToSongs } from "../importParser";

const keyOf = (title, artist) =>
  `${title.trim().toLowerCase()}|${artist.trim().toLowerCase()}`;

// "Midnight_Vibes_Playlist.xlsx" -> "Midnight Vibes"
function nameFromFile(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s*\bplaylist\b\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// popup to add a whole list of songs: upload a spreadsheet or paste text,
// check the preview, then add them all in one go
// onImport(songs, name) should return a promise and throw if it fails
// withName: also ask for a playlist name (used when the import creates a new playlist)
export default function ImportSongsModal({
  existingSongs = [],
  withName = false,
  onImport,
  onClose,
}) {
  const [name, setName] = useState("");
  const nameEdited = useRef(false); // once typed by hand, don't overwrite it with the file name
  const [rows, setRows] = useState([]); // the preview rows
  const [source, setSource] = useState(""); // file name, shown after reading
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lookup, setLookup] = useState(null); // { done, total } while looking up durations
  const fileInput = useRef(null);
  const closed = useRef(false); // stops the lookup loop if the popup is closed
  useEffect(() => {
    closed.current = false; // StrictMode runs the cleanup once on mount, so reset it here
    return () => {
      closed.current = true;
    };
  }, []);

  // Escape closes the popup
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  // turn parsed songs into editable preview rows
  function showSongs(songs) {
    const already = new Set(existingSongs.map((s) => keyOf(s.title, s.artist)));
    const seen = new Set();

    const preview = songs.map((song, i) => {
      const key = keyOf(song.title, song.artist);
      const duplicate = already.has(key) || seen.has(key);
      seen.add(key);

      const complete = song.title && song.artist && song.duration;
      return {
        id: i,
        title: song.title,
        artist: song.artist,
        duration: song.duration ? formatDuration(song.duration) : "",
        duplicate,
        include: Boolean(complete) && !duplicate,
      };
    });

    setRows(preview);
    setError(preview.length === 0 ? "No songs found in that." : null);
  }

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setText("");
    setReading(true);

    try {
      const name = file.name.toLowerCase();
      let songs;

      if (name.endsWith(".xlsx")) {
        // only loaded when someone actually imports a spreadsheet
        const { readSheet } = await import("read-excel-file/browser");
        songs = rowsToSongs(await readSheet(file));
      } else if (/\.(csv|tsv|txt)$/.test(name)) {
        songs = textToSongs(await file.text());
      } else {
        throw new Error("Please choose an .xlsx, .csv or .txt file.");
      }

      setSource(file.name);
      if (withName && !nameEdited.current) setName(nameFromFile(file.name));
      showSongs(songs);
    } catch (err) {
      setRows([]);
      setSource("");
      setError(
        err.message.startsWith("Please")
          ? err.message
          : "Couldn’t read that file. Is it a valid .xlsx or .csv?"
      );
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function handleText(value) {
    setText(value);
    setSource("");
    if (value.trim() === "") {
      setRows([]);
      setError(null);
    } else {
      showSongs(textToSongs(value));
    }
  }

  function updateRow(id, changes) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...changes };
        // fixing a row that was missing something ticks it for you
        if (!("include" in changes)) {
          const wasComplete = isComplete(row);
          if (!wasComplete && isComplete(next) && !next.duplicate) next.include = true;
        }
        return next;
      })
    );
  }

  const isComplete = (row) =>
    row.title.trim() !== "" &&
    row.artist.trim() !== "" &&
    (parseDuration(row.duration) ?? 0) >= 1;

  const toAdd = rows.filter((row) => row.include && isComplete(row));
  const needFixing = rows.filter((row) => !isComplete(row)).length;
  const duplicates = rows.filter((row) => row.duplicate).length;

  // songs with no duration: ask iTunes for it, one at a time because it rate limits
  const missing = rows.filter(
    (row) => row.title.trim() && row.artist.trim() && !parseDuration(row.duration)
  );

  async function fillDurations() {
    const todo = missing.map((row) => row);
    setLookup({ done: 0, total: todo.length });

    for (let i = 0; i < todo.length; i++) {
      if (closed.current) return;
      try {
        const info = await getPreview(todo[i].artist.trim(), todo[i].title.trim());
        if (info.durationSeconds) {
          updateRow(todo[i].id, { duration: formatDuration(info.durationSeconds) });
        }
      } catch {
        // no match, the row stays red so it can be typed in by hand
      }
      if (closed.current) return;
      setLookup({ done: i + 1, total: todo.length });
      if (i < todo.length - 1) await new Promise((r) => setTimeout(r, 3200));
    }

    setLookup(null);
  }

  const needsName = withName && name.trim() === "";

  async function handleSubmit() {
    if (toAdd.length === 0 || needsName) return;
    try {
      setSubmitting(true);
      setError(null);
      await onImport(
        toAdd.map((row) => ({
          title: row.title.trim(),
          artist: row.artist.trim(),
          duration: parseDuration(row.duration),
        })),
        name.trim()
      );
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="modal import-modal"
        role="dialog"
        aria-label="Import songs"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{withName ? "Import a playlist" : "Import songs"}</h2>

        {withName && (
          <input
            className="import-name"
            placeholder="Playlist name"
            value={name}
            onChange={(e) => {
              nameEdited.current = true;
              setName(e.target.value);
            }}
            disabled={submitting}
            aria-label="Playlist name"
          />
        )}

        <div
          className={`dropzone${dragging ? " dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.csv,.tsv,.txt"
            hidden
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <button
            type="button"
            className="pill"
            onClick={() => fileInput.current.click()}
            disabled={reading || submitting}
          >
            {reading ? "Reading…" : "Choose a file"}
          </button>
          <p className="muted">
            or drop an Excel (.xlsx) or .csv file here. Columns: Title, Artist, Duration.
          </p>
        </div>

        <label className="import-label" htmlFor="import-text">
          Or paste your list
        </label>
        <textarea
          id="import-text"
          className="import-text"
          rows={4}
          placeholder={"Title\tArtist\t3:45\nor: Song name - Artist"}
          value={text}
          onChange={(e) => handleText(e.target.value)}
          disabled={submitting}
        />

        {error && <p className="error">{error}</p>}

        {rows.length > 0 && (
          <>
            <p className="muted import-summary">
              {source ? `${source} · ` : ""}
              {rows.length} found · {toAdd.length} will be added
              {duplicates > 0 && ` · ${duplicates} already in this playlist`}
              {needFixing > 0 && ` · ${needFixing} need a title, artist or duration`}
            </p>

            {(missing.length > 0 || lookup) && (
              <button
                type="button"
                className="pill ghost sm lookup-btn"
                onClick={fillDurations}
                disabled={lookup !== null || submitting}
              >
                {lookup
                  ? `Looking up durations… ${lookup.done}/${lookup.total}`
                  : `Fill ${missing.length} missing duration${missing.length === 1 ? "" : "s"} automatically`}
              </button>
            )}

            <div className="import-table">
              {rows.map((row) => {
                const complete = isComplete(row);
                return (
                  <div
                    key={row.id}
                    className={`import-row${row.include && complete ? "" : " skipped"}`}
                  >
                    <input
                      type="checkbox"
                      className="import-check"
                      checked={row.include && complete}
                      disabled={!complete || submitting}
                      onChange={(e) => updateRow(row.id, { include: e.target.checked })}
                      aria-label={`Add ${row.title || "this song"}`}
                    />
                    <input
                      value={row.title}
                      placeholder="Title"
                      onChange={(e) => updateRow(row.id, { title: e.target.value })}
                      disabled={submitting}
                    />
                    <input
                      value={row.artist}
                      placeholder="Artist"
                      onChange={(e) => updateRow(row.id, { artist: e.target.value })}
                      disabled={submitting}
                    />
                    <input
                      className={`import-dur${parseDuration(row.duration) ? "" : " bad"}`}
                      value={row.duration}
                      placeholder="m:ss"
                      onChange={(e) => updateRow(row.id, { duration: e.target.value })}
                      disabled={submitting}
                    />
                    {row.duplicate && <span className="import-tag">duplicate</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="pill ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pill"
            onClick={handleSubmit}
            disabled={submitting || toAdd.length === 0 || needsName}
          >
            {submitting
              ? withName ? "Creating…" : "Adding…"
              : toAdd.length > 0
                ? `${withName ? "Create with" : "Add"} ${toAdd.length} song${toAdd.length === 1 ? "" : "s"}`
                : withName ? "Create playlist" : "Add songs"}
          </button>
        </div>
      </div>
    </div>
  );
}
