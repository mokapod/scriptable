// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: magic;
// Scriptable Widget: Formula 1 Constructor Standings (Small Size)
// CONFIGURATION ================================================
const config = {
  // API Settings
  apiUrl: "https://api.jolpi.ca/ergast/f1/current/constructorStandings.json",
  cacheKey: "f1_constructor_standings",
  cacheDuration: 3600000, // 1 hour in milliseconds
  
  // Display Settings
  maxConstructors: 8,
  rowSpacing: 0.4,
  rowCornerRadius: 2,
  
  // Padding Settings
  padding: {
    widget: [0, 0, 0, 2], // top, right, bottom, left
    row: {
      top3: [5, 4, 5, 10],    // Padding for positions 1-3
      other: [3, 4, 3, 12]         // Padding for positions 4+
    }
  },
  
  // Font Settings
  fonts: {
    regular: "Formula1-Display-Regular",
    fallbackSize: 9,
    top3Size: 11,       // Font size for positions 1-3
    otherSize: 7        // Font size for positions 4+
  },
  
  // Updated Color Settings with group styling
  colors: {
    groups: {
      top3: {
        position: "#f8f8f8",
        name: "#f8f8f8",
        points: "#f0f0f0"
      },
      other: {
        position: "#f8f8f8",
        name: "#f8f8f8",
        points: "#f0f0f0"
      }
    },
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
    locations: [0.001, 0.04, 1],
    opacities: [0.08, 1, 0.6],
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

function createConstructorRow(widget, constructor) {
  const teamId = constructor.Constructor.constructorId.toLowerCase();
  const isTop3 = parseInt(constructor.position) <= 3;
  const groupConfig = isTop3 ? config.colors.groups.top3 : config.colors.groups.other;
  
  const rowStack = widget.addStack();
  rowStack.layoutHorizontally();
  rowStack.spacing = 0;
  rowStack.backgroundGradient = createTeamGradient(teamId);
  rowStack.cornerRadius = config.rowCornerRadius;
  
  // Set padding based on position
  rowStack.setPadding(...(isTop3 ? config.padding.row.top3 : config.padding.row.other));

  // Position
  const positionStack = rowStack.addStack();
  positionStack.size = new Size(22, 0);
  const positionText = positionStack.addText(constructor.position);
  positionText.textColor = new Color(groupConfig.position);
  
  // Constructor Name
  const constructorText = rowStack.addText(constructor.Constructor.name);
  constructorText.lineLimit = 1;
  constructorText.minimumScaleFactor = 1;
  constructorText.textColor = new Color(groupConfig.name);

  // Points
  rowStack.addSpacer();
  const pointsText = rowStack.addText(constructor.points);
  pointsText.textColor = new Color(groupConfig.points);

  // Set font based on position
  const font = loadFont(
    config.fonts.regular, 
    isTop3 ? config.fonts.top3Size : config.fonts.otherSize
  );
  
  positionText.font = font;
  constructorText.font = font;
  pointsText.font = font;

  return rowStack;
}
// END HELPERS ==================================================

// MAIN WIDGET ==================================================
const widget = new ListWidget();
widget.setPadding(...config.padding.widget);

try {
  const data = await fetchWithCache();
  
  if (!data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings) {
    throw new Error("Invalid data structure");
  }

  const standings = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;

  for (let i = 0; i < Math.min(standings.length, config.maxConstructors); i++) {
    createConstructorRow(widget, standings[i]);
    
    if (i < Math.min(standings.length, config.maxConstructors) - 1) {
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