// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: magic;
// Acknowledgements:
// F1 race data from the great project jolpica-f1, which took over where ergast left off. https://github.com/jolpica/jolpica-f1
// Nodman for adding caching and ability to update the script. https://github.com/Nodman
// ianperrin for widget parameters. https://github.com/ianperrin

// --------------------------------------------------
// Constants & Setup - DO NOT EDIT
// --------------------------------------------------
const SCRIPT_VERSION = "4.9";
const DATA_URL = "https://api.jolpi.ca/ergast/f1/current/next.json";
const ALLDATA_URL = "https://api.jolpi.ca/ergast/f1/current/races.json";
const UPDATE_URL = "https://raw.githubusercontent.com/timespacedecay/scriptable/refs/heads/main/Next%20F1%20Race%20Schedule.js";

// Time-related constants
const MILLISECONDS_IN_SECOND = 1000;
const MILLISECONDS_IN_MINUTE = 60 * MILLISECONDS_IN_SECOND;
const MILLISECONDS_IN_HOUR = 60 * MILLISECONDS_IN_MINUTE;
const MILLISECONDS_IN_DAY = 24 * MILLISECONDS_IN_HOUR;
const MINUTES_IN_HOUR = 60;
const RACE_END_BUFFER = MILLISECONDS_IN_HOUR * 2;
const DATE_NOW = Date.now();

// Update check constants
const UPDATE_CHECK_INTERVAL = MILLISECONDS_IN_DAY;

// Widget layout constants
const WIDGET_LAYOUT = {
    defaultWidth: 328,
    smallWidth: 170,
    lockWidth: 170,
    font: {
        header: {
            family: "Formula1-Display-Wide",
            sizes: { lock: 10, small: 12, default: 22 }
        },
        title: {
            family: "Formula1-Display-Bold",
            sizes: { lock: 9, small: 10, default: 10 }
        },
        body: {
            family: "Formula1-Display-Regular",
            sizes: { lock: 9, small: 10, default: 11 }
        }
    },
    padding: {
        lock: -4,
        small: -4,
        default: -5
    },
    spacing: {
        rows: { lock: 2, small: 10, default: 3.6 },
        columns: 0
    },
    background: {
        widget: {
            gradient: {
                locations: [0, 0.77, 1],
                colors: [
                    Color.clear(),
                    new Color("#808080", 0.25),
                    Color.clear()
                ]
            }
        },
        title: {
            gradient: {
                locations: [0, 0.09, 0.5, 0.91, 1], // Added middle point and mirrored points
                colors: [
                    new Color("#E8002D", 0.03),       // Left fade start
                    new Color("#E8002D", 1),             // Left solid
                    new Color("#E8002D", 0.8),        // Middle (most transparent)
                    new Color("#E8002D", 0.9),             // Right solid
                    new Color("#E8002D", 0.03)        // Right fade end
                ],
                startPoint: new Point(0, 0.5),
                endPoint: new Point(1, 0.5)
            },
            cornerRadius: 0
        }
    }
};

const RACE_IDX = 0;

const CACHE_FILES = {
    nextRace: "f1DataCache.json",
    allRaces: "f1AllRaceDataCache.json",
    lastUpdateCheck: "lastUpdateCheck.json"
};

const WIDGET_SIZE = {
    lock: config.widgetFamily === "accessoryRectangular",
    small: config.widgetFamily === "small"
};

// Paths and file manager
const SCRIPT_PATH = module.filename;
const SCRIPT_NAME = Script.name();
const fm = FileManager.local();
// If you want to store the script in iCloud, you can do:
// if (fm.isFileStoredIniCloud(scriptPath)) fm = FileManager.iCloud();

