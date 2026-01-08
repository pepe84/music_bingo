import Papa from "papaparse";
import { useState } from "react";

function CsvLoader({ checksumKey, onLoadCsv }) {
  const [data, setData] = useState([]);
  const [preview, setPreview] = useState([]);
  const [fileText, setFileText] = useState(null);
  const [checksum, setChecksum] = useState(null);
  const [sameAsStored, setSameAsStored] = useState(false);
  
  const generateChecksum = async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleFile = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      setFileText(text);

      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      });

      setData(parsed.data);
      setPreview(parsed.data.slice(0, 5));

      const hash = await generateChecksum(text);
      setChecksum(hash);

      const storedHash = localStorage.getItem(checksumKey);
      setSameAsStored(hash === storedHash);
    };
    reader.readAsText(file);
  };

  const confirmLoad = () => {
    onLoadCsv(data, checksum, sameAsStored);
  };

  return (
    <div className="container mt-5">
      <h2>📂 Carregar CSV</h2>

      <input
        type="file"
        accept=".csv"
        className="form-control my-3"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {preview.length > 0 && (
        <>
          <h5>👀 Preview</h5>
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  {Object.keys(preview[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sameAsStored && (
            <div className="alert alert-warning">
              ⚠️ Aquest CSV és el mateix que l’últim carregat
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={confirmLoad}
          >
            ▶️ Carregar CSV
          </button>
        </>
      )}
    </div>
  );
}

export default CsvLoader;
