import { useEffect, useState } from "react";
import CsvLoader from "./CsvLoader";

const CSV_STORAGE_KEY = "MBA_last_csv";
const CSV_CHECKSUM_KEY = "MBA_last_csv_checksum";
const STRICT_CSV_MODE = true;

// ---- VALIDATION ----
function normalizePublicPath(file, folder) {
  if (!file) return null;

  // si ja és una URL absoluta, no la toquem
  if (file.startsWith("http")) return file;

  // assegurem ruta absoluta des de /public
  return `/${folder}/${file}`;
}

function validateAndNormalizeSongs(rows) {
  const errors = [];
  const validSongs = [];

  rows.forEach((row, index) => {
    const line = index + 2; // CSV header = line 1

    if (!row.Title) {
      errors.push(`Línia ${line}: falta la columna 'Title'`);
      return;
    }

    if (!row.Audio && !row.Video && !row.YouTube) {
      errors.push(`Línia ${line}: cal Audio, Video o YouTube`);
      return;
    }
    
    validSongs.push({
      title: row.Title.trim(),
      audio: normalizePublicPath(row.Audio, "audio"),
      video: normalizePublicPath(row.Video, "video"),
      youtube: row.YouTube || null,
    });
  });

  return { validSongs, errors };
}

export default function App() {
  const [songs, setSongs] = useState([]);
  const [originalSongs, setOriginalSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playedSongs, setPlayedSongs] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);

  const [csvErrors, setCsvErrors] = useState([]);
  const [csvValid, setCsvValid] = useState(true);

  // ---- LOAD CSV TEXT ----
  const loadCsvText = (data, checksum) => {

    const { validSongs, errors } = validateAndNormalizeSongs(data);

    if (errors.length) {
      setCsvErrors(errors);
      setCsvValid(false);
      if (STRICT_CSV_MODE) return;
    }

    setCsvErrors([]);
    setCsvValid(true);
    setSongs(validSongs);
    setOriginalSongs(validSongs);
    setCurrentIndex(0);
    setPlayedSongs(new Set());
    setIsPlaying(false);

    localStorage.setItem(CSV_STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(CSV_CHECKSUM_KEY, checksum);
  };

  // ---- AUTO LOAD FROM STORAGE ----
  useEffect(() => {
    const savedCsv = localStorage.getItem(CSV_STORAGE_KEY);
    const savedHash = localStorage.getItem(CSV_CHECKSUM_KEY);

    if (savedCsv && savedHash) {
      loadCsvText(JSON.parse(savedCsv), savedHash);
    }
  }, []);

  // ---- PLAYER LOGIC ----
  const currentSong = songs[currentIndex];

  const nextSong = () => {
    if (!songs.length) return;

    const newPlayed = new Set(playedSongs);
    newPlayed.add(currentIndex);
    setPlayedSongs(newPlayed);

    const remaining = songs
      .map((_, i) => i)
      .filter((i) => !newPlayed.has(i));

    if (!remaining.length) return;

    const randomIndex = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrentIndex(randomIndex);
    setIsPlaying(false);
  };
  
  // ---- RENDER ----
  if (!songs.length && csvValid) {
    return <CsvLoader checksumKey={CSV_CHECKSUM_KEY} onLoadCsv={loadCsvText} />;
  }

  return (
    <div className="container mt-4">
      <h1>🎵 Bingo Musical</h1>

      {csvErrors.length > 0 && (
        <div className="alert alert-danger">
          <ul>
            {csvErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {currentSong && (
        <div className="card p-4 mt-3">
          <h3>{currentSong.title}</h3>

          {currentSong.audio && (
            <audio
              src={currentSong.audio}
              controls
              autoPlay={isPlaying}
              onPlay={() => setIsPlaying(true)}
            />
          )}

          {currentSong.video && (
            <video
              src={currentSong.video}
              controls
              autoPlay={isPlaying}
              width="100%"
              onPlay={() => setIsPlaying(true)}
            />
          )}

          {!currentSong.audio && !currentSong.video && currentSong.youtube && (
            <iframe
              width="100%"
              height="315"
              src={currentSong.youtube.replace("watch?v=", "embed/")}
              title="YouTube player"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          )}

          <button className="btn btn-success mt-3" onClick={nextSong}>
            ▶️ Següent cançó
          </button>
        </div>
      )}
    </div>
  );
}