// Get widget parameters - set your parameters in the "Parameters" field when adding widget to home screen (or tap and hold widget > edit widget).
// Parameters must be in this order/format "locale|AMPM(AMPM/or blank)|refreshInterval(in minutes)|widgetWidth|paddingLeft|paddingRight|spaceBetweenRows|spaceBetweenColumns|raceTitleFontSize|sessionTitleFontSize|sessionFontSize"
// Defaults will be used if no parameters set, or a parameter value is missing.
// Examples:
//    UK date format: en-UK
//    US date format but AM/PM time: |AMPM
//    Refresh data every 12 hours instead of every hour (will still fade past sessions, this just sets the interval to check the API for schedule info): ||720
const widgetParams = (args.widgetParameter || "").split("|");

// Widget layout options
/**
 * Gets widget layout options based on parameters and widget size
 * @returns {Object} Widget layout options including width, fonts, padding, spacing, and formatting preferences
 */
function getOptions() {
    return {
        width: !!parseInt(widgetParams[3]) ? parseInt(widgetParams[3]) : WIDGET_SIZE.lock ? WIDGET_LAYOUT.lockWidth : WIDGET_SIZE.small ? WIDGET_LAYOUT.smallWidth : WIDGET_LAYOUT.defaultWidth,
        font: {
            header: [WIDGET_LAYOUT.font.header.family, !!parseInt(widgetParams[8]) ? parseInt(widgetParams[8]) : WIDGET_SIZE.lock ? WIDGET_LAYOUT.font.header.sizes.lock : WIDGET_SIZE.small ? WIDGET_LAYOUT.font.header.sizes.small : WIDGET_LAYOUT.font.header.sizes.default],
            title: [WIDGET_LAYOUT.font.title.family, !!parseInt(widgetParams[9]) ? parseInt(widgetParams[9]) : WIDGET_SIZE.lock ? WIDGET_LAYOUT.font.title.sizes.lock : WIDGET_SIZE.small ? WIDGET_LAYOUT.font.title.sizes.small : WIDGET_LAYOUT.font.title.sizes.default],
            body: [WIDGET_LAYOUT.font.body.family, !!parseInt(widgetParams[10]) ? parseInt(widgetParams[10]) : WIDGET_SIZE.lock ? WIDGET_LAYOUT.font.body.sizes.lock : WIDGET_SIZE.small ? WIDGET_LAYOUT.font.body.sizes.small : WIDGET_LAYOUT.font.body.sizes.default]
        },
        padding: {
            left: !!parseInt(widgetParams[4]) ? parseInt(widgetParams[4]) : WIDGET_SIZE.lock ? WIDGET_LAYOUT.padding.lock : WIDGET_SIZE.small ? WIDGET_LAYOUT.padding.small : WIDGET_LAYOUT.padding.default,
            right: parseInt(widgetParams[5] || WIDGET_SIZE.lock ? WIDGET_LAYOUT.padding.lock : WIDGET_SIZE.small ? WIDGET_LAYOUT.padding.small : WIDGET_LAYOUT.padding.default)
        },
        spaceBetweenRows: !!parseInt(widgetParams[6]) ? parseInt(widgetParams[6]) : WIDGET_SIZE.lock ? WIDGET_LAYOUT.spacing.rows.lock : WIDGET_SIZE.small ? WIDGET_LAYOUT.spacing.rows.small : WIDGET_LAYOUT.spacing.rows.default,
        spaceBetweenColumns: parseInt(widgetParams[7]) || WIDGET_LAYOUT.spacing.columns,
        //date and time format
        locale: widgetParams[0] || "en-GB",
        timeAMPM: widgetParams[1] == "AMPM" ? true : false,
        //adjustable refresh time (less than 60 is ignored)
        refreshLimitInMinutes: parseInt(widgetParams[2] || 60)
    };
}

