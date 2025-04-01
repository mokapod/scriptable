// F1 Next 3 Races Widget for iOS Scriptable (Medium Widget)
// CONFIGURATION ================================================
const config = {
  // API Settings
  apiUrl: "https://api.jolpi.ca/ergast/f1/current.json",
  cacheKey: "f1RacesCache",
  cacheDuration: 60 * 60 * 1000, // 1 hour in milliseconds
  
  // Display Settings
  maxRaces: 3,
  spacingBetweenRaces: 14,
  flagSize: 30,
  raceNameSize: 10,
  dateSize: 11,
  warningSize: 12,
  padding: {
    widget: [14, 12, 0, 12], // top, right, bottom, left
    raceName: [0, 3, 0, 0],
    dateTime: [2.1, 11, 2.1, 8]
  },
  
  // Font Settings
  fonts: {
    wide: "Formula1-Display-Wide",
    bold: "Formula1-Display-Bold",
    regular: "Formula1-Display-Regular"
  },
  
  // Color Settings
  colors: {
    background: {
        widget: {
            gradient: {
                locations: [0, 0.3, 1],
                colors: [
                    Color.clear(),
                    new Color("#808080", 0.3),
                    Color.clear()
                ],
                startPoint: new Point(0, 0.5),
                endPoint: new Point(1, 0.5)
            }
        },
        date: {
            gradient: {
                locations: [0, 0.03, 0.5, 0.97, 1], // Added middle point and mirrored points
                colors: [
                    new Color("#E8002D", 0.03),       // Left fade start
                    new Color("#E8002D", 0.9),             // Left solid
                    new Color("#E8002D", 0.7),        // Middle (most transparent)
                    new Color("#E8002D", 1),             // Right solid
                    new Color("#E8002D", 0.03)        // Right fade end
                ],
                startPoint: new Point(0, 0.5),
                endPoint: new Point(1, 0.5)
            },
            cornerRadius: 0
        }
    },
    text: {
      raceName: "#ffffff",
      dateTime: "#F5F5F5",
      warning: "#ffcc00"
    },
    error: {
      primary: "#ff0000",
      secondary: "#ffffff"
    }
  },
  
  // Country Flags
  countryFlags: {
    "Australia": "🇦🇺", "Monaco": "🇲🇨", "Canada": "🇨🇦",
    "Italy": "🇮🇹", "UK": "🇬🇧", "USA": "🇺🇸",
    "Japan": "🇯🇵", "Brazil": "🇧🇷", "Mexico": "🇲🇽",
    "France": "🇫🇷", "Germany": "🇩🇪", "Spain": "🇪🇸",
    "Netherlands": "🇳🇱", "Belgium": "🇧🇪", "Austria": "🇦🇹",
    "Hungary": "🇭🇺", "Singapore": "🇸🇬", "Russia": "🇷🇺",
    "Azerbaijan": "🇦🇿", "UAE": "🇦🇪", "Saudi Arabia": "🇸🇦",
    "Qatar": "🇶🇦", "Portugal": "🇵🇹", "China": "🇨🇳",
    "Bahrain": "🇧🇭"
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
  
  // Try to load from cache
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
  
  // Fetch fresh data
  try {
    const request = new Request(config.apiUrl);
    const data = await request.loadJSON();
    
    // Save to cache
    try {
      fm.writeString(cachePath, JSON.stringify({
        timestamp: new Date(),
        data: data
      }));
    } catch (e) {
      console.log("Cache write failed");
    }
    
    return data;
  } catch (e) {
    throw new Error("Failed to fetch race data");
  }
}

function createErrorWidget(error) {
  const widget = new ListWidget();
  widget.backgroundGradient = createBackgroundGradient();
  
  const stack = widget.addStack();
  stack.layoutVertically();
  stack.centerAlignContent();
  
  const errorText = stack.addText("No Races Data");
  errorText.font = loadFont(config.fonts.regular, 12);
  errorText.textColor = new Color(config.colors.error.primary);
  
  // Safely get error message
  const errorMessage = typeof error === 'object' && error.message 
    ? error.message 
    : "Check connection";
    
  const detailText = stack.addText(errorMessage);
  detailText.font = loadFont(config.fonts.regular, 10);
  detailText.textColor = new Color(config.colors.error.secondary);
  
  return widget;
}

function createBackgroundGradient(gradientConfig = config.colors.background.widget.gradient) {
  let gradient = new LinearGradient();
  gradient.locations = gradientConfig.locations;
  gradient.colors = gradientConfig.colors.map(color => {
    if (color === Color.clear()) return Color.clear();
    return new Color(color.hex, color.alpha);
  });
  gradient.startPoint = gradientConfig.startPoint;
  gradient.endPoint = gradientConfig.endPoint;
  return gradient;
}

function formatRaceDateTime(race) {
  const raceDate = new Date(race.date + "T" + race.time);
  const dateOptions = { weekday: "short", month: "short", day: "numeric" };
  const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
  
  const dateStr = raceDate.toLocaleDateString("en-GB", dateOptions);
  const timeStr = raceDate.toLocaleTimeString("en-GB", timeOptions);
  return `${dateStr}  •  ${timeStr}`;
}

function createRaceEntry(widget, race) {
  const raceStack = widget.addStack();
  raceStack.layoutHorizontally();
  raceStack.spacing = 8;

  // Flag
  const country = race?.Circuit?.Location?.country || race?.Circuit?.circuitName || "Unknown";
  const flag = config.countryFlags[country] || "🏁";
  
  const flagText = raceStack.addText(flag);
  flagText.font = loadFont(config.fonts.regular, config.flagSize);
  flagText.textColor = new Color(config.colors.text.raceName);

  // Race details
  const textStack = raceStack.addStack();
  textStack.layoutVertically();
  textStack.spacing = 5;
  textStack.size = new Size(0, 0); // Allow to expand

  // Race name
  const raceNameStack = textStack.addStack();
  raceNameStack.setPadding(...config.padding.raceName);
  const raceNameText = raceNameStack.addText(" " + race.raceName.toUpperCase());
  raceNameText.font = loadFont(config.fonts.wide, config.raceNameSize);
  raceNameText.textColor = new Color(config.colors.text.raceName);
  raceNameText.lineLimit = 1;

  // Date and time
  const dateStack = textStack.addStack();
  dateStack.layoutHorizontally();
  dateStack.setPadding(...config.padding.dateTime);
  
  // Use shared gradient function with date gradient config
  dateStack.backgroundGradient = createBackgroundGradient(config.colors.background.date.gradient);
  dateStack.cornerRadius = config.colors.background.date.cornerRadius;
  
  // Add date text
  const dateText = dateStack.addText(formatRaceDateTime(race));
  dateText.font = loadFont(config.fonts.regular, config.dateSize);
  dateText.textColor = new Color(config.colors.text.dateTime);
  
  // Add spacer to push background to right
  dateStack.addSpacer();

  widget.addSpacer(config.spacingBetweenRaces);
}
// END HELPERS ==================================================

// MAIN WIDGET ==================================================
const widget = new ListWidget();
widget.backgroundGradient = createBackgroundGradient();
widget.setPadding(...config.padding.widget);

try {
  const data = await fetchWithCache();
  
  // Process and display races
  const races = data?.MRData?.RaceTable?.Races || [];
  const now = new Date();
  const upcomingRaces = races
    .filter(race => new Date(race.date + "T" + race.time) > now && 
             race.raceName && 
             race.Circuit
    )
    .slice(0, config.maxRaces);

  if (upcomingRaces.length > 0) {
    upcomingRaces.forEach(race => createRaceEntry(widget, race));
  } else {
    const noRaceText = widget.addText("No upcoming races found.");
    noRaceText.font = loadFont(config.fonts.regular, config.warningSize);
    noRaceText.textColor = new Color(config.colors.text.raceName);
  }
} catch (error) {
  Script.setWidget(createErrorWidget(error));
}

Script.setWidget(widget);
widget.presentMedium();
Script.complete();
