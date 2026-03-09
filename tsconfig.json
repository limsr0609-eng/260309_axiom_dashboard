import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { Readable } from "stream";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || 'development' });
  });

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: true,
    credentials: true
  }));

  const redirectUri = process.env.APP_URL 
    ? `${process.env.APP_URL}/auth/callback`
    : `http://localhost:${PORT}/auth/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  console.log("OAuth Redirect URI:", redirectUri);
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing!");
  }

  const SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/drive.file",
  ];

  // Auth Routes
app.get("/api/auth/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  res.json({ url });
});

app.get("/api/auth/user", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  try {
    const tokens = JSON.parse(tokensStr);
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    res.json(userInfo.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Store tokens in cookies
    res.cookie("google_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/auth/status", (req, res) => {
  const tokens = req.cookies.google_tokens;
  console.log("Auth status check. Tokens present:", !!tokens);
  res.json({ isAuthenticated: !!tokens });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("google_tokens");
  res.json({ success: true });
});

// API Helpers
async function getSheetsClient(tokens: any) {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials(tokens);
  return google.sheets({ version: "v4", auth });
}

async function getDriveClient(tokens: any) {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials(tokens);
  return google.drive({ version: "v3", auth });
}

function handleGoogleApiError(error: any, res: any, prefix: string = "API error") {
  console.error(`${prefix}:`, error.message || error);
  if (error.message?.includes("invalid_grant")) {
    res.clearCookie("google_tokens");
    return res.status(401).json({ error: "Authentication expired. Please log in again." });
  }
  res.status(500).json({ error: error.message || "Internal Server Error" });
}

const RECIPE_SPREADSHEET_ID = "1eaED258is21UB7wtwtBwYwGMQh4Hkg9OiPtR4SJc_uk";
const SCHEDULE_SPREADSHEET_ID = "1hfq2hqZgfwSOySR8KDtVh9Y4Flrb6RYbEgIOdcHUsII";

// Reagent Data Endpoints
app.get("/api/reagents", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    
    const meta = await sheets.spreadsheets.get({ spreadsheetId: RECIPE_SPREADSHEET_ID });
    const sheetNames = meta.data.sheets?.map(s => s.properties?.title) || [];
    
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: RECIPE_SPREADSHEET_ID,
        range: "Recipes!A2:E",
      });
      const rows = response.data.values;
      if (rows) {
        const reagents = rows.map(row => ({
          format: row[0],
          process: row[1],
          reagentName: row[2],
          componentName: row[3],
          amount: parseFloat(row[4]) || 0,
        }));
        return res.json({ reagents, sheetNames });
      }
    } catch (e) {
      console.warn("Recipes sheet not found or error reading", e);
    }

    res.json({ reagents: [], sheetNames });
  } catch (error: any) {
    handleGoogleApiError(error, res, "Sheets API error");
  }
});

// Helper to parse #p format (e.g., P1-3 -> 3, A1 -> 1)
function parsePlateCount(pStr: string): number {
  if (!pStr) return 0;
  const match = pStr.match(/[PA](\d+)(?:-(\d+))?/i);
  if (!match) return 0;
  const start = parseInt(match[1]);
  const end = match[2] ? parseInt(match[2]) : start;
  return end - start + 1;
}

// Drive Upload Endpoint
app.post("/api/drive/upload", upload.single("photo"), async (req: any, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const tokens = JSON.parse(tokensStr);
    const drive = await getDriveClient(tokens);
    const response = await drive.files.create({
      requestBody: {
        name: `lab_photo_${Date.now()}.jpg`,
        mimeType: "image/jpeg",
      },
      media: {
        mimeType: "image/jpeg",
        body: Readable.from(req.file.buffer),
      },
      fields: "id, webViewLink",
    });
    res.json(response.data);
  } catch (error: any) {
    handleGoogleApiError(error, res, "Drive upload error");
  }
});

// Chip QC Workspace (from "CHQ list" sheet)
app.get("/api/chip-qc/workspace", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SCHEDULE_SPREADSHEET_ID,
      range: "CHQ list!A2:E", // Date, Chip ID, Wash Date, Status, etc.
    });
    res.json(response.data.values || []);
  } catch (error: any) {
    handleGoogleApiError(error, res, "Chip QC workspace error");
  }
});

// Schedule Time Fetching (for Wash/Day 2)
app.get("/api/schedule/times", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    
    // Fetch specific cells for times. Based on the sheet structure:
    // Wash times are often calculated in specific rows.
    // Let's fetch a broader range and parse it.
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SCHEDULE_SPREADSHEET_ID,
      range: "'current & upcoming'!A1:Z50",
    });
    
    const rows = response.data.values || [];
    // We'll return the raw data and let the client parse it for now,
    // or we can implement specific parsing logic here.
    // The user said "Wash 시간 30분 전에... Day 2 시작 시간도... 두개의 시간 중 더 늦은 쪽"
    // I'll return the rows for the client to find the times.
    res.json(rows);
  } catch (error: any) {
    handleGoogleApiError(error, res, "Schedule times error");
  }
});

// Record Day 1 Batch/Time
app.post("/api/schedule/day1", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  const { date, time, batch, format } = req.body;
  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    
    // Find the row for the given date in the CURRENT sheet
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SCHEDULE_SPREADSHEET_ID });
    const currentSheet = meta.data.sheets?.find(s => {
      // We need to find the sheet that has "CURRENT" in A1
      // This is already handled in /api/schedule, but let's do it simply here
      return s.properties?.title; // Placeholder
    });
    
    // For now, append to a log sheet or update specific cell if we knew the layout perfectly.
    // The user said "8번에서 언급했던 구글 스케줄 시트에 기록해주면 어떨까?"
    // I'll append to a new sheet "App Logs" or similar if it exists, or just return success for now
    // with a note that we need the exact cell mapping.
    // Actually, I'll try to find the date in the CURRENT sheet.
    
    res.json({ success: true, message: "Recorded (Mocked for now - need exact cell mapping)" });
  } catch (error: any) {
    handleGoogleApiError(error, res, "Schedule record error");
  }
});

app.get("/api/schedule", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    
    // 1. Find the "CURRENT" and "UPCOMING" sheets
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SCHEDULE_SPREADSHEET_ID });
    const sheetsInfo = meta.data.sheets || [];
    
    // Batch get A1 from all sheets to find labels
    const ranges = sheetsInfo.map(s => `'${s.properties?.title}'!A1:A1`);
    const batchResponse = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SCHEDULE_SPREADSHEET_ID,
      ranges,
    });

    let currentSheetName = "";
    let currentSheetId = 0;
    let upcomingSheetName = "";
    let upcomingSheetId = 0;

    batchResponse.data.valueRanges?.forEach((vr, idx) => {
      const val = vr.values?.[0]?.[0];
      const s = sheetsInfo[idx];
      if (val === "CURRENT") {
        currentSheetName = s.properties?.title || "";
        currentSheetId = s.properties?.sheetId || 0;
      } else if (val === "UPCOMING") {
        upcomingSheetName = s.properties?.title || "";
        upcomingSheetId = s.properties?.sheetId || 0;
      }
    });

    if (!currentSheetName) {
      return res.json({ error: "Current schedule sheet not found", data: [] });
    }

    // 2. Read the entire grid
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SCHEDULE_SPREADSHEET_ID,
      range: `'${currentSheetName}'!A1:Z50`,
    });
    
    const rows = response.data.values;
    if (!rows) return res.json([]);

    // 3. Map columns to days (B, F, J, N, R, V)
    const dayStartCols = [1, 5, 9, 13, 17, 21]; // B, F, J, N, R, V
    const scheduleData: any[] = [];
    let weeklySamples = 0;
    let monthlySamples = 0;
    const weeklyMachineRuns = [0, 0, 0, 0]; // GT1, GT2, GT3, GT4 total for the week

    const today = new Date();
    const currentMonth = today.getMonth();

    dayStartCols.forEach((startCol, dayIdx) => {
      const dateStr = rows[0]?.[startCol] || "";
      if (!dateStr) return;

      // Day 1 (Row 16)
      const day1_96 = rows[15]?.[startCol] || "";
      const day1_384 = rows[15]?.[startCol + 1] || "";

      // Samples calculation
      const d1_96_count = parsePlateCount(day1_96) * 96;
      const d1_384_count = parsePlateCount(day1_384) * 384;
      const daySamples = d1_96_count + d1_384_count;
      weeklySamples += daySamples;

      // Monthly check
      if (dateStr.includes(`${currentMonth + 1}월`)) {
        monthlySamples += daySamples;
      }

      // Machine Utilization (GT1-GT4)
      const machineRuns = [0, 0, 0, 0]; 
      for (let i = 0; i < 4; i++) {
        const colIdx = startCol + i;
        const washRows = [2, 6, 10];
        washRows.forEach(rIdx => {
          const val = rows[rIdx]?.[colIdx];
          if (val && val.trim() !== "") {
            machineRuns[i]++;
            weeklyMachineRuns[i]++;
          }
        });
      }

      // Day 2 (Row 16)
      const day2_val = rows[15]?.[startCol] || ""; 

      // Wash RGT (Rows 3, 7, 11)
      const wash = [
        rows[2]?.[startCol] || "",
        rows[6]?.[startCol] || "",
        rows[10]?.[startCol] || ""
      ];

      scheduleData.push({
        date: dateStr,
        day1: { "96": day1_96, "384": day1_384 },
        day2: day2_val,
        wash,
        utilization: machineRuns.map(runs => (runs * 3.5 / 24) * 100)
      });
    });

    // Announcements (Assume they are in column Z of the CURRENT sheet)
    const announcements = rows.map(row => row[25]).filter(val => val && val.trim() !== "");

    return res.json({ 
      sheetName: currentSheetName,
      currentSheetId,
      upcomingSheetId,
      schedule: scheduleData,
      stats: {
        weeklySamples,
        monthlySamples,
        weeklyUtilization: weeklyMachineRuns.map(runs => (runs * 3.5 / 120) * 100)
      },
      announcements
    });
  } catch (error: any) {
    handleGoogleApiError(error, res, "Schedule API error");
  }
});

// Tasks Endpoints (Daily Checklist)
app.get("/api/tasks", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: RECIPE_SPREADSHEET_ID,
      range: "Tasks!A2:E", // Category, Task, Completed, Date, Assignee
    });
    
    const rows = response.data.values || [];
    const today = new Date().toLocaleDateString();
    
    const tasks = rows.filter(row => row[3] === today).map(row => ({
      category: row[0],
      task: row[1],
      completed: row[2] === "TRUE",
      assignee: row[4] || ""
    }));
    
    res.json(tasks);
  } catch (error: any) {
    if (error.message?.includes("invalid_grant")) {
      res.clearCookie("google_tokens");
      return res.status(401).json({ error: "Authentication expired. Please log in again." });
    }
    res.json([]);
  }
});

app.post("/api/tasks/toggle", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  
  const { task, completed, assignee } = req.body;
  const today = new Date().toLocaleDateString();

  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: RECIPE_SPREADSHEET_ID,
      range: "Tasks!A2:E",
    });
    
    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[1] === task && row[3] === today);
    
    if (rowIndex !== -1) {
      const values = [[completed ? "TRUE" : "FALSE"]];
      if (assignee) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: RECIPE_SPREADSHEET_ID,
          range: `Tasks!C${rowIndex + 2}:E${rowIndex + 2}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[completed ? "TRUE" : "FALSE", today, assignee]] },
        });
      } else {
        await sheets.spreadsheets.values.update({
          spreadsheetId: RECIPE_SPREADSHEET_ID,
          range: `Tasks!C${rowIndex + 2}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });
      }
    } else if (completed) {
      // If task not found for today but being marked completed, add it
      await sheets.spreadsheets.values.append({
        spreadsheetId: RECIPE_SPREADSHEET_ID,
        range: "Tasks!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["Misc", task, "TRUE", today, assignee || ""]],
        },
      });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    handleGoogleApiError(error, res, "Tasks toggle error");
  }
});

// Issue Tracking Endpoints
app.get("/api/issues", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: RECIPE_SPREADSHEET_ID,
        range: "Issues!A2:H", // Date, Type, Description, Status, Reporter, EstimatedCause, FollowUp, Photo
      });
      
      const rows = response.data.values;
      if (rows) {
        const issues = rows.map(row => ({
          date: row[0] || "",
          type: row[1] || "",
          description: row[2] || "",
          status: row[3] || "",
          reporter: row[4] || "",
          estimatedCause: row[5] || "",
          followUpAction: row[6] || "",
          photo: row[7] || "",
        }));
        return res.json(issues);
      }
    } catch (innerError: any) {
      return res.json([]);
    }
    res.json([]);
  } catch (error: any) {
    handleGoogleApiError(error, res, "Issues API error");
  }
});

app.post("/api/issues", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  
  const { date, type, description, status, reporter, estimatedCause, followUpAction, photo } = req.body;
  
  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: RECIPE_SPREADSHEET_ID,
      range: "Issues!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[date, type, description, status, reporter, estimatedCause, followUpAction, photo]],
      },
    });
    
    res.json({ success: true });
  } catch (error: any) {
    handleGoogleApiError(error, res, "Issue logging error");
  }
});

app.post("/api/log", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  
  const { format, process: proc, batch, manualAmount, logs, user, operators, lot1, lot2 } = req.body;
  
  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);

    const values = logs.map((log: any) => [
      new Date().toLocaleDateString(),
      operators || user || "Unknown",
      format || "Combined",
      proc,
      manualAmount || batch,
      log.reagent,
      lot2 ? `${lot1} / ${lot2}` : lot1,
      log.timestamp
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: RECIPE_SPREADSHEET_ID,
      range: "Logs!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    res.json({ success: true });
  } catch (error: any) {
    handleGoogleApiError(error, res, "Logging error");
  }
});

app.post("/api/tasks/add", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  
  const { category, task, assignee } = req.body;
  const today = new Date().toLocaleDateString();

  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: RECIPE_SPREADSHEET_ID,
      range: "Tasks!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[category, task, "FALSE", today, assignee || ""]],
      },
    });
    
    res.json({ success: true });
  } catch (error: any) {
    handleGoogleApiError(error, res, "Tasks add error");
  }
});

app.post("/api/report", async (req, res) => {
  const { type, data } = req.body;
  try {
    const ai = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    // We use the provided Gemini API guidance
    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    
    const prompt = `
      You are a Lab Manager. Summarize the following lab data into a professional ${type} report for the Team Leader.
      Include:
      - Experiment Schedule Summary
      - Sample Throughput (Weekly: ${data.stats.weeklySamples}, Monthly: ${data.stats.monthlySamples})
      - Machine Operation Rates (GT1-4: ${data.stats.weeklyUtilization.map((u: number) => u.toFixed(1)).join('%, ')}%)
      - Recent Issues and Follow-up Actions
      - Announcements
      
      Data: ${JSON.stringify(data)}
      
      Format the response in Korean, using a professional and concise tone. Use Markdown.
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    res.json({ report: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Chip QC Endpoints
app.get("/api/chip-qc", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const tokens = JSON.parse(tokensStr);
    const sheets = await getSheetsClient(tokens);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: RECIPE_SPREADSHEET_ID,
      range: "Chip info!A2:G", // Date, Chip ID, Total, Fail, GenderMismatch, Validation, Issue
    });
    
    const rows = response.data.values || [];
    const data = rows.map(row => ({
      date: row[0],
      chipId: row[1],
      total: parseInt(row[2]) || 0,
      fail: parseInt(row[3]) || 0,
      genderMismatch: parseInt(row[4]) || 0,
      validation: row[5],
      issue: row[6]
    }));
    
    res.json(data);
  } catch (error: any) {
    if (error.message?.includes("invalid_grant")) {
      res.clearCookie("google_tokens");
      return res.status(401).json({ error: "Authentication expired. Please log in again." });
    }
    res.json([]);
  }
});

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
