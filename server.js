const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================================================================
// STATE MANAGEMENT
// ================================================================
const STATE_FILE = path.join(__dirname, 'data', 'state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    console.error('Failed to load state:', e.message);
    return getDefaultState();
  }
}

function saveState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Failed to save state:', e.message);
  }
}

function getDefaultState() {
  return {
    projects: [],
    activeSessions: [],
    recentSessions: [],
    scheduledTasks: [],
    activityFeed: [],
    stats: { totalProjects: 4, activeTasks: 9, totalSessions: 415, videosPublished: 38, aiCredits: 75000 }
  };
}

let state = loadState();

// ================================================================
// ACTIVITY SIMULATION ENGINE
// ================================================================
const PROJECT_IDS = ['tech-ai', 'groundwork', 'photoflight', 'groomlab'];
const PROJECT_NAMES = {
  'tech-ai': 'Tech AI',
  'groundwork': 'Groundwork',
  'photoflight': 'PhotoFlight',
  'groomlab': 'GroomLab Creations'
};

const SIMULATED_ACTIVITIES = {
  'tech-ai': [
    'Analyzing trending AI topics on YouTube',
    'Rendering video thumbnail variations',
    'Processing ElevenLabs voice generation',
    'Optimizing video SEO metadata',
    'Researching competitor channels',
    'Drafting script for V39',
    'A/B testing thumbnail designs',
    'Updating TikTok cross-posts'
  ],
  'groundwork': [
    'Running database migrations',
    'Deploying to Railway production',
    'Processing client portal updates',
    'Running test suite â 47 tests passing',
    'Optimizing API response times',
    'Building new dashboard component',
    'Updating GitHub Actions workflow',
    'Code review on PR #142'
  ],
  'photoflight': [
    'Processing drone imagery â orthomosaic generation',
    'Scanning RFP listings for aerial contracts',
    'Generating client proposal document',
    'Updating flight log records',
    'Monitoring weather conditions for NJ region',
    'Prospecting: 3 new municipalities identified',
    'Rendering 3D point cloud from lidar data',
    'Sending backlink outreach emails'
  ],
  'groomlab': [
    'Analyzing Etsy keyword trends',
    'Updating product listing copy',
    'Processing product photography',
    'Researching competitor pricing',
    'Drafting social media content calendar',
    'Optimizing listing SEO tags',
    'Calculating shipping cost matrix',
    'Designing new product mockups'
  ]
};

const SESSION_TITLES = {
  'tech-ai': ['Video production pipeline', 'Channel analytics review', 'Script writing session', 'Thumbnail optimization', 'Content calendar planning'],
  'groundwork': ['Feature development sprint', 'Bug fix deployment', 'Client portal update', 'Database optimization', 'CI/CD pipeline update'],
  'photoflight': ['Aerial survey processing', 'RFP response drafting', 'Client deliverable prep', 'Prospect outreach campaign', 'Equipment maintenance log'],
  'groomlab': ['Product listing creation', 'Market research session', 'Pricing strategy analysis', 'Photo editing batch', 'SEO optimization pass']
};

// Track simulation state
let simState = {
  lastActivityTime: Date.now(),
  lastSessionToggle: Date.now(),
  activeProjectCooldowns: {},  // projectId -> timestamp when it can be toggled again
  interactionPairs: [],         // [{a, b, timestamp}] for cross-project energy bolts
  sessionCounter: 416
};

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSessionId() {
  return 's-' + String(simState.sessionCounter++).padStart(3, '0');
}

// Simulate project activation/deactivation (every 30-60s)
function simulateProjectActivity() {
  const now = Date.now();

  // Maybe toggle a project active/idle
  if (now - simState.lastSessionToggle > (30000 + Math.random() * 30000)) {
    simState.lastSessionToggle = now;

    const activeProjects = state.projects.filter(p => p.status === 'active');
    const idleProjects = state.projects.filter(p => p.status === 'idle');

    // 60% chance to activate an idle project, 40% to deactivate an active one
    if ((idleProjects.length > 0 && Math.random() < 0.6) || activeProjects.length >= 3) {
      // Activate an idle project
      const proj = randomPick(idleProjects);
      if (!simState.activeProjectCooldowns[proj.id] || now > simState.activeProjectCooldowns[proj.id]) {
        proj.status = 'active';
        proj.activeTaskCount = 1 + Math.floor(Math.random() * 3);
        proj.lastActivity = new Date().toISOString();

        // Create an active session
        const session = {
          id: generateSessionId(),
          title: randomPick(SESSION_TITLES[proj.id] || ['General work session']),
          project: proj.id,
          status: 'running',
          startedAt: new Date().toISOString()
        };
        state.activeSessions.push(session);

        // Add activity feed entry
        addActivityEntry(proj.id, `Session started: ${session.title}`);

        simState.activeProjectCooldowns[proj.id] = now + 20000; // 20s cooldown
      }
    } else if (activeProjects.length > 0) {
      // Deactivate a random active project
      const proj = randomPick(activeProjects);
      proj.status = 'idle';
      proj.activeTaskCount = 0;

      // Move active sessions for this project to recent
      const projectSessions = state.activeSessions.filter(s => s.project === proj.id);
      projectSessions.forEach(s => {
        s.status = 'completed';
        s.completedAt = new Date().toISOString();
        state.recentSessions.unshift(s);
      });
      state.activeSessions = state.activeSessions.filter(s => s.project !== proj.id);

      // Keep recent sessions manageable
      if (state.recentSessions.length > 20) {
        state.recentSessions = state.recentSessions.slice(0, 20);
      }

      addActivityEntry(proj.id, `Session completed: ${projectSessions[0]?.title || 'work session'}`);

      simState.activeProjectCooldowns[proj.id] = now + 15000;
    }
  }

  // Generate activity feed entries for active projects (every 15-25s)
  if (now - simState.lastActivityTime > (15000 + Math.random() * 10000)) {
    simState.lastActivityTime = now;

    const activeProjects = state.projects.filter(p => p.status === 'active');
    if (activeProjects.length > 0) {
      const proj = randomPick(activeProjects);
      const activity = randomPick(SIMULATED_ACTIVITIES[proj.id] || ['Processing...']);
      addActivityEntry(proj.id, activity);
      proj.lastActivity = new Date().toISOString();
    }
  }

  // Simulate cross-project interactions (energy bolts)
  // Clean old interactions
  simState.interactionPairs = simState.interactionPairs.filter(p => now - p.timestamp < 8000);

  // Maybe create a new interaction between two active projects
  const activeIds = state.projects.filter(p => p.status === 'active').map(p => p.id);
  if (activeIds.length >= 2 && Math.random() < 0.03) {  // ~3% chance per tick
    const a = randomPick(activeIds);
    let b = randomPick(activeIds);
    while (b === a) b = randomPick(activeIds);
    simState.interactionPairs.push({ a, b, timestamp: now });
    addActivityEntry(a, `Data sync with ${PROJECT_NAMES[b]}`);
  }

  // Update aggregate stats
  state.stats.activeTasks = state.scheduledTasks.length;
  state.stats.totalSessions = 415 + state.recentSessions.length;

  // Save periodically
  saveState(state);
}