// --------------------------------------------------
// Show menu so user can choose what to do
// --------------------------------------------------
if (config.runsInApp) {
    // Check for updates when running in app
    await checkForUpdates();

    const menu = new Alert();

    menu.title = "F1 Race Schedule";
    menu.message = "Choose an action:";

    menu.addAction("Preview Lock Screen");
    menu.addAction("Preview HS Small");
    menu.addAction("Preview HS Medium");
    menu.addAction("Preview HS Large");
    menu.addAction("Update Script");
    menu.addCancelAction("Cancel");

    const selection = await menu.presentAlert();

    let previewWidget;

    switch (selection) {
        case 0: // Preview lock screen
            WIDGET_SIZE.lock = true
            previewWidget = await createWidget();
            await previewWidget.presentAccessoryRectangular();
            break;
        case 1: // Preview home screen small
            WIDGET_SIZE.small = true
            previewWidget = await createWidget();
            await previewWidget.presentSmall();
            break;
        case 2: // Preview home screen medium
            previewWidget = await createWidget();
            await previewWidget.presentMedium();
            break;
        case 3: // Preview home screen large
            previewWidget = await createWidget();
            await previewWidget.presentLarge();
            break;
        case 4: // Update script code  
            await updateScript();
            break;
        default: // Cancel
            break;
    }
    // If you didn't choose "Set Widget & Exit", let's just end:
    Script.complete();
} else { // Set as the widget
    // Check for updates when running as widget
    await checkForUpdates();

    const widget = await createWidget();
    Script.setWidget(widget);
    Script.complete();
}

/**
 * Creates a full cache path by joining the cache directory with the filename
 * @param {string} cacheFilename - The name of the cache file
 * @returns {string} Full path to the cache file
 */
function createCachePath(cacheFilename) {
    return fm.joinPath(fm.cacheDirectory(), cacheFilename);
}

/**
 * Reads data from a cache file
 * @param {string} cacheFilename - The name of the cache file
 * @returns {Object} Parsed cache data
 */
function readFromCache(cacheFilename) {
    const cachePath = createCachePath(cacheFilename);
    const cached = JSON.parse(fm.readString(cachePath));
    return cached;
}

/**
 * Writes data to a cache file
 * @param {string} cacheFilename - The name of the cache file
 * @param {Object} data - Data to write to cache
 */
function writeCache(cacheFilename, data) {
    const cachePath = createCachePath(cacheFilename);
    fm.writeString(cachePath, JSON.stringify(data));
}

/**
 * Gets text opacity based on time - past times are dimmed
 * @param {Date} time - The time to check
 * @returns {number} Opacity value between 0.5 and 1
 */
function getTextOpacity(time) {
    return time < DATE_NOW ? 0.5 : 1;
}

/** 
 * Creates the main F1 schedule widget.
 */
async function createWidget() {
    const listWidget = new ListWidget();
    const nextRaceData = await getF1Data(
        DATA_URL,
        CACHE_FILES.nextRace,
        (data) => data.MRData.RaceTable.Races[RACE_IDX]
    );
    const allRacesData = await getF1Data(
        ALLDATA_URL,
        CACHE_FILES.allRaces,
        (data) => data.MRData.RaceTable.Races
    );
    let race = nextRaceData;
    const raceDateTimeCheck = new Date(`${race.date}T${race.time}`)
    const raceRound = race.round
    if (raceDateTimeCheck + RACE_END_BUFFER < DATE_NOW) {
        race = allRacesData[raceRound]
    }
    const options = getOptions()

    const sessionData = createSessionData(race);
    
    // Create gradient for background
	createBackgroundGradient(listWidget);

    // Render header
    renderHeader(listWidget, race, options);
    
    // Render circuit image
    await renderCircuitWithText(listWidget, race, options);
    
    // Render body
    renderBody(listWidget, sessionData, options);

    return listWidget;
}

/**
 * Renders the header section of the widget
 * @param {ListWidget} listWidget - The widget to render in
 * @param {Object} race - The race data
 * @param {Object} options - Widget layout options
 */
function renderHeader(listWidget, race, options) {
    const headerStack = listWidget.addStack();
    const headerText = race.raceName.toUpperCase();
    const headerCell = headerStack.addStack();
    headerCell.size = new Size(options.width, 0);
    headerCell.addSpacer();

    const textElement = headerCell.addText(headerText);
    textElement.font = new Font(...options.font.header);
    textElement.minimumScaleFactor = 0.5;
    textElement.lineLimit = 1;

    headerCell.addSpacer();
    //listWidget.addSpacer(options.spaceBetweenRows);
}

