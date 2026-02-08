import { createContext, useContext, useState, useEffect } from "react";
import CsvLoader from "./components/CsvLoader";

const CsvContext = createContext(null);

const useCsvContext = () => {
  const ctx = useContext(CsvContext);
  if (!ctx) {
    throw new Error("Csv components must be used inside <BingoCsvLoader>");
  }
  return ctx;
};

function BingoCsvLoader({ children, resetSongs }) {

  const CSV_STORAGE_KEY = "MBA_last_csv";
  const CSV_CHECKSUM_KEY = "MBA_last_csv_checksum";
  const STRICT_CSV_MODE = true;

  const REQUIRED_COLUMNS = ["Num", "Title", "Artist", "Year"];
  const MEDIA_COLUMNS = ["Audio", "Video","YouTube"];
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvValid, setCsvValid] = useState(false);

  const normalizePublicPath = (file, folder) => {
    if (!file) return null;
    // si ja és una URL absoluta, no la toquem
    if (file.startsWith("http")) return file;
    // assegurem ruta absoluta des de /public
    return `/${folder}/${file}`;
  }

  const normalizeStart = (value) => {
    const n = Number(value);
    if (Number.isNaN(n) || n < 0) return 0;
    return Math.floor(n);
  }

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;

    let videoId = null;
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1];
    } else if (url.includes("watch?v=")) {
      videoId = new URL(url).searchParams.get("v");
    }

    if (!videoId) return null;

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0`;
  }

  const validateAndNormalizeSongs = (rows) => {
    const errors = [];
    const validSongs = [];

    rows.forEach((row, index) => {
      const line = index + 2; // CSV header = line 1

      for (const col of REQUIRED_COLUMNS) {
        if (!row[col] || !row[col].toString().trim()) {
          errors.push(`Row ${line}: missing column '${col}'`);
        }
      }

      let mediaColumn = false;
      for (const col of MEDIA_COLUMNS) {
        if (row[col] && row[col].toString().trim().length) {
          mediaColumn = true;
        }
      }
      if (!mediaColumn) {
        errors.push(`Row ${line}: missing multimedia column (${MEDIA_COLUMNS.join()})`);
      }
      
      validSongs.push({
        num: row.Num.trim(),
        title: row.Title.trim(),
        artist: row.Artist.trim(),
        year: row.Year.trim(),
        audio: normalizePublicPath(row.Audio, "audio"),
        video: normalizePublicPath(row.Video, "video"),
        youtube: getYouTubeEmbedUrl(row.YouTube),
        start: normalizeStart(row.Start),
      });
    });

    return { validSongs, errors };
  }
  
  // ---- LOAD CSV TEXT ----
  const resetCsv = (songs = []) => {
    setCsvErrors([]);
    setCsvValid(true);
    resetSongs(songs);
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
  const removeCurrentCsv = () => {
    resetCsv();
    setCsvValid(false); // Reload
    localStorage.removeItem(CSV_STORAGE_KEY);
    localStorage.removeItem(CSV_CHECKSUM_KEY);
    console.log("Current CSV removed");
  }

  // ---- PARENT COMPONENT ----
  return (
    <CsvContext.Provider value={{
      CSV_CHECKSUM_KEY,
      csvErrors,
      csvValid,
      loadCsvText,
      removeCurrentCsv
    }}>
      {children}
    </CsvContext.Provider>
  );
}

BingoCsvLoader.Loader = function Loader({title, buttonText, warningMsg}) {

  const { csvErrors, csvValid, loadCsvText, CSV_CHECKSUM_KEY } = useCsvContext();

  return (
    <>
      {/* CSV LOADER */}
      {!csvValid && (
        <CsvLoader 
          checksumKey={CSV_CHECKSUM_KEY} 
          onLoadCsv={loadCsvText}
          title={title}
          buttonText={buttonText}
          warningMsg={warningMsg}
        />
      )}

      {/* CSV ERRORS */}
      {(csvErrors.length > 0) && (
        <div className="alert alert-danger">
          <ul>
            {csvErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </>);
}

BingoCsvLoader.ClearButton = function ClearButton({
  className = "btn btn-secondary",
  children = "⬆️ Upload CSV",
}) {
  const { removeCurrentCsv } = useCsvContext();

  return (
    <button className={className} onClick={removeCurrentCsv}>
      {children}
    </button>
  );
};


export default BingoCsvLoader;