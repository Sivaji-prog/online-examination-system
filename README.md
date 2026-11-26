# ExamPilot - Online Examination System

A simple FSD lab project built with React, Node.js, Express, and a local JSON file. No MySQL or MongoDB installation is required.

## Features
- Administrator can create an examination, set its duration, add multiple-choice questions, and select the correct option.
- Students can enter their name, choose an examination, answer questions, and submit responses.
- A countdown timer automatically submits the exam when the time reaches zero.
- The backend evaluates answers automatically and stores the result.
- Administrator can view student names, exam performance, scores, percentages, and submission times.
- Exam and result records are saved in `server/data/store.json`.

## Requirements
- Node.js LTS (includes npm)
- Visual Studio Code (recommended)
- Internet connection for the first `npm install`

## Run on Windows
Open two terminals in VS Code. If PowerShell blocks `npm`, use `npm.cmd` as shown below.

### Terminal 1 - Backend
```powershell
cd server
npm.cmd install
npm.cmd run dev
```
Backend: http://localhost:5000

### Terminal 2 - Frontend
```powershell
cd client
npm.cmd install
npm.cmd run dev
```
Website: http://localhost:5173

## Demonstration steps
1. Open the website and choose **Administrator**.
2. Enter an examination title and duration.
3. Add at least one question, enter all four options, and select the correct answer.
4. Click **Create examination**.
5. Choose **Student Portal**, enter a student name, and start the examination.
6. Select answers and submit. The score is evaluated automatically.
7. Return to **Administrator** to view the submission in Student results.

## Data storage
The app stores information in `server/data/store.json`. Back up this file to keep a copy of created exams and results. This is a teaching/demo project: it has no login system and should not be used for real high-stakes examinations without authentication, server-side access controls, and stronger exam-security measures.