/**
 * Renders circuit image (left) with race date and name (right), using original body font size
 * @param {ListWidget} listWidget - The widget to render in
 * @param {Object} race - The race data
 * @param {Object} options - Widget layout options
 */
async function renderCircuitWithText(listWidget, race, options) {
    
    // Create main container stack
    const containerStack = listWidget.addStack();
    containerStack.layoutHorizontally();
    containerStack.centerAlignContent(); // This ensures everything centers
    containerStack.size = new Size(options.width, 40);

    // Add left spacer (for centering)
    containerStack.addSpacer();

    // Create content stack (image + text)
    const contentStack = containerStack.addStack();
    contentStack.layoutHorizontally();
    contentStack.spacing = 0; // Space between image and text

    // 1. Image Stack (auto-sized)
    const imageStack = contentStack.addStack();
    imageStack.size = new Size(0, 38); // Width grows // Height adjusts padding
    imageStack.centerAlignContent();
    
    try {
        const circuitImages = {
            "Bahrain International Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Bahrain%20carbon.png",
            "Jeddah Corniche Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Saudi%20Arabia%20carbon.png",
            "Albert Park Grand Prix Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Australia%20carbon.png",
            "Suzuka Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Japan%20carbon.png",
            "Shanghai International Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/China%20carbon.png",
            "Miami International Autodrome": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Miami%20carbon.png",
            "Autodromo Enzo e Dino Ferrari": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Emilia%20Romagna%20carbon.png",
            "Circuit de Monaco": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Monaco%20carbon.png",
            "Circuit Gilles Villeneuve": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Canada%20carbon.png",
            "Circuit de Barcelona-Catalunya": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Spain%20carbon.png",
            "Red Bull Ring": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Austria%20carbon.png",
            "Silverstone Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Great%20Britain%20carbon.png",
            "Hungaroring": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Hungary%20carbon.png",
            "Circuit de Spa-Francorchamps": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Belgium%20carbon.png",
            "Circuit Zandvoort": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Netherlands%20carbon.png",
            "Autodromo Nazionale Monza": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Italy%20carbon.png",
            "Baku City Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Azerbaijan%20carbon.png",
            "Marina Bay Street Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Singapore%20carbon.png",
            "Circuit of the Americas": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/United%20States%20carbon.png",
            "Autódromo Hermanos Rodríguez": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Mexico%20carbon.png",
            "Autódromo José Carlos Pace": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Brazil%20carbon.png",
            "Las Vegas Street Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Las%20Vegas%20carbon.png",
            "Lusail International Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Qatar%20carbon.png",
            "Yas Marina Circuit": "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Abu%20Dhabi%20carbon.png"
        };

        const circuitName = race.Circuit.circuitName;
        const imageUrl = circuitImages[circuitName];

        if (imageUrl) {
            const cacheDir = fm.joinPath(fm.cacheDirectory(), "circuit_images");
            if (!fm.fileExists(cacheDir)) {
                fm.createDirectory(cacheDir);
            }

            const cacheKey = circuitName.replace(/\s+/g, '_').toLowerCase();
            const cachePath = fm.joinPath(cacheDir, `${cacheKey}.png`);

            let image;
            if (fm.fileExists(cachePath)) {
                image = fm.readImage(cachePath);
            } else {
                const req = new Request(imageUrl);
                image = await req.loadImage();
                fm.writeImage(cachePath, image);
            }
            
            const imageElement = imageStack.addImage(image);
            imageElement.imageSize = new Size(80 * 0.85, 40 * 0.85); // Actual image dimensions
        }
    } catch (error) {
        console.log(`Image error: ${error}`);
    }

    // 2. Text Stack (auto-sized)
    const textStack = contentStack.addStack();
    textStack.layoutVertically();
    textStack.size = new Size(0, 36); // Width grows
    textStack.centerAlignContent();

    // Add text elements
    const font = new Font(...options.font.body);
    
    const datesElement = textStack.addText(
        formatRaceWeekendDates(
            new Date(`${race.FirstPractice.date}T00:00:00`),
            new Date(`${race.date}T00:00:00`)
        ));
    datesElement.font = font;
    datesElement.lineLimit = 1;
    datesElement.minimumScaleFactor = 0.5;

    textStack.addSpacer(options.spaceBetweenRows);

    const nameElement = textStack.addText(race.Circuit.circuitName);
    nameElement.font = font;
    nameElement.lineLimit = 1;
    nameElement.textOpacity = 0.9;
    nameElement.minimumScaleFactor = 0.5;

    // Add right spacer (for centering)
    containerStack.addSpacer();

    // Flex behavior
    imageStack.flexGrow = 1;  // Image can grow
    textStack.flexGrow = 2;   // Text gets more space
    contentStack.flexGrow = 1; // Content expands

    //listWidget.addSpacer(options.spaceBetweenRows);
}

