// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: magic;

// F1 2025 Next Races Widget for iOS Scriptable (Medium Widget)

// CONFIGURATION ================================================
const config = {
  // API Settings
  api: {
    races: "https://api.jolpi.ca/ergast/f1/current.json",
    circuits: {
      baseUrl: "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/",
      urlPattern: "{circuit}%20carbon.png",
      circuitMappings: {
        // 2025 F1 Calendar Circuits (24 races)
        "Bahrain International Circuit": "Bahrain",
        "Jeddah Corniche Circuit": "Saudi%20Arabia",
        "Albert Park Circuit": "Australia",
        "Baku City Circuit": "Azerbaijan",
        "Miami International Autodrome": "Miami",
        "Circuit de Barcelona-Catalunya": "Spain",
        "Circuit de Monaco": "Monaco",
        "Circuit Gilles Villeneuve": "Canada",
        "Red Bull Ring": "Austria",
        "Silverstone Circuit": "Great%20Britain",
        "Hungaroring": "Hungary",
        "Circuit de Spa-Francorchamps": "Belgium",
        "Circuit Park Zandvoort": "Netherlands",
        "Autodromo Enzo e Dino Ferrari": "Emilia%20Romagna",
        "Marina Bay Street Circuit": "Singapore",
        "Suzuka Circuit": "Japan",
        "Circuit of the Americas": "United%20States",
        "Autódromo Hermanos Rodríguez": "Mexico",
        "Autódromo José Carlos Pace": "Brazil",
        "Las Vegas Strip Circuit": "Las%20Vegas",
        "Losail International Circuit": "Qatar",
        "Shanghai International Circuit": "China",
        "Yas Marina Circuit": "Abu%20Dhabi"
      }
    }
  },
  
  // Cache Settings
  cache: {
    races: {
      key: "f1RacesCache",
      duration: 60 * 60 * 1000 // 1 hour
    },
    circuits: {
      key: "f1CircuitsCache",
      duration: 90 * 24 * 60 * 60 * 1000 // 90 days
    }
  },

  // Display Settings
  maxRaces: 3,
  spacingBetweenRaces: 8,
  circuitSize: 40,
  circuitCornerRadius: 5,
  imageToTextSpacing: 10,
  raceNameSize: 10,
  dateSize: 11,
  warningSize: 12,
  padding: {
    widget: [10, 20, 0, 20],
    raceName: [0, 10, 0, 0],
    dateTime: [0, 10, 0, 8],
    bar: [8, 11, 0, 8]
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
          locations: [0, 0.35, 1],
          colors: [Color.clear(), new Color("#808080", 0.23), Color.clear()],
          startPoint: new Point(0, 0.5),
          endPoint: new Point(1, 0.5)
        }
      },
      bar: {
        gradient: {
          locations: [0, 0.03, 0.45, 0.97, 1],
          colors: [
            new Color("#E8002D", 0.03),
            new Color("#E8002D", 0.9),
            new Color("#E8002D", 0.75),
            new Color("#358C75", 0.6),
            new Color("#F58020", 0.03)
          ],
          startPoint: new Point(0, 0.5),
          endPoint: new Point(1, 0.5)
        },
        cornerRadius: 0
      }
    },
    text: {
      raceName: "#ffffff",
      dateTime: "#ffffff",
      warning: "#ffcc00"
    },
    error: {
      primary: "#ff0000",
      secondary: "#ffffff"
    }
  }
};

// HELPER FUNCTIONS =============================================
function loadFont(fontName, size) {
  try {
    return new Font(fontName, size);
  } catch (e) {
    return Font.systemFont(size);
  }
}

function getCircuitUrl(circuitName) {
  const mappedCircuit = config.api.circuits.circuitMappings[circuitName] || 
                       circuitName.replace(/\s+/g, '%20');
  return config.api.circuits.baseUrl + 
         config.api.circuits.urlPattern.replace("{circuit}", mappedCircuit);
}

async function fetchDataWithCache() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), config.cache.races.key);
  
  if (fm.fileExists(cachePath)) {
    try {
      const cached = JSON.parse(fm.readString(cachePath));
      if (new Date() - new Date(cached.timestamp) < config.cache.races.duration) {
        return cached.data;
      }
    } catch (e) {
      console.log("Cache read failed, fetching fresh data");
    }
  }
  
  try {
    const request = new Request(config.api.races);
    const data = await request.loadJSON();
    fm.writeString(cachePath, JSON.stringify({
      timestamp: new Date(),
      data: data
    }));
    return data;
  } catch (e) {
    throw new Error("Failed to fetch race data");
  }
}

