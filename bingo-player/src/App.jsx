import { useEffect, useRef, useState } from "react";
import CsvLoader from "./CsvLoader";
import logo from './assets/logo-light.png'
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  /* =======================
     STATE
  ======================= */
  const [originalSongs, setOriginalSongs] = useState([]);
  const [songs, setSongs] = useState([]);
  const [playedSongs, setPlayedSongs] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [autoCut, setAutoCut] = useState(true);

  /* =======================
     REFS
  ======================= */
  const mediaRef = useRef(null);
  const cutTimeoutRef = useRef(null);

  /* =======================
     LOAD CSV
  ======================= */
  const CSV_STORAGE_KEY = "MBA_last_csv";
  const CSV_CHECKSUM_KEY = "MBA_last_csv_checksum";
  const STRICT_CSV_MODE = true;

  const REQUIRED_COLUMNS = ["Num", "Title", "Artist", "Year"];
  const MEDIA_COLUMNS = ["Audio", "Video","YouTube"];
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvValid, setCsvValid] = useState(true);

  function normalizePublicPath(file, folder) {
    if (!file) return null;
    // si ja és una URL absoluta, no la toquem
    if (file.startsWith("http")) return file;
    // assegurem ruta absoluta des de /public
    return `/${folder}/${file}`;
  }

  const getYouTubeEmbedUrl = (url, start = 0) => {
    if (!url) return null;

    let videoId = null;
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1];
    } else if (url.includes("watch?v=")) {
      videoId = new URL(url).searchParams.get("v");
    }

    if (!videoId) return null;

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&start=${start}`;
  }

  function validateAndNormalizeSongs(rows) {
    const errors = [];
    const validSongs = [];

    rows.forEach((row, index) => {
      const line = index + 2; // CSV header = line 1

      for (const col of REQUIRED_COLUMNS) {
        if (!row[col] || !row[col].toString().trim()) {
          errors.push(`Fila ${line}: falta la columna '${col}'`);
        }
      }

      let mediaColumn = false;
      for (const col of MEDIA_COLUMNS) {
        if (row[col] && row[col].toString().trim().length) {
          mediaColumn = true;
        }
      }
      if (!mediaColumn) {
        errors.push(`Fila ${line}: falta columna multimedia (${MEDIA_COLUMNS.join()})`);
      }
     
      validSongs.push({
        num: row.Num.trim(),
        title: row.Title.trim(),
        artist: row.Artist.trim(),
        year: row.Year.trim(),
        audio: normalizePublicPath(row.Audio, "audio"),
        video: normalizePublicPath(row.Video, "video"),
        youtube: getYouTubeEmbedUrl(row.YouTube) || null,
      });
    });

    return { validSongs, errors };
  }
  
  // ---- LOAD CSV TEXT ----
  const resetCsv = (songs = []) => {
    setCsvErrors([]);
    setCsvValid(true);
    setSongs(songs);
    setOriginalSongs(songs);
    setPlayedSongs(new Set());
    setCurrentIndex(0);
    setIsPlaying(false);
  }

  const loadCsvText = (data, checksum) => {

    const { validSongs, errors } = validateAndNormalizeSongs(data);

    if (errors.length) {
      setCsvErrors(errors);
      setCsvValid(false);
      if (STRICT_CSV_MODE) return;
    }

    resetCsv(validSongs);
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

  // ---- UPLOAD NEW CSV ----

  function removeCurrentCsv() {
    resetCsv();
    localStorage.removeItem(CSV_STORAGE_KEY);
    localStorage.removeItem(CSV_CHECKSUM_KEY);
    console.log("Current CSV removed");
  }

  /* =======================
     Play / Pause handling
  ======================= */

  useEffect(() => {
    if (!mediaRef.current) return;

    mediaRef.current.volume = volume;

    if (isPlaying) {
      mediaRef.current.play();
      handleAutoCut();
    } else {
      mediaRef.current.pause();
      clearTimeout(cutTimeoutRef.current);
    }

    return () => clearTimeout(cutTimeoutRef.current);
  }, [currentIndex, isPlaying, volume]);

  /* =======================
     AUTO CUT 
  ======================= */

  const handleAutoCut = () => {
    clearAutoCut();
    if (!autoCut) return;
    const seconds = Math.floor(Math.random() * 15) + 15;
    cutTimeoutRef.current = setTimeout(() => {
      nextSong();
    }, seconds * 1000);
  };

  const clearAutoCut = () => {
    if (cutTimeoutRef.current) {
      clearTimeout(cutTimeoutRef.current);
      cutTimeoutRef.current = null;
    }
  };  

  /* =======================
     Controls
  ======================= */
  const playPause = () => setIsPlaying((prev) => !prev);

  const nextSong = () => {
    clearAutoCut();
    markAsPlayed(currentIndex);
    setCurrentIndex((prev) => (prev + 1) % songs.length);
    setIsPlaying(true);
  };

  const prevSong = () => {
    clearAutoCut();
    markAsPlayed(currentIndex);
    setCurrentIndex((prev) =>
      prev === 0 ? songs.length - 1 : prev - 1
    );
    setIsPlaying(true);
  };

  /* =======================
     PLAYED SONGS
  ======================= */
  const markAsPlayed = (index) => {
    setPlayedSongs((prev) => new Set(prev).add(index));
  };

  /* =======================
     RENDER
  ======================= */
  
  const currentSong = songs[currentIndex];
  const hasVideo = currentSong?.video && currentSong?.video.trim() !== "";

  const totalSongs = songs.length;
  const playedCount = playedSongs.size;
  const remainingCount = totalSongs - playedCount;

  return (
    <div className="container py-4">
      <h2 className="mb-3 text-center"><img src={logo} width="32"/> Bingo Musical</h2>

      {/* CSV LOADER */}
      {(!songs.length || !csvValid) && (
        <CsvLoader checksumKey={CSV_CHECKSUM_KEY} onLoadCsv={loadCsvText} />
      )}

      {/* CSV ERRORS */}
      {csvErrors.length > 0 && (
        <div className="alert alert-danger">
          <ul>
            {csvErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* PLAYER */}
      {songs.length && csvValid && (
        <>
          <div className="mb-3 text-center">
            <button className="btn btn-secondary" onClick={removeCurrentCsv}>
            Pujar nou CSV
            </button>
          </div>
          <div className="mb-3 text-center">
            {hasVideo ? (
              <video
                ref={mediaRef}
                src={currentSong.video}
                width="100%"
                controls={true}
              />
            ) : (
              <audio
                ref={mediaRef}
                src={currentSong.audio}
                controls={true}
              />
            )}
          </div>

          {/* SONG INFO */}
          <h4 className="my-4 text-center">
            {currentSong.num}. {currentSong.title} - <strong>{currentSong.artist.toUpperCase()}</strong> ({currentSong.year})
          </h4>
          <h2 className="text-center my-4">
            <span className="fw-bold">⏳ {playedCount} / {totalSongs}</span> ({remainingCount} pendents)
          </h2>
          
          {/* CONTROLS */}
          <div className="d-flex justify-content-center gap-3 mb-4">
            <button className="btn btn-secondary" onClick={prevSong}>
              ⏮
            </button>
            <button className="btn btn-primary" onClick={playPause}>
              {isPlaying ? "⏸ Pause" : "▶️ Play"}
            </button>
            <button className="btn btn-secondary" onClick={nextSong}>
              ⏭
            </button>
          </div>

          {/* OPTIONS */}
          <div className="row align-items-center mb-4">
            <div className="col-md-6">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={autoCut}
                  onChange={(e) => setAutoCut(e.target.checked)}
                  id="autoCut"
                />
                <label className="form-check-label" htmlFor="autoCut">
                  Tall automàtic (15-30 s)
                </label>
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">
                🔊 Volum: {Math.round(volume * 100)}%
              </label>
              <input
                type="range"
                className="form-range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>
          </div>

          {/* PLAYLIST */}
          <ul className="list-group">
            {songs.map((song, index) => (
              <li
                key={index}
                className={`list-group-item ${
                  index === currentIndex ? "active" : ""
                }`}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsPlaying(true);
                }}
              >
                {song.num}. {song.title} - {song.artist} ({song.year})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
