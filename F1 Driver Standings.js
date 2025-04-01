// Scriptable Widget: Formula 1 Driver Standings (Small Size)
// CONFIGURATION ================================================
const config = {
  // API Settings
  apiUrl: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
  cacheKey: "f1_driver_standings",
  cacheDuration: 3600000, // 1 hour in milliseconds
  
  // Display Settings
  maxDrivers: 9,
  rowSpacing: 0.5,
  rowCornerRadius: 2,
  
  // Padding Settings
  padding: {
    widget: [0, 0, 0, 0], // top, right, bottom, left
    row: {
      top3: [3.5, 4, 3.5, 8],    // Padding for positions 1-3
      other: [2, 4, 2, 8]         // Padding for positions 4+
    }
  },
  
  // Font Settings
  fonts: {
    regular: "Formula1-Display-Regular",
    fallbackSize: 9,
    top3Size: 11,       // Font size for positions 1-3
    otherSize: 9        // Font size for positions 4+
  },
  
  // Color Settings
  colors: {
    top3Text: "#ffffff",    // White for positions 1-3
    otherText: "#D3D3D3",   // Light gray for positions 4+
    teamColors: {
      "mercedes": "#00D2BE",
      "red_bull": "#3671C6",
      "ferrari": "#E8002D",
      "mclaren": "#F58020",
      "alpine": "#2293D1",
      "rb": "#6692FF",
      "aston_martin": "#358C75",
      "williams": "#37BEDD",
      "sauber": "#C92D4B",
      "haas": "#B6BABD",
      "default": "#333333"
    },
    error: {
      primary: "#ff0000",
      secondary: "#ffffff"
    }
  },

  // Gradient Settings
  gradient: {
    //locations: [0.001, 0.04, 1],
    locations: [0, 0.96, 0.999],
    opacities: [0.08, 1, 0.03],
    startPoint: { x: 0, y: 0.5 },
    endPoint: { x: 1, y: 0.5 }
  }
};
// END CONFIG ===================================================

// HELPER FUNCTIONS =============================================
function loadFont(fontName, size) {
  try {
    return new Font(fontName, size);
  } catch (e) {
    return Font.systemFont(size);
  }
}

async function fetchWithCache() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), config.cacheKey);
  
  if (fm.fileExists(cachePath)) {
    try {
      const cached = JSON.parse(fm.readString(cachePath));
      if (new Date() - new Date(cached.timestamp) < config.cacheDuration) {
        return cached.data;
      }
    } catch (e) {
      console.log("Cache read failed, fetching fresh data");
    }
  }
  
  try {
    const request = new Request(config.apiUrl);
    const data = await request.loadJSON();
    fm.writeString(cachePath, JSON.stringify({
      timestamp: new Date(),
      data: data
    }));
    return data;
  } catch (e) {
    throw new Error("API request failed");
  }
}

function createErrorWidget(error) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color(config.colors.teamColors.default);
  const stack = widget.addStack();
  stack.layoutVertically();
  stack.centerAlignContent();
  
  const errorText = stack.addText("No Standings Data");
  errorText.font = loadFont(config.fonts.regular, 11);
  errorText.textColor = new Color(config.colors.error.primary);
  
  const detailText = stack.addText(error.message || "Check connection");
  detailText.font = loadFont(config.fonts.regular, 10);
  detailText.textColor = new Color(config.colors.error.secondary);
  
  return widget;
}

function createTeamGradient(teamId) {
  const colorHex = config.colors.teamColors[teamId] || config.colors.teamColors.default;
  const teamColor = new Color(colorHex, 1);
  const gradient = new LinearGradient();
  gradient.locations = config.gradient.locations;
  gradient.colors = [
    new Color(teamColor.hex, config.gradient.opacities[0]),
    teamColor,
    new Color(teamColor.hex, config.gradient.opacities[2])
  ];
  gradient.startPoint = new Point(
    config.gradient.startPoint.x,
    config.gradient.startPoint.y
  );
  gradient.endPoint = new Point(
    config.gradient.endPoint.x,
    config.gradient.endPoint.y
  );
  return gradient;
}

function createDriverRow(widget, driver) {
  const teamId = driver.Constructors[0]?.constructorId?.toLowerCase() || "default";
  const isTop3 = parseInt(driver.position) <= 3;
  
  const rowStack = widget.addStack();
  rowStack.layoutHorizontally();
  rowStack.spacing = 4;
  rowStack.backgroundGradient = createTeamGradient(teamId);
  rowStack.cornerRadius = config.rowCornerRadius;
  
  // Set padding based on position
  rowStack.setPadding(...(isTop3 ? config.padding.row.top3 : config.padding.row.other));

  // Position
  const positionStack = rowStack.addStack();
  positionStack.size = new Size(18, 0);
  const positionText = positionStack.addText(driver.position);
  
  // Driver Name
  const driverText = rowStack.addText(driver.Driver.familyName);
  driverText.lineLimit = 1;
  driverText.minimumScaleFactor = 1;

  // Points
  rowStack.addSpacer();
  const pointsText = rowStack.addText(driver.points);

  // Set styling based on position
  const font = loadFont(
    config.fonts.regular, 
    isTop3 ? config.fonts.top3Size : config.fonts.otherSize
  );
  const textColor = new Color(
    isTop3 ? config.colors.top3Text : config.colors.otherText
  );
  
  positionText.font = font;
  driverText.font = font;
  pointsText.font = font;
  positionText.textColor = textColor;
  driverText.textColor = textColor;
  pointsText.textColor = textColor;

  return rowStack;
}
// END HELPERS ==================================================

// MAIN WIDGET ==================================================
const widget = new ListWidget();
widget.setPadding(...config.padding.widget);

try {
  const data = await fetchWithCache();
  
  if (!data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings) {
    throw new Error("Invalid data structure");
  }

  const standings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;

  for (let i = 0; i < Math.min(standings.length, config.maxDrivers); i++) {
    createDriverRow(widget, standings[i]);
    
    if (i < Math.min(standings.length, config.maxDrivers) - 1) {
      widget.addSpacer(config.rowSpacing);
    }
  }
} catch (error) {
  Script.setWidget(createErrorWidget(error));
  widget.presentSmall();
  return;
}

Script.setWidget(widget);
widget.presentSmall();