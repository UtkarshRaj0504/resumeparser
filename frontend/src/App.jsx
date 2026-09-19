import { useState } from "react";
import "./App.css";

function formatLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function DetailValue({ value }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="empty">None listed</p>;
    return (
      <ul className="detail-list">
        {value.map((item, index) => (
          <li key={index}>{String(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (value === null || value === undefined || value === "") {
    return <p className="empty">Not provided</p>;
  }

  if (typeof value === "object") {
    return <pre className="nested">{JSON.stringify(value, null, 2)}</pre>;
  }

  return String(value);
}

function App() {
  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
    setResults([]);
    setError("");
  };

  const analyzeResumes = async (event) => {
    event.preventDefault();

    if (!jobDescription.trim()) {
      setError("Paste a job description first.");
      return;
    }

    if (files.length === 0) {
      setError("Select at least one PDF or DOCX resume.");
      return;
    }

    setLoading(true);
    setResults([]);
    setError("");

    const formData = new FormData();
    formData.append("job_description", jobDescription);
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      setError(
        "Could not reach the parser. Start FastAPI on port 8000, then try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="stage" aria-hidden="true" />

      <header className="brand-bar">
        <span className="mark" aria-hidden="true" />
        <strong>Resume Parser</strong>
      </header>

      <main className="shell">
        <section className="panel intake-panel">
          <p className="eyebrow">Talent match</p>
          <h1>Rank candidates against the role</h1>
          <p className="copy">
            Paste the job description, attach PDF or DOCX resumes, and get a
            scored shortlist.
          </p>

          <form className="intake" onSubmit={analyzeResumes}>
            <label className="field">
              <span>Job description</span>
              <textarea
                id="job"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the complete job description"
                rows={8}
              />
            </label>

            <label className="file-surface">
              <input
                type="file"
                accept=".pdf,.docx"
                multiple
                onChange={handleFileChange}
              />
              <span className="file-title">
                {files.length
                  ? `${files.length} resume${files.length === 1 ? "" : "s"} selected`
                  : "Upload resumes"}
              </span>
              <span className="file-hint">PDF or DOCX · multiple files allowed</span>
            </label>

            {files.length > 0 ? (
              <ul className="file-list">
                {files.map((file) => (
                  <li key={file.name}>
                    <span>{file.name}</span>
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Analyzing…" : "Parse resumes"}
            </button>

            {error ? <p className="error">{error}</p> : null}
            {loading ? (
              <p className="status">Reading and comparing resumes…</p>
            ) : null}
          </form>
        </section>

        {results.length > 0 && !loading ? (
          <section className="results" aria-live="polite">
            <div className="results-head">
              <h2>Ranked candidates</h2>
              <p>
                {results.length} analyzed
              </p>
            </div>

            {results.map((result, index) => (
              <article
                className="candidate"
                key={`${result.filename}-${index}`}
              >
                <header>
                  <div>
                    <p className="sub">
                      #{index + 1} · {result.filename}
                    </p>
                    <h3>{result.name || "Unknown candidate"}</h3>
                    <p className="sub">{result.email || "Email not found"}</p>
                  </div>
                  <div className="score-chip">
                    <span className="score">{result.score}%</span>
                    <span>Match</span>
                  </div>
                </header>

                <div className="meta-row">
                  <div className="meta">
                    <span>Experience</span>
                    <strong>
                      {result.experience != null
                        ? `${result.experience} years`
                        : "Not found"}
                    </strong>
                  </div>
                </div>

                <div className="block">
                  <h4>Skills</h4>
                  {result.skills?.length ? (
                    <div className="tags">
                      {result.skills.slice(0, 16).map((skill, skillIndex) => (
                        <span className="tag" key={`${skill}-${skillIndex}`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="empty">None found</p>
                  )}
                </div>

                <div className="block">
                  <h4>Education</h4>
                  {result.education?.length ? (
                    <ul className="detail-list">
                      {result.education.map((item, educationIndex) => (
                        <li key={educationIndex}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty">Not found</p>
                  )}
                </div>

                {result.details && Object.keys(result.details).length > 0 ? (
                  <div className="analysis">
                    <h4>AI analysis</h4>
                    <div className="analysis-grid">
                      {Object.entries(result.details).map(([key, value]) => (
                        <div className="analysis-card" key={key}>
                          <h5>{formatLabel(key)}</h5>
                          <DetailValue value={value} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;