/**
 * Renders the body section of the widget
 * @param {ListWidget} listWidget - The widget to render in
 * @param {Array} sessionData - Array of session data
 * @param {Object} options - Widget layout options
 */
function renderBody(listWidget, sessionData, options) {
    const body = listWidget.addStack();
    body.size = new Size(options.width, 0);

    for (let column = 0; column < sessionData.length; column++) {
        const currentColumn = body.addStack();
        currentColumn.layoutVertically();
        currentColumn.setPadding(0, options.padding.left, 0, options.padding.right);

        for (let row in sessionData[column]) {
            if (row === "raw") continue;
            const currentCell = currentColumn.addStack();
            currentCell.addSpacer();
            currentCell.setPadding(options.spaceBetweenRows, 0, options.spaceBetweenRows, 0);
            
            // Create gradient background ONLY for title cells
            if (row === "title") {
                createBackgroundGradient(currentCell, "title");
            }

            const cellText = currentCell.addText(sessionData[column][row]);
            cellText.font = (row === "title")
                ? new Font(...options.font.title)
                : new Font(...options.font.body);
            
            if (row === "title") {
                cellText.textColor = new Color("#F5F5F5");
            }

            // Gray out past sessions
            cellText.textOpacity = getTextOpacity(sessionData[column].raw);
            cellText.lineLimit = 1;
            cellText.minimumScaleFactor = 0.5;

            currentCell.addSpacer();
            //currentColumn.addSpacer(options.spaceBetweenRows);
        }
        currentColumn.addSpacer(options.spaceBetweenColumns);
    }
}

/**
 * Creates session data array for the widget
 * @param {Object} race - The race data object containing all session times
 * @returns {Array} Array of session data with formatted times and dates
 */
function createSessionData(race) {
    const raceDateTime = new Date(`${race.date}T${race.time}`);
    const fp1 = race.FirstPractice;
    const fp1DateTime = new Date(`${fp1.date}T${fp1.time}`);
    const quali = race.Qualifying;
    const qualiDateTime = new Date(`${quali.date}T${quali.time}`);
    const isSprint = Object.hasOwn(race, "Sprint");

    const dateTime = [];
    dateTime[0] = {
        title: "FP1",
        day: formatSessionDay(fp1DateTime),
        date: formatSessionDate(fp1DateTime),
        time: formatSessionTime(fp1DateTime),
        raw: fp1DateTime
    };

    let sprintOrSP = isSprint ? race.SprintQualifying : race.SecondPractice;
    const fp2sprintQDateTime = new Date(`${sprintOrSP.date}T${sprintOrSP.time}`);
    dateTime[1] = {
        title: isSprint ? "SQ" : "FP2",
        day: formatSessionDay(fp2sprintQDateTime),
        date: formatSessionDate(fp2sprintQDateTime),
        time: formatSessionTime(fp2sprintQDateTime),
        raw: fp2sprintQDateTime
    };

    sprintOrSP = isSprint ? race.Sprint : race.ThirdPractice;
    const fp3sprintDateTime = new Date(`${sprintOrSP.date}T${sprintOrSP.time}`);
    dateTime[2] = {
        title: isSprint ? "SPR" : "FP3",
        day: formatSessionDay(fp3sprintDateTime),
        date: formatSessionDate(fp3sprintDateTime),
        time: formatSessionTime(fp3sprintDateTime),
        raw: fp3sprintDateTime
    };

    dateTime[3] = {
        title: "Qualifying",
        day: formatSessionDay(qualiDateTime),
        date: formatSessionDate(qualiDateTime),
        time: formatSessionTime(qualiDateTime),
        raw: qualiDateTime
    };

    dateTime[4] = {
        title: "Race",
        day: formatSessionDay(raceDateTime),
        date: formatSessionDate(raceDateTime),
        time: formatSessionTime(raceDateTime),
        raw: raceDateTime
    };

    return dateTime;
}

