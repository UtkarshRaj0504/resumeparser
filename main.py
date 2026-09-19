from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
from pathlib import Path
import tempfile

from resumeparser import parse_resume, final_score, read_resume, get_job


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Resume Analyzer Backend is running"
    }


@app.post("/analyze")
async def analyze_resumes(
    job_description: Annotated[str, Form(...)],
    files: Annotated[
        list[UploadFile],
        File(description="Upload PDF or DOCX resumes")
    ]
):
    results = []

    # Convert the supplied job description into structured data
    job = get_job(job_description)

    for file in files:
        suffix = Path(file.filename).suffix.lower()

        if suffix not in [".pdf", ".docx"]:
            continue

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp:
            content = await file.read()
            temp.write(content)
            temp_path = Path(temp.name)

        try:
            resume_text = read_resume(temp_path)
            parsed_resume = parse_resume(resume_text)
            result = final_score(job, parsed_resume)

            results.append({
                "filename": file.filename,
                "name": parsed_resume.name,
                "email": parsed_resume.email,
                "experience": parsed_resume.total_experience_years,
                "skills": parsed_resume.skills,
                "education": parsed_resume.education,
                "score": result.score,
                "details": result.details
            })

        finally:
            temp_path.unlink(missing_ok=True)

    results.sort(
        key=lambda candidate: candidate["score"],
        reverse=True
    )

    return {
        "results": results
    }