function addActivityEntry(projectId, message) {
  const sourceMap = {
    'tech-ai': 'TECH_AI',
    'groundwork': 'GROUNDWORK',
    'photoflight': 'PHOTOFLIGHT',
    'groomlab': 'GROOMLAB'
  };

  state.activityFeed.unshift({
    timestamp: new Date().toISOString(),
    source: sourceMap[projectId] || 'SYSTEM',
    message,
    project: projectId
  });

  // Keep feed at reasonable size
  if (state.activityFeed.length > 50) {
    state.activityFeed = state.activityFeed.slice(0, 50);
  }
}

// Run simulation every 2 seconds
setInterval(simulateProjectActivity, 2000);

// ================================================================
// API ROUTES
// ================================================================

// GET /api/status â main dashboard data endpoint
app.get('/api/status', (req, res) => {
  res.json({
    projects: state.projects,
    activeSessions: state.activeSessions,
    recentSessions: state.recentSessions.slice(0, 12),
    scheduledTasks: state.scheduledTasks,
    activityFeed: state.activityFeed.slice(0, 20),
    stats: state.stats,
    interactionPairs: simState.interactionPairs.map(p => ({
      a: p.a,
      b: p.b,
      age: Date.now() - p.timestamp
    })),
    serverTime: new Date().toISOString()
  });
});

// POST /api/event â receive webhook-style events (for future Cowork integration)
app.post('/api/event', (req, res) => {
  const { type, project, title, message, data } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Missing "type" field' });
  }

  const now = new Date().toISOString();

  switch (type) {
    case 'session.start': {
      const projectObj = state.projects.find(p => p.id === project);
      if (projectObj) {
        projectObj.status = 'active';
        projectObj.activeTaskCount = (projectObj.activeTaskCount || 0) + 1;
        projectObj.lastActivity = now;
      }
      const session = {
        id: generateSessionId(),
        title: title || 'New session',
        project: project || null,
        status: 'running',
        startedAt: now
      };
      state.activeSessions.push(session);
      addActivityEntry(project, `Session started: ${session.title}`);
      saveState(state);
      return res.json({ ok: true, sessionId: session.id });
    }

    case 'session.end': {
      const sessionId = req.body.sessionId;
      const idx = state.activeSessions.findIndex(s => s.id === sessionId);
      if (idx >= 0) {
        const s = state.activeSessions.splice(idx, 1)[0];
        s.status = 'completed';
        s.completedAt = now;
        state.recentSessions.unshift(s);

        const projObj = state.projects.find(p => p.id === s.project);
        if (projObj) {
          projObj.activeTaskCount = Math.max(0, (projObj.activeTaskCount || 1) - 1);
          if (projObj.activeTaskCount === 0) projObj.status = 'idle';
        }
        addActivityEntry(s.project, `Session completed: ${s.title}`);
      }
      saveState(state);
      return res.json({ ok: true });
    }

    case 'activity': {
      addActivityEntry(project || null, message || 'Activity logged');
      saveState(state);
      return res.json({ ok: true });
    }

    case 'task.fired': {
      const task = state.scheduledTasks.find(t => t.id === req.body.taskId);
      if (task) {
        task.lastRun = now;
        addActivityEntry(task.project, `Scheduled task fired: ${task.name}`);
      }
      saveState(state);
      return res.json({ ok: true });
    }

    default:
      return res.status(400).json({ error: `Unknown event type: ${type}` });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), serverTime: new Date().toISOString() });
});

// Serve the dashboard for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================================================================
// START
// ================================================================
app.listen(PORT, () => {
  console.log(`ð Mission Control API running on port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   API:       http://localhost:${PORT}/api/status`);
  console.log(`   Events:    POST http://localhost:${PORT}/api/event`);
});