async function fetchCircuitWithCache(circuitName) {
  const fm = FileManager.local();
  const cacheDir = fm.joinPath(fm.documentsDirectory(), config.cache.circuits.key);
  
  if (!fm.fileExists(cacheDir)) fm.createDirectory(cacheDir);
  const cachePath = fm.joinPath(cacheDir, `${circuitName}.png`);
  
  if (fm.fileExists(cachePath)) {
    try {
      if (new Date() - fm.creationDate(cachePath) < config.cache.circuits.duration) {
        return fm.readImage(cachePath);
      }
    } catch (e) {
      console.log(`Cache read failed for ${circuitName} circuit`);
    }
  }
  
  try {
    const request = new Request(getCircuitUrl(circuitName));
    const circuitImage = await request.loadImage();
    fm.writeImage(cachePath, circuitImage);
    return circuitImage;
  } catch (e) {
    console.log(`Failed to fetch circuit for ${circuitName}`);
    return null;
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
  
  const detailText = stack.addText(error.message || "Check connection");
  detailText.font = loadFont(config.fonts.regular, 10);
  detailText.textColor = new Color(config.colors.error.secondary);
  
  return widget;
}

function createBackgroundGradient(gradientConfig = config.colors.background.widget.gradient) {
  const gradient = new LinearGradient();
  gradient.locations = gradientConfig.locations;
  gradient.colors = gradientConfig.colors.map(c => 
    c === Color.clear() ? Color.clear() : new Color(c.hex, c.alpha)
  );
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
  return `${dateStr} • ${timeStr}`;
}

function createRaceEntry(widget, race, circuitImage) {
  const raceStack = widget.addStack();
  raceStack.layoutHorizontally();
  raceStack.spacing = config.imageToTextSpacing;

  // Circuit display
  if (circuitImage) {
    const circuitImg = raceStack.addImage(circuitImage);
    circuitImg.imageSize = new Size(config.circuitSize, config.circuitSize);
    circuitImg.cornerRadius = config.circuitCornerRadius;
  } else {
    const circuitText = raceStack.addText("🏎️");
    circuitText.font = loadFont(config.fonts.regular, config.circuitSize);
    circuitText.textColor = new Color(config.colors.text.raceName);
  }

  // Race details
  const textStack = raceStack.addStack();
  textStack.layoutVertically();
  textStack.spacing = 4;
  textStack.size = new Size(0, 0);

  // Race name
  const raceNameStack = textStack.addStack();
  raceNameStack.setPadding(...config.padding.raceName);
  const raceNameText = raceNameStack.addText(race.raceName.replace("Grand Prix", "").toUpperCase());
  raceNameText.font = loadFont(config.fonts.wide, config.raceNameSize);
  raceNameText.textColor = new Color(config.colors.text.raceName);
  raceNameText.lineLimit = 1;

  // Date and time
  const dateStack = textStack.addStack();
  dateStack.layoutHorizontally();
  dateStack.setPadding(...config.padding.dateTime);
  
  const dateText = dateStack.addText(formatRaceDateTime(race));
  dateText.font = loadFont(config.fonts.regular, config.dateSize);
  dateText.textColor = new Color(config.colors.text.dateTime);
  
  // Bar
  const barStack = textStack.addStack();
  barStack.layoutHorizontally();
  barStack.setPadding(...config.padding.bar);
  barStack.backgroundGradient = createBackgroundGradient(config.colors.background.bar.gradient);
  barStack.cornerRadius = config.colors.background.bar.cornerRadius;
  
  barStack.addSpacer();
  widget.addSpacer(config.spacingBetweenRaces);
}

// MAIN WIDGET ==================================================
const widget = new ListWidget();
widget.backgroundGradient = createBackgroundGradient();
widget.setPadding(...config.padding.widget);

try {
  // Load all data upfront
  const data = await fetchDataWithCache();
  const races = data?.MRData?.RaceTable?.Races || [];
  const now = new Date();
  
  // Process races
  const upcomingRaces = races
    .filter(race => new Date(race.date + "T" + race.time) > now)
    .slice(1, config.maxRaces + 1);

  // Pre-load all required circuits
  const circuits = {};
  for (const race of upcomingRaces) {
    const circuitName = race?.Circuit?.circuitName || "Unknown";
    if (!circuits[circuitName]) {
      circuits[circuitName] = await fetchCircuitWithCache(circuitName);
    }
  }

  // Display races
  if (upcomingRaces.length > 0) {
    upcomingRaces.forEach(race => {
      const circuitName = race?.Circuit?.circuitName || "Unknown";
      createRaceEntry(widget, race, circuits[circuitName]);
    });
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