/**
 * Returns F1 data from cache if fresh enough, otherwise fetches from API
 * @param {string} url - The API endpoint URL to fetch from
 * @param {string} cacheFilename - The name of the cache file to use
 * @param {Function} picker - Function to extract specific data from the response
 * @returns {Promise<Object>} The F1 data
 */
async function getF1Data(url, cacheFilename, picker = (data) => data) {
    const nowMs = Date.now();
    const cached = readFromCache(cacheFilename)
    const options = getOptions()

    const refreshLimit = options.refreshLimitInMinutes < MINUTES_IN_HOUR ? MILLISECONDS_IN_HOUR : options.refreshLimitInMinutes * MILLISECONDS_IN_MINUTE
    // Try reading from cache, intentiaonal not strict equality check (null || undefined)
    if (cached != null) {
        try {
            const ageMs = nowMs - cached.timestamp;

            if (ageMs < refreshLimit) { // 1 hour or more
                console.log("Using cached data");

                return picker(cached.data);
            } else {
                console.log("Cache too old, need fresh data");
            }
        } catch (e) {
            console.log("Error reading cache, will fetch fresh data.");
        }
    }
    
    // Otherwise, fetch fresh data
    try {
        const req = new Request(url);

        req.headers = {
            "User-Agent": `Scriptable: NextF1RaceSchedule/${SCRIPT_VERSION}`
        };

        const data = await req.loadJSON();

        // Cache it
        writeCache(cacheFilename, {
            timestamp: nowMs,
            data
        });

        console.log("Fetched fresh data from API");

        return picker(data);
    } catch (error) {
        // if we can't fetch data (API error, ot network is down), fallback to cache
        console.log("Unable to fetch data, will try reading from cache.");

        try {
            const cached = readFromCache(cacheFilename)

            console.log("Using cached data");

            return picker(cached.data)
        } catch (error) {
            console.error("Unable to fetch data or read from cache: ", error);
        }
    }
}

/**
 * Creates and applies background gradient to a widget
 * @param {ListWidget} widget - The widget to apply gradient to
 * @param {string} [type="widget"] - Type of background ('widget' or 'title')
 */
function createBackgroundGradient(widget, type = "widget") {
    const backgroundConfig = WIDGET_LAYOUT.background[type];
    let gradient = new LinearGradient();
    
    gradient.locations = backgroundConfig.gradient.locations;
    gradient.colors = backgroundConfig.gradient.colors;
    
    if (backgroundConfig.gradient.startPoint && backgroundConfig.gradient.endPoint) {
        gradient.startPoint = backgroundConfig.gradient.startPoint;
        gradient.endPoint = backgroundConfig.gradient.endPoint;
    }
    
    widget.backgroundGradient = gradient;
    
    if (backgroundConfig.cornerRadius !== undefined) {
        widget.cornerRadius = backgroundConfig.cornerRadius;
    }
}

function formatRaceWeekendDates(startDate, endDate) {
    const startMonth = startDate.toLocaleString('en-GB', { month: 'short' });
    const endMonth = endDate.toLocaleString('en-GB', { month: 'short' });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();

    if (startMonth === endMonth) {
        return `${startDay} - ${endDay} ${endMonth}`;
    } else {
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
}

/**
 * Formats a date to show the day of the week (e.g. "Mon")
 * @param {Date} sessionDay - The date to format
 * @returns {string} Formatted day string
 */
function formatSessionDay(sessionDay) {
    return sessionDay.toLocaleDateString(getOptions().locale, { weekday: "short" });
}

/**
 * Formats a date to show month and day (e.g. "4/15")
 * @param {Date} sessionDate - The date to format
 * @returns {string} Formatted date string
 */
function formatSessionDate(sessionDate) {
    //return sessionDate.toLocaleDateString(getOptions().locale, { month: "numeric", day: "numeric" });
    const day = sessionDate.getDate();
	const month = sessionDate.getMonth() + 1;
	return `${day}/${month}`;
}

/**
 * Formats a time according to user preferences (12/24 hour)
 * @param {Date} sessionTime - The time to format
 * @returns {string} Formatted time string
 */
function formatSessionTime(sessionTime) {
    return sessionTime.toLocaleTimeString(getOptions().locale, { hour12: getOptions().timeAMPM, hour: "numeric", minute: "numeric" });
}

/**
 * Checks for script updates and shows a notification if a newer version is available
 * @returns {Promise<void>}
 */
async function checkForUpdates() {
    let lastCheckData = { timestamp: 0, lastNotifiedVersion: SCRIPT_VERSION };
    
    try {
        const cached = readFromCache(CACHE_FILES.lastUpdateCheck);
        if (cached) {
            lastCheckData = cached;
        }
    } catch (e) {
        console.log("No valid last check data found, will check for updates");
    }

    // Only check once per day
    if (DATE_NOW - lastCheckData.timestamp < UPDATE_CHECK_INTERVAL) {
        return;
    }

    try {
        const req = new Request(UPDATE_URL);
        const newCode = await req.loadString();

        // Extract version from the new code
        const versionMatch = newCode.match(/const SCRIPT_VERSION = "([^"]+)"/);
        if (!versionMatch) {
            console.log("Could not find version in new code");
            return;
        }

        const newVersion = versionMatch[1];
        const currentVersion = SCRIPT_VERSION;

        // Compare versions and check if we've already notified about this version
        if (newVersion > currentVersion && newVersion !== lastCheckData.lastNotifiedVersion) {
            const notification = new Notification();
            notification.title = "F1 Race Schedule Update Available";
            notification.body = `Version ${newVersion} is available. Current version: ${currentVersion}`;
            notification.sound = "default";

            // Add action to update the script
            notification.openURL = URLScheme.forRunningScript()

            await notification.schedule();
            
            // Update last notified version
            lastCheckData.lastNotifiedVersion = newVersion;
        }

        // Update last check timestamp
        lastCheckData.timestamp = DATE_NOW;
        writeCache(CACHE_FILES.lastUpdateCheck, lastCheckData);
    } catch (error) {
        console.error("Failed to check for updates:", error);
    }
}

/**
 * Updates the script with the latest version from the update URL
 * @returns {Promise<void>}
 */
async function updateScript() {
    const alert = new Alert();

    alert.title = `Update "${SCRIPT_NAME}" code?`;
    alert.message = "This will overwrite your local changes!";
    alert.addCancelAction("No");
    alert.addDestructiveAction("Yes, overwrite");
    const choice = await alert.present();

    if (choice === -1) {
        // User tapped "No"
        return;
    }

    let updateMessage;

    try {
        const req = new Request(UPDATE_URL);
        const newCode = await req.loadString();
        fm.writeString(SCRIPT_PATH, newCode);
        updateMessage = "Code updated. Close & reopen the script to see changes.";
    } catch (error) {
        updateMessage = `Update failed. ${error}`;
    }

    const resultAlert = new Alert();
    resultAlert.title = "Update code";
    resultAlert.message = updateMessage;
    resultAlert.addCancelAction("OK");
    await resultAlert.present();
}
