import { NextResponse } from "next/server";
import {
  mkdir,
  writeFile,
  copyFile,
  readFile,
  readdir,
  access,
  unlink,
  stat,
  rm,
} from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import AdmZip from "adm-zip";
import formidable from "formidable";

export const jobStatus = {};

export const config = {
  api: {
    bodyParser: false,
  },
};

// Parse multipart form data for App Router
async function parseFormData(request) {
  // Convert the Request to a Node.js readable stream
  const readableStream = request.body;

  return new Promise((resolve, reject) => {
    const uploadDir = path.join(process.cwd(), "uploads");

    // Ensure uploads directory exists
    if (!existsSync(uploadDir)) {
      mkdir(uploadDir, { recursive: true }).catch(reject);
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
    });

    // We need a Node.js request object, so we'll simulate one
    const chunks = [];

    // Collect all request data
    readableStream
      .getReader()
      .read()
      .then(function processText({ done, value }) {
        if (done) {
          // Create a simulated request with the body data
          const simulatedReq = {
            headers: Object.fromEntries(request.headers),
            body: Buffer.concat(chunks),
          };

          // Now parse with formidable
          form.parse(simulatedReq, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
          });
          return;
        }

        // Store chunks
        chunks.push(value);

        // Get the next chunk
        return readableStream.getReader().read().then(processText);
      })
      .catch(reject);
  });
}
// Helper function to check if file exists
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Async temperature setting update
async function updateTemperatureSetting(settingsFile) {
  try {
    const settingsContent = await readFile(settingsFile, "utf8");
    const settings = JSON.parse(settingsContent);

    const temperatureSetting = settings.Settings.find(
      (setting) => setting.title === "Temperature"
    );
    if (temperatureSetting) {
      temperatureSetting.currentSetting = {
        symbol: "F",
        description: "Fahrenheit",
      };
      await writeFile(settingsFile, JSON.stringify(settings, null, 2), "utf8");
    } else {
      console.warn("Temperature setting not found in wduSettings.json");
    }
  } catch (error) {
    console.warn("Unable to update wduSettings.json:", error);
  }
}

// Function to copy or decode icons into /web/images
async function copyIconToImagesFolder(extractionPath, iconPath, iconName, configType) {
  // Determine structure type from user's explicit choice
  const isCoreLightStructure = (configType === "serv-plus");
  
  let imagesDir;
  // Both core-light and standard core have files in web/ directory  
  imagesDir = path.join(extractionPath, "web", "images");
  
  await mkdir(imagesDir, { recursive: true });

  const destination = path.join(imagesDir, iconName);

  // Check if the iconPath is a Base64 encoded image
  if (typeof iconPath === "string" && iconPath.startsWith("data:image/")) {
    const base64Data = iconPath.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    await writeFile(destination, buffer);
  } else {
    // Copy from local file system
    await copyFile(iconPath, destination);
  }
  return `images/${iconName}`;
}

// Update brand name in JSON files
async function updateBrandName(jsonFilePath, brandName) {
  try {
    // Read the JSON file
    let jsonContent = await readFile(jsonFilePath, "utf8");

    // Replace Artek with brand name in the raw content
    jsonContent = jsonContent.replace(/Digital Switching/gi, brandName);

    // Write the updated content back
    await writeFile(jsonFilePath, jsonContent);
    console.log(`Updated brand name in ${path.basename(jsonFilePath)}`);
  } catch (error) {
    console.warn(`Error processing ${jsonFilePath}: ${error.message}`);
  }
}

// Add a new function to process system configuration

async function processSystemConfiguration(extractionPath, body, configType) {
  try {
    console.log(`Processing ${configType} system configuration...`);

    // Determine structure type from user's explicit choice
    const isCoreLightStructure = (configType === "serv-plus");
    
    // Determine the correct config file path based on structure
    let configPath;
    // Both core-light and standard core have files in web/ directory
    configPath = path.join(
      extractionPath,
      "web",
      "garmin",
      configType === "serv-plus" ? "empirbus_config1.json" : "config1.json"
    );

    if (!(await fileExists(configPath))) {
      console.warn(`${configType} config file not found at ${configPath}`);
      return;
    }

    const configContent = await readFile(configPath, "utf8");
    const config = JSON.parse(configContent);

    // Create system configuration object
    const systemConfig = {
      // Power System
      power: {
        secondAlternator: body.hasSecondAlternator === "true",
        orionXS: body.hasOrionXS === "true",
        primarySolar: body.hasPrimarySolar === "true",
        auxSolar: body.hasAuxSolar === "true",
      },

      // Heating System
      heating: {
        mainHeater: body.hasHeater === "true",
        electricHeat: body.hasElectricHeat === "true",
        engineHeat: body.hasEngineHeat === "true",
        floorHeat: body.hasFloorHeat === "true",
        fan: body.hasHeatFan === "true",
        auxHeat: body.hasAuxHeat === "true",
      },

      // AC System
      airConditioning: {
        enabled: body.hasAirConditioner === "true",
        type: body.acType || "cruise-n-comfort",
        heatPump: body.hasHeatPump === "true",
      },

      // Temperature setting
      temperature: {
        useCelsius: body.useCelsius === "true",
      },

      // Ventilation
      ventilation: {
        fanCount: parseInt(body.ventilationFanCount || "1"),
      },

      // Plumbing
      plumbing: {
        tankCount: parseInt(body.tankCount || "1"),
        tankTypes: body.tankTypes
          ? JSON.parse(body.tankTypes)
          : ["Fresh Water"],
      },

      // RGB Lighting
      rgbLighting: {
        enabled: body.hasRgbLighting === "true",
        controllerCount: parseInt(body.rgbControllerCount || "1"),
        zonesPerController: parseInt(body.rgbZonesPerController || "1"),
      },

      // Accessories
      accessories: {
        slides: {
          enabled: body.hasSlides === "true",
          count: parseInt(body.slideCount || "0"),
        },
        awning: {
          enabled: body.hasAwning === "true",
          count: parseInt(body.awningCount || "0"),
        },
      },
    };

    // Add system configuration to the main config
    if (!config.systemConfig) {
      config.systemConfig = {};
    }

    // Merge with existing or replace
    config.systemConfig = {
      ...config.systemConfig,
      ...systemConfig,
    };

    // Write updated config back to file
    await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
    console.log(
      `Updated ${configType} system configuration in ${path.basename(
        configPath
      )}`
    );

    // If temperature is in Celsius, update the temperature setting file
    let settingsFilePath;
    // Both core-light and standard core have files in web/ directory
    settingsFilePath = path.join(extractionPath, "web", "wduSettings.json");
    
    if (body.useCelsius === "true" && (await fileExists(settingsFilePath))) {
      try {
        const settingsContent = await readFile(settingsFilePath, "utf8");
        const settings = JSON.parse(settingsContent);

        const temperatureSetting = settings.Settings.find(
          (setting) => setting.title === "Temperature"
        );

        if (temperatureSetting) {
          temperatureSetting.currentSetting = {
            symbol: "C",
            description: "Celsius",
          };
          await writeFile(
            settingsFilePath,
            JSON.stringify(settings, null, 2),
            "utf8"
          );
          console.log("Updated temperature setting to Celsius");
        }
      } catch (error) {
        console.warn("Error updating temperature setting:", error);
      }
    }
  } catch (error) {
    console.error(
      `Error processing ${configType} system configuration:`,
      error
    );
  }
}

// Function to control element visibility based on system configuration
async function processElementVisibility(extractionPath, body, configType) {
  try {
    console.log(`Processing ${configType} element visibility configuration...`);

    // Both core-light and standard core have files in web/ directory
    const htmlFilePath = path.join(extractionPath, "web", "index1.html");

    if (!(await fileExists(htmlFilePath))) {
      console.warn(`HTML file not found at ${htmlFilePath}`);
      return;
    }

    let htmlContent = await readFile(htmlFilePath, "utf8");

    // Create element visibility mappings based on our ID analysis
    const elementVisibilityMap = {
      // Power System Elements
      hasPrimarySolar: [
        'solar-power-column',
        'solar-data-panel', 
        'primary-solar-section',
        'solar-charge-icon'
      ],
      hasSecondAlternator: [
        // These elements don't exist in current HTML - would need to be added
        'second-alternator-column',
        'alternator-2-panel'
      ],
      hasOrionXS: [
        // These elements don't exist in current HTML - would need to be added
        'orion-xs-panel',
        'orion-xs-controls'
      ],
      hasAuxSolar: [
        // These elements don't exist in current HTML - would need to be added
        'aux-solar-panel',
        'auxiliary-solar-section'
      ],

      // Climate Control Elements  
      hasHeatingSystem: [
        'heating-tab-btn',
        'heat-source',
        'hot-water-aux'
      ],
      hasAirConditioner: [
        'cooling-tab-btn',
        'ac-mode',
        'ac-fan'
      ],
      hasVentilation: [
        'ventilation-tab-btn',
        'vent-1-controls'
      ],

      // Accessories Elements
      hasAwning: [
        'awning-controls-container',
        'awning-control',
        'awning-main-controls'
      ],
      hasSlides: [
        'slide-controls-container', 
        'slide-control',
        'slide-main-controls'
      ],
      hasRgbLighting: [
        'rgb-lighting-tab-btn',
        'rgb-tab',
        'rgb-zone-navigation',
        'rgb-zone-1-grid',
        'zone-1-tab',
        'zone-2-tab',
        'zone-3-tab', 
        'zone-4-tab'
      ]
    };

    let modificationsCount = 0;

    // Process each configuration option
    for (const [configKey, elementIds] of Object.entries(elementVisibilityMap)) {
      const isEnabled = body[configKey] === "true";
      const displayValue = isEnabled ? "block" : "none";
      
      console.log(`${configKey}: ${isEnabled ? 'enabled' : 'disabled'} - setting elements to display: ${displayValue}`);

      // Apply visibility to each element ID
      for (const elementId of elementIds) {
        // First check if the element exists in the HTML
        const elementExists = htmlContent.includes(`id="${elementId}"`);
        
        if (!elementExists) {
          console.log(`Element with ID "${elementId}" not found in HTML - skipping`);
          continue;
        }

        // Create more robust regex to match the element
        const elementRegex = new RegExp(`(<[^>]*\\s+id="${elementId}"[^>]*)(>)`, 'g');
        
        const originalLength = htmlContent.length;
        htmlContent = htmlContent.replace(elementRegex, (match, beforeClose, close) => {
          // Remove any existing display style
          let updatedElement = beforeClose.replace(/\s*style="[^"]*display:\s*[^;"]+(;[^"]*)?"/gi, (styleMatch) => {
            return styleMatch.replace(/display:\s*[^;"]+(;)?/gi, '$1').replace(/style="[\s;]*"/gi, '');
          });
          
          // Add or update the style attribute with display property
          if (updatedElement.includes('style="')) {
            updatedElement = updatedElement.replace(/style="([^"]*)"/, (styleMatch, existingStyles) => {
              // Clean up existing styles and add display
              const cleanStyles = existingStyles.replace(/display:\s*[^;"]+(;)?/gi, '').trim();
              const separator = cleanStyles && !cleanStyles.endsWith(';') ? '; ' : '';
              return `style="${cleanStyles}${separator}display: ${displayValue}"`;
            });
          } else {
            updatedElement = `${updatedElement} style="display: ${displayValue}"`;
          }
          
          return updatedElement + close;
        });

        // Check if the replacement was successful
        if (htmlContent.length !== originalLength) {
          modificationsCount++;
          console.log(`Successfully modified element: ${elementId}`);
        }
      }
    }

    // Write the updated HTML content back to file
    await writeFile(htmlFilePath, htmlContent, "utf8");
    console.log(`Updated element visibility in ${path.basename(htmlFilePath)} - ${modificationsCount} elements modified`);

    // Also add CSS rules to ensure proper hiding/showing
    await addVisibilityCSS(extractionPath, configType);

  } catch (error) {
    console.error(
      `Error processing ${configType} element visibility:`,
      error
    );
  }
}

// Function to add CSS rules for element visibility
async function addVisibilityCSS(extractionPath, configType) {
  try {
    const cssFilePath = path.join(extractionPath, "web", "mod.css");
    
    if (await fileExists(cssFilePath)) {
      let cssContent = await readFile(cssFilePath, "utf8");
      
      // Check if visibility CSS is already added
      if (!cssContent.includes("/* Element Visibility Control */")) {
        const visibilityCSS = `

/* Element Visibility Control - Added by Graphics Editor */
[style*="display: none"] {
  display: none !important;
}

[style*="display: block"] {
  display: block !important;
}

/* Ensure smooth transitions when showing/hiding elements */
.fade-transition {
  transition: opacity 0.3s ease-in-out;
}

.fade-transition[style*="display: none"] {
  opacity: 0;
}

.fade-transition[style*="display: block"] {
  opacity: 1;
}

/* Specific visibility overrides for system components */
#solar-power-column[style*="display: none"],
#heating-tab-btn[style*="display: none"],
#cooling-tab-btn[style*="display: none"],
#ventilation-tab-btn[style*="display: none"],
#rgb-lighting-tab-btn[style*="display: none"],
#awning-controls-container[style*="display: none"],
#slide-controls-container[style*="display: none"] {
  display: none !important;
}

#solar-power-column[style*="display: block"],
#heating-tab-btn[style*="display: block"],
#cooling-tab-btn[style*="display: block"], 
#ventilation-tab-btn[style*="display: block"],
#rgb-lighting-tab-btn[style*="display: block"],
#awning-controls-container[style*="display: block"],
#slide-controls-container[style*="display: block"] {
  display: block !important;
}
`;
        
        cssContent += visibilityCSS;
        await writeFile(cssFilePath, cssContent, "utf8");
        console.log("Added element visibility CSS rules");
      }
    }
  } catch (error) {
    console.warn("Could not add visibility CSS:", error);
  }
}

// Function to process custom color themes
async function processColorTheme(extractionPath, body, configType) {
  try {
    console.log(`Processing ${configType} color theme customization...`);

    // Check if custom colors are being used
    const useCustomColors = body.useCustomColors === "true";
    const selectedTheme = body.selectedTheme;
    
    if (!useCustomColors && selectedTheme === 'default') {
      console.log("Using default colors, no theme processing needed");
      return;
    }

    let colorTheme = null;
    if (body.colorTheme) {
      try {
        colorTheme = JSON.parse(body.colorTheme);
      } catch (error) {
        console.warn("Error parsing color theme:", error);
        return;
      }
    }

    if (!colorTheme) {
      console.log("No valid color theme data provided");
      return;
    }

    const cssFilePath = path.join(extractionPath, "web", "mod.css");
    
    if (await fileExists(cssFilePath)) {
      let cssContent = await readFile(cssFilePath, "utf8");
      
      // Check if custom theme CSS is already added
      if (!cssContent.includes("/* Custom Color Theme */")) {
        const customThemeCSS = `

/* Custom Color Theme - Added by Graphics Editor */
:root {
  --custom-primary-bg: ${colorTheme.primaryBackground};
  --custom-secondary-bg: ${colorTheme.primaryBackground}; /* Uses same as primary for consistency */
  --custom-primary-text: ${colorTheme.primaryText};
  --custom-secondary-text: ${colorTheme.secondaryText};
  --custom-accent-color: ${colorTheme.accentColor};
  --custom-border-color: ${colorTheme.borderColor};
  --custom-button-bg: ${colorTheme.buttonBackground};
  --custom-button-text: ${colorTheme.buttonText};
  --custom-active-bg: ${colorTheme.activeBackground};
  --custom-active-text: ${colorTheme.activeText};
}

/* Apply custom theme colors */
body {
  background-color: var(--custom-primary-bg) !important;
  color: var(--custom-primary-text) !important;
}

.header {
  border-bottom-color: var(--custom-border-color) !important;
}

h2, .power-label, .hvac-label, .lighting-label, .plumbing-label {
  color: var(--custom-primary-text) !important;
  border-bottom-color: var(--custom-border-color) !important;
}

span, .temp-value, .time-value, .data-label, .data-value {
  color: var(--custom-primary-text) !important;
}

/* Button styles */
.pill-btn, .round-btn, button {
  background-color: var(--custom-button-bg) !important;
  border-color: var(--custom-border-color) !important;
}

.pill-btn-text, .round-btn {
  color: var(--custom-button-text) !important;
}

.pill-btn.active .pill-btn-text, .round-btn.active {
  color: var(--custom-active-text) !important;
}

/* Navigation tabs */
.tab-navigation {
  background-color: var(--custom-primary-bg) !important;
  border-top-color: var(--custom-border-color) !important;
}

/* HVAC and lighting tabs */
.hvac-tabs, .lighting-tabs, .rgb-zone-tabs {
  border-bottom-color: var(--custom-border-color) !important;
}

.hvac-tab-button, .lighting-tab-button, .rgb-zone-button {
  color: var(--custom-secondary-text) !important;
}

.hvac-tab-button.active, .lighting-tab-button.active, .rgb-zone-button.active {
  color: var(--custom-primary-text) !important;
}

/* Sliders and controls */
.slider, .temp-slider, .dimmer-slider {
  background: var(--custom-border-color) !important;
}

.control-value, .current-temp, .target-temp, .set-temp {
  color: var(--custom-secondary-text) !important;
}

/* Status indicators and values */
.signal-value, .battery-signal, .tank-percentage {
  color: var(--custom-primary-text) !important;
}

/* Accent color applications */
:root {
  --accent-color: var(--custom-accent-color);
}

/* Modal styles */
.modal-content {
  background-color: var(--custom-primary-bg) !important;
  border-color: var(--custom-border-color) !important;
  color: var(--custom-primary-text) !important;
}

.modal-header {
  border-bottom-color: var(--custom-border-color) !important;
}

.close-modal {
  color: var(--custom-primary-text) !important;
}

/* Main container backgrounds - Override all hardcoded #193646 */
body, .log {
  background-color: var(--custom-primary-bg) !important;
}

/* Component container backgrounds */
.power-item, .hvac-control-item, .plumbing-control-item, .thermostat,
.tank-gauge-container, .control-group, .lighting-image-column,
.plumbing-tanks-column {
  background-color: var(--custom-secondary-bg) !important;
}

/* Button and interactive element backgrounds */
button, .round-btn, .pill-btn, .toggle-switch-slider, .thermostat-btn:hover,
.control-value-container, #preset-limits, .control-btn:hover {
  background-color: var(--custom-button-bg) !important;
}

/* Override specific hardcoded background colors */
input[type="range"]::-webkit-slider-thumb,
input[type="range"]::-ms-thumb,
.temp-slider::-webkit-slider-thumb,
.temp-slider::-moz-range-thumb {
  background: var(--custom-button-bg) !important;
}

/* Active states and toggles */
.toggle-switch-input:checked + .toggle-switch-slider:before {
  background-color: var(--custom-button-bg) !important;
}

/* Active text colors */
.pill-btn.active .pill-btn-text, .round-btn.active, .toggle-btn.active {
  color: var(--custom-active-text) !important;
}

/* Status indicator backgrounds */
.status-indicator {
  background-color: var(--custom-button-bg) !important;
}
`;
        
        cssContent += customThemeCSS;
        await writeFile(cssFilePath, cssContent, "utf8");
        console.log(`Applied custom color theme: ${selectedTheme}`);
      }
    }
  } catch (error) {
    console.error(
      `Error processing ${configType} color theme:`,
      error
    );
  }
}

// Helper function to get base channel number from group key
function getBaseChannelFromGroupKey(groupKey) {
  if (groupKey.includes("genesis")) {
    return 7; // Genesis channels start at 7
  }

  // Extract the numeric part from groupKey (e.g., "1-5" from "core-1-5")
  const match = groupKey.match(/(\d+)-\d+$/);
  if (match && match[1]) {
    return parseInt(match[1]);
  }

  console.warn(`Couldn't parse base channel from group key: ${groupKey}`);
  return 0;
}

// Fix #2: Fix the processChannelConfiguration function
async function processChannelConfiguration(
  extractionPath,
  channelConfig,
  configType
) {
  try {
    console.log(`Processing ${configType} channel configuration...`);
    console.log('processChannelConfiguration received:', JSON.stringify(channelConfig, null, 2));

    // Determine structure type from user's explicit choice
    const isCoreLightStructure = (configType === "serv-plus");
    
    // Determine the correct config file path based on structure
    let configPath;
    // Both core-light and standard core have files in web/ directory
    configPath = path.join(
      extractionPath,
      "web",
      "garmin",
      configType === "serv-plus" ? "empirbus_config1.json" : "config1.json"
    );

    if (!(await fileExists(configPath))) {
      console.warn(`${configType} config file not found at ${configPath}`);
      return;
    }

    const configContent = await readFile(configPath, "utf8");
    const config = JSON.parse(configContent);

    // Iterate through channel groups
    for (const [groupKey, group] of Object.entries(channelConfig)) {
      // Fix: Get baseChannel inside the loop for each group
      const baseChannel = getBaseChannelFromGroupKey(groupKey);

      if (group.enabled) {
        // Process each channel
        for (let i = 0; i < group.channels.length; i++) {
          const channel = group.channels[i];
          const channelNum = baseChannel + i;

          if (config.channels) {
            const channelConfig = config.channels.find(
              (c) => c.channel === channelNum
            );
            if (channelConfig) {
              // Update channel visibility based on individual channel enabled status
              channelConfig.visible = channel.enabled;

              // Only update other properties if channel is enabled
              if (channel.enabled) {
                console.log(
                  `Configuring ${configType} channel ${channelNum}: ${channel.name}, tag: ${channel.tag}, type: ${channel.type || 'undefined'}`
                );

                if (channel.name) {
                  channelConfig.name = channel.name;
                }

                channelConfig.tag = channel.tag;

                if (channel.icon) {
                  const iconFilename = path.basename(channel.icon);
                  channelConfig.icon = iconFilename;

                  await copyIconToImagesFolder(
                    extractionPath,
                    channel.icon,
                    iconFilename,
                    configType
                  );
                }
              }
            }
          }
        }
      } else {
        // If group is disabled, hide these channels
        for (let i = 0; i < group.channels.length; i++) {
          const channelNum = baseChannel + i;
          if (config.channels) {
            const channelConfig = config.channels.find(
              (c) => c.channel === channelNum
            );
            if (channelConfig) {
              channelConfig.visible = false;
            }
          }
        }
      }
    }

    // Write updated config back to file
    await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
    console.log(
      `Updated ${configType} channel configuration in ${path.basename(
        configPath
      )}`
    );
  } catch (error) {
    console.error(
      `Error processing ${configType} channel configuration:`,
      error
    );
  }
}

// Helper function to get the correct signal ID for a channel based on type
function getSignalIdForChannelType(channelNumber, channelType) {
  // Signal ID mapping based on signal-info.json pattern
  const signalMappings = {
    1: { pbc: 83, dcu: 2, dimming: 4, ramping: 3, momentary: 89 },
    2: { pbc: 5, dcu: 6, dimming: 8, ramping: 7, momentary: 90 },
    3: { pbc: 9, dcu: 10, dimming: 12, ramping: 11, momentary: 91 },
    4: { pbc: 13, dcu: 14, dimming: 16, ramping: 15, momentary: 92 },
    5: { pbc: 17, dcu: 18, dimming: 20, ramping: 19, momentary: 93 },
    6: { pbc: 21, dcu: 22, dimming: 24, ramping: 23, momentary: 94 },
    // Genesis board channels 7-10
    7: { pbc: 18, dcu: 25, dimming: 27, ramping: 26, momentary: 95 },
    8: { pbc: 19, dcu: 28, dimming: 30, ramping: 29, momentary: 96 },
    9: { pbc: 20, dcu: 31, dimming: 33, ramping: 32, momentary: 97 },
    10: { pbc: 21, dcu: 34, dimming: 36, ramping: 35, momentary: 98 }
  };

  const channelMap = signalMappings[channelNumber];
  if (!channelMap) {
    console.warn(`No signal mapping found for channel ${channelNumber}`);
    return null;
  }

  switch (channelType.toLowerCase()) {
    case 'toggle':
    case 'latching':
      return channelMap.pbc; // Push Button Control
    case 'momentary':
      return channelMap.momentary; // Momentary-specific signal IDs (89-94)
    case 'dimmable':
    case 'dimming':
    case 'dimmer':
      return channelMap.dcu; // Dimmer Control Unit
    default:
      console.warn(`Unknown channel type: ${channelType} for channel ${channelNumber}`);
      return channelMap.pbc; // Default to PBC
  }
}

// Helper function to generate the correct HTML content based on channel type
function generateChannelHtmlContent(channel, channelNumber, signalId, iconWhitePath, iconBlackPath, configType) {
  const channelName = channel.name || `Channel ${channelNumber}`;
  
  // Determine structure type from user's explicit choice
  const isCoreLightStructure = (configType === "serv-plus");
  
  console.log(`Generating HTML for channel ${channelNumber}, type: ${channel.type}, signalId: ${signalId}, isCoreLightStructure: ${isCoreLightStructure}`);
  
  switch (channel.type?.toLowerCase()) {
    case 'dimmable':
    case 'dimming':
    case 'dimmer':
      console.log(`Creating dimmer HTML for channel ${channelNumber}`);
      if (isCoreLightStructure) {
        // Core-light dimmer structure
        return {
          container: `<div class="switch-control-item" id="channel-${channelNumber}-container">
        <div class="switch-control-content dimmer-content" id="channel-${channelNumber}-control">
          <div class="dimmer-slider-container">
            <input
              type="range"
              id="generic-dimmer"
              class="slider dimmer-slider"
              data-id="${signalId}"
              data-channel-id="${signalId}"
              data-signal-id="${signalId}"
              min="0"
              max="1000"
              value="50"
              step="1"
            />
          </div>
        </div>
        <span class="switch-label" id="channel-${channelNumber}-label">${channelName}</span>
      </div>`,
          control: `<div class="dimmer-slider-container">
            <input
              type="range"
              id="generic-dimmer"
              class="slider dimmer-slider"
              data-id="${signalId}"
              data-channel-id="${signalId}"
              data-signal-id="${signalId}"
              min="0"
              max="1000"
              value="50"
              step="1"
            />
          </div>`,
          label: channelName
        };
      } else {
        // Standard core dimmer structure
        return {
          container: `<div class="lighting-control-item" id="channel-${channelNumber}-container">
        <span class="lighting-label" id="channel-${channelNumber}-label">${channelName}</span>
        <div class="slider-container" id="channel-${channelNumber}-control">
          <input
            type="range"
            class="slider"
            data-id="${signalId}"
            data-channel-id="${signalId}"
            data-signal-id="${signalId}"
            min="0"
            max="100"
            value="50"
          />
        </div>
      </div>`,
          control: `<div class="slider-container">
          <input
            type="range"
            class="slider"
            data-id="${signalId}"
            data-channel-id="${signalId}"
            data-signal-id="${signalId}"
            min="0"
            max="100"
            value="50"
          />
        </div>`,
          label: channelName
        };
      }
      
    case 'toggle':
    case 'latching':
    case 'momentary':
    default:
      console.log(`Creating button HTML for channel ${channelNumber}, hasIcons: ${!!(iconWhitePath && iconBlackPath)}`);
      const hasIcons = iconWhitePath && iconBlackPath;
      
      if (isCoreLightStructure) {
        // Core-light button structure
        if (hasIcons) {
          return {
            container: `<div class="switch-control-item" id="channel-${channelNumber}-container">
        <div class="switch-control-content" id="channel-${channelNumber}-control">
          <button
            class="round-btn toggle-btn"
            data-id="${signalId}"
            data-channel-id="${signalId}"
            data-signal-id="${signalId}"
          >
            <img
              src="${iconWhitePath}"
              class="icon inactive"
              alt="${channelName}"
            />
            <img
              src="${iconBlackPath}"
              class="icon active"
              alt="${channelName} Active"
            />
          </button>
        </div>
        <span class="switch-label" id="channel-${channelNumber}-label">${channelName}</span>
      </div>`,
            control: `<button
            class="round-btn toggle-btn"
            data-id="${signalId}"
            data-channel-id="${signalId}"
            data-signal-id="${signalId}"
          >
            <img
              src="${iconWhitePath}"
              class="icon inactive"
              alt="${channelName}"
            />
            <img
              src="${iconBlackPath}"
              class="icon active"
              alt="${channelName} Active"
            />
          </button>`,
            label: channelName
          };
        } else {
          return {
            container: `<div class="switch-control-item" id="channel-${channelNumber}-container">
        <div class="switch-control-content" id="channel-${channelNumber}-control">
          <button
            class="round-btn toggle-btn"
            data-id="${signalId}"
            data-channel-id="${signalId}"
            data-signal-id="${signalId}"
          >
            <span class="button-text">${channelName}</span>
          </button>
        </div>
        <span class="switch-label" id="channel-${channelNumber}-label">${channelName}</span>
      </div>`,
            control: `<button
            class="round-btn toggle-btn"
            data-id="${signalId}"
            data-channel-id="${signalId}"
            data-signal-id="${signalId}"
          >
            <span class="button-text">${channelName}</span>
          </button>`,
            label: channelName
          };
        }
      } else {
        // Standard core button structure
        if (hasIcons) {
          return {
            container: `<div class="button-item" id="channel-${channelNumber}-container">
        <span class="button-label" id="channel-${channelNumber}-label">${channelName}</span>
        <button class="round-btn toggle-btn" data-id="${signalId}" id="channel-${channelNumber}-control">
          <img
            src="${iconWhitePath}"
            class="icon inactive"
            alt="${channelName}"
          />
          <img
            src="${iconBlackPath}"
            class="icon active"
            alt="${channelName} Active"
          />
        </button>
      </div>`,
            control: `<button class="round-btn toggle-btn" data-id="${signalId}">
          <img
            src="${iconWhitePath}"
            class="icon inactive"
            alt="${channelName}"
          />
          <img
            src="${iconBlackPath}"
            class="icon active"
            alt="${channelName} Active"
          />
        </button>`,
            label: channelName
          };
        } else {
          return {
            container: `<div class="button-item" id="channel-${channelNumber}-container">
        <span class="button-label" id="channel-${channelNumber}-label">${channelName}</span>
        <button class="round-btn toggle-btn" data-id="${signalId}" id="channel-${channelNumber}-control">
          <span class="button-text">${channelName}</span>
        </button>
      </div>`,
            control: `<button class="round-btn toggle-btn" data-id="${signalId}">
          <span class="button-text">${channelName}</span>
        </button>`,
            label: channelName
          };
        }
      }
  }
}

/**
 * Ensures all 10 channel containers exist in the HTML
 * @param {string} htmlContent - Original HTML content
 * @param {string} configType - Configuration type
 * @returns {string} Modified HTML content with all 10 channels
 */
function ensureAllChannelsExist(htmlContent, configType) {
  // Determine structure type from user's explicit choice
  const isCoreLightStructure = (configType === "serv-plus");
  
  console.log(`Ensuring all 10 channels exist (isCoreLightStructure: ${isCoreLightStructure})`);
  
  if (isCoreLightStructure) {
    // Find the switches section
    const switchesStartPattern = /<div class="lighting-control-grid switches"[^>]*>/;
    const switchesStartMatch = htmlContent.match(switchesStartPattern);
    
    if (switchesStartMatch) {
      console.log('Found switches section, ensuring 10 channels exist...');
      
      // Find the matching closing div
      let startIndex = switchesStartMatch.index + switchesStartMatch[0].length;
      let divCount = 1;
      let endIndex = startIndex;
      
      while (divCount > 0 && endIndex < htmlContent.length) {
        const nextOpenDiv = htmlContent.indexOf('<div', endIndex);
        const nextCloseDiv = htmlContent.indexOf('</div>', endIndex);
        
        if (nextCloseDiv === -1) break;
        
        if (nextOpenDiv !== -1 && nextOpenDiv < nextCloseDiv) {
          divCount++;
          endIndex = nextOpenDiv + 4;
        } else {
          divCount--;
          endIndex = nextCloseDiv + 6;
          if (divCount === 0) {
            endIndex = nextCloseDiv;
            break;
          }
        }
      }
      
      let switchesContent = htmlContent.substring(startIndex, endIndex);
      
      // Count existing channels
      const existingChannelPattern = /id="channel-(\d+)-container"/g;
      const existingChannels = new Set();
      let match;
      while ((match = existingChannelPattern.exec(switchesContent)) !== null) {
        existingChannels.add(parseInt(match[1]));
      }
      
      console.log(`Found existing channels: ${Array.from(existingChannels).sort().join(', ')}`);
      
      // Create missing channels
      const missingChannels = [];
      for (let i = 1; i <= 10; i++) {
        if (!existingChannels.has(i)) {
          missingChannels.push(i);
        }
      }
      
      console.log(`Missing channels: ${missingChannels.join(', ') || 'none'}`);
      
      if (missingChannels.length > 0) {
        // Helper function to get the proper signal ID for default buttons
        const getDefaultSignalId = (channelNum) => {
          const signalMappings = {
            1: 83, 2: 5, 3: 9, 4: 13, 5: 17, 6: 22, 7: 18, 8: 19, 9: 20, 10: 21
          };
          return signalMappings[channelNum] || 83;
        };
        
        // Check if we need to create row structures
        const needsRow1 = missingChannels.some(ch => ch >= 1 && ch <= 5);
        const needsRow2 = missingChannels.some(ch => ch >= 6 && ch <= 10);
        
        // Check if rows already exist
        const hasRow1 = switchesContent.includes('id="switches-row-1"');
        const hasRow2 = switchesContent.includes('id="switches-row-2"');
        
        let newContent = switchesContent;
        
        // Create row 1 if needed and doesn't exist
        if (needsRow1 && !hasRow1) {
          const row1Html = `
                    <!-- Row 1: Channels 1-5 -->
                    <div class="switches-row" id="switches-row-1">
                    </div>`;
          newContent += row1Html;
        }
        
        // Create row 2 if needed and doesn't exist
        if (needsRow2 && !hasRow2) {
          const row2Html = `
                    <!-- Row 2: Channels 6-10 -->
                    <div class="switches-row" id="switches-row-2">
                    </div>`;
          newContent += row2Html;
        }
        
        // Now add missing channels to appropriate rows
        for (const channelNum of missingChannels) {
          const signalId = getDefaultSignalId(channelNum);
          const rowId = channelNum <= 5 ? 'switches-row-1' : 'switches-row-2';
          
          let channelHtml;
          
          // Channel 6 is typically a dimmer in the template
          if (channelNum === 6) {
            channelHtml = `
                      <!-- Channel ${channelNum} - Dimmer -->
                      <div class="switch-control-item" id="channel-${channelNum}-container">
                        <div
                          class="switch-control-content dimmer-content"
                          id="channel-${channelNum}-control"
                        >
                          <div
                            class="dimmer-slider-container"
                            id="channel-${channelNum}-dimmer-container"
                          >
                            <input
                              type="range"
                              id="generic-dimmer"
                              class="slider dimmer-slider"
                              data-id="${signalId}"
                              data-channel-id="${signalId}"
                              data-signal-id="${signalId}"
                              min="0"
                              max="1000"
                              value="50"
                              step="1"
                            />
                          </div>
                        </div>
                        <span class="switch-label" id="channel-${channelNum}-label"
                          >Channel ${channelNum}</span
                        >
                      </div>`;
          } else {
            // Standard button channel
            channelHtml = `
                      <!-- Channel ${channelNum} -->
                      <div class="switch-control-item" id="channel-${channelNum}-container">
                        <div
                          class="switch-control-content"
                          id="channel-${channelNum}-control"
                        >
                          <button
                            class="round-btn toggle-btn"
                            data-id="${signalId}"
                            data-channel-id="${signalId}"
                            data-signal-id="${signalId}"
                            id="channel-${channelNum}-btn"
                          >
                            <img
                              src="images/icons/12-white.png"
                              class="icon inactive"
                              alt="Channel ${channelNum}"
                            />
                            <img
                              src="images/icons/12-black.png"
                              class="icon active"
                              alt="Channel ${channelNum} Active"
                            />
                          </button>
                        </div>
                        <span class="switch-label" id="channel-${channelNum}-label"
                          >Channel ${channelNum}</span
                        >
                      </div>`;
          }
          
          // Insert the channel into the appropriate row
          const rowPattern = new RegExp(`(<div class="switches-row" id="${rowId}"[^>]*>[\\s\\S]*?)(</div>\\s*(?=</div>|<!-- Row|$))`, 'g');
          newContent = newContent.replace(rowPattern, `$1${channelHtml}$2`);
        }
        
        // Replace the switches section in the full HTML
        const fullSwitchesSection = htmlContent.substring(switchesStartMatch.index, endIndex + 6);
        const newSwitchesSection = `<div class="lighting-control-grid switches" id="switches-grid">${newContent}</div>`;
        htmlContent = htmlContent.replace(fullSwitchesSection, newSwitchesSection);
        
        console.log(`Created ${missingChannels.length} missing channel elements with proper structure`);
      }
    } else {
      console.warn('Could not find switches section in HTML');
    }
  } else {
    // Standard core structure - similar logic but for button-item elements
    // Implementation would go here if needed
  }
  
  return htmlContent;
}

/**
 * Adds channel IDs to HTML elements for reliable targeting
 * @param {string} htmlContent - Original HTML content
 * @param {boolean} isCoreLightStructure - Whether this is core-light structure
 * @returns {string} Modified HTML content with IDs added
 */
function addChannelIdsToHtml(htmlContent, configType) {
  // Determine structure type from user's explicit choice
  const isCoreLightStructure = (configType === "serv-plus");
  
  console.log(`Adding channel IDs to HTML (isCoreLightStructure: ${isCoreLightStructure})`);
  
  if (isCoreLightStructure) {
    // Core-light structure: Add IDs to switch-control-item elements
    // Look for the switches section first
    console.log('Looking for switches section...');
    
    // Find the switches section - try multiple patterns
    const switchesPatterns = [
      /<div class="lighting-control-grid switches"[^>]*>/,
      /<div[^>]*class="[^"]*lighting-control-grid[^"]*switches[^"]*"[^>]*>/,
      /<div[^>]*id="switches-grid"[^>]*>/
    ];
    
    let switchesStartMatch = null;
    for (const pattern of switchesPatterns) {
      switchesStartMatch = htmlContent.match(pattern);
      if (switchesStartMatch) {
        console.log(`Found switches section using pattern: ${pattern.toString()}`);
        break;
      }
    }
    
    if (switchesStartMatch) {
      console.log('Found switches section start at index:', switchesStartMatch.index);
      
      // Find the matching closing div by counting open/close tags
      let startIndex = switchesStartMatch.index + switchesStartMatch[0].length;
      let divCount = 1; // We already have one open div
      let endIndex = startIndex;
      
      while (divCount > 0 && endIndex < htmlContent.length) {
        const nextOpenDiv = htmlContent.indexOf('<div', endIndex);
        const nextCloseDiv = htmlContent.indexOf('</div>', endIndex);
        
        if (nextCloseDiv === -1) {
          break; // No more closing divs
        }
        
        if (nextOpenDiv !== -1 && nextOpenDiv < nextCloseDiv) {
          // Found an opening div before the closing div
          divCount++;
          endIndex = nextOpenDiv + 4;
        } else {
          // Found a closing div
          divCount--;
          endIndex = nextCloseDiv + 6;
          if (divCount === 0) {
            endIndex = nextCloseDiv; // Don't include the final </div>
            break;
          }
        }
      }
      
      let switchesContent = htmlContent.substring(startIndex, endIndex);
      console.log('Extracted switches content length:', switchesContent.length);
      
      // Process each element type separately to ensure sequential numbering
      
      // 1. Add container IDs to existing switch-control-item divs
      const containerPattern = /<div class="switch-control-item"(?![^>]*id=)/g;
      const containerMatches = [...switchesContent.matchAll(containerPattern)];
      console.log(`Found ${containerMatches.length} switch-control-item elements`);
      
      // Process from end to beginning to avoid index shifting, but number from beginning
      for (let i = containerMatches.length - 1; i >= 0; i--) {
        const match = containerMatches[i];
        const channelNum = i + 1; // i=0 gets channel-1, i=1 gets channel-2, etc.
        const newTag = `<div class="switch-control-item" id="channel-${channelNum}-container"`;
        switchesContent = switchesContent.substring(0, match.index) + newTag + switchesContent.substring(match.index + match[0].length);
      }
      
      // 2. Add control IDs to switch-control-content divs (including those with additional classes)
      const controlPattern = /<div class="switch-control-content[^"]*"(?![^>]*id=)/g;
      const controlMatches = [...switchesContent.matchAll(controlPattern)];
      console.log(`Found ${controlMatches.length} switch-control-content elements`);
      
      for (let i = controlMatches.length - 1; i >= 0; i--) {
        const match = controlMatches[i];
        const channelNum = i + 1;
        // Extract the original class attribute and add the id
        const originalMatch = match[0]; // e.g., 'class="switch-control-content dimmer-content"'
        const newTag = originalMatch + ` id="channel-${channelNum}-control"`;
        switchesContent = switchesContent.substring(0, match.index) + newTag + switchesContent.substring(match.index + match[0].length);
      }
      
      // 3. Add label IDs to spans with switch-label class  
      const labelPattern = /<span class="switch-label"(?![^>]*id=)/g;
      const labelMatches = [...switchesContent.matchAll(labelPattern)];
      console.log(`Found ${labelMatches.length} switch-label elements`);
      
      for (let i = labelMatches.length - 1; i >= 0; i--) {
        const match = labelMatches[i];
        const channelNum = i + 1;
        const newTag = `<span class="switch-label" id="channel-${channelNum}-label"`;
        switchesContent = switchesContent.substring(0, match.index) + newTag + switchesContent.substring(match.index + match[0].length);
      }

      // Check if we need to create additional channels (we need 10 total)
      const currentChannelCount = Math.max(containerMatches.length, controlMatches.length, labelMatches.length);
      console.log(`Current channel count: ${currentChannelCount}, target: 10`);
      
      if (currentChannelCount < 10) {
        console.log(`Creating ${10 - currentChannelCount} additional channel elements...`);
        
        // Create template for additional channels based on the existing structure
        for (let channelNum = currentChannelCount + 1; channelNum <= 10; channelNum++) {
          const additionalChannelHtml = `
                      <!-- Channel ${channelNum} -->
                      <div class="switch-control-item" id="channel-${channelNum}-container">
                        <div
                          class="switch-control-content"
                          id="channel-${channelNum}-control"
                        >
                          <button
                            class="round-btn toggle-btn"
                            data-id="83"
                            data-channel-id="83"
                            data-signal-id="83"
                          >
                            <span class="button-text">Channel ${channelNum}</span>
                          </button>
                        </div>
                        <span class="switch-label" id="channel-${channelNum}-label"
                          >Channel ${channelNum}</span
                        >
                      </div>`;
          
          switchesContent += additionalChannelHtml;
        }
        console.log(`Added ${10 - currentChannelCount} placeholder channel elements`);
      }      // Replace the switches section in the full HTML
      const fullSwitchesSection = htmlContent.substring(switchesStartMatch.index, endIndex + 6); // +6 for </div>
      const newSwitchesSection = `<div class="lighting-control-grid switches">${switchesContent}</div>`;
      htmlContent = htmlContent.replace(fullSwitchesSection, newSwitchesSection);
      
      console.log(`Added IDs to ${Math.max(currentChannelCount, 10)} channels in core-light structure`);
    } else {
      console.warn('Could not find switches section in core-light structure');
    }
  } else {
    // Standard core structure: Add IDs to button-item elements
    // Look for sections with button-item divs
    for (let i = 1; i <= 10; i++) {
      // Pattern to match button-item div that contains Light X
      const containerPattern = new RegExp(
        `(<div class="button-item")(?![^>]*id=)([^>]*>\\s*<span class="button-label"[^>]*>Light ${i}</span>)`,
        'g'
      );
      htmlContent = htmlContent.replace(containerPattern, `$1 id="channel-${i}-container"$2`);
      
      // Pattern to match button-label span for Light X
      const labelPattern = new RegExp(
        `(<span class="button-label")(?![^>]*id=)([^>]*>Light ${i}</span>)`,
        'g'
      );
      htmlContent = htmlContent.replace(labelPattern, `$1 id="channel-${i}-label"$2`);
      
      // Pattern to match the button that follows the Light X label
      const controlPattern = new RegExp(
        `(<span class="button-label"[^>]*>Light ${i}</span>\\s*<button[^>]*class="[^"]*round-btn[^"]*")(?![^>]*id=)`,
        'g'
      );
      htmlContent = htmlContent.replace(controlPattern, `$1 id="channel-${i}-control"`);
    }
  }
  
  console.log(`Finished adding channel IDs to HTML`);
  return htmlContent;
}

/**
 * Updates existing channel elements in the HTML instead of creating new ones
 * @param {string} extractionPath - Path to the extracted ZIP contents
 * @param {Object} channelConfig - Configuration for all channels
 * @param {string} configType - Type of configuration (core-system or serv-plus)
 */
async function updateExistingChannelElements(
  extractionPath,
  channelConfig,
  configType
) {
  try {
    console.log(
      `Updating existing channel elements from ${configType} channel configuration...`
    );

    // Determine structure type from user's explicit choice
    const isCoreLightStructure = (configType === "serv-plus");

    // Get the main HTML file path
    let indexPath;
    // Both core-light and standard core have files in web/ directory
    indexPath = path.join(extractionPath, "web", "index1.html");

    if (!(await fileExists(indexPath))) {
      console.warn(`HTML file ${indexPath} not found.`);
      return;
    }

    // Read the HTML file
    let htmlContent = await readFile(indexPath, "utf8");
    
    console.log(`Reading HTML file: ${indexPath}`);
    console.log(`HTML file size: ${htmlContent.length} characters`);
    console.log(`HTML contains channel-1-container before injection: ${htmlContent.includes('id="channel-1-container"')}`);
    
    // Always ensure all 10 channels exist in the HTML
    console.log('Ensuring all 10 channels exist in HTML...');
    htmlContent = ensureAllChannelsExist(htmlContent, configType);
    
    // Verify all channels now exist
    const finalMissingChannels = [];
    for (let i = 1; i <= 10; i++) {
      if (!htmlContent.includes(`id="channel-${i}-container"`)) {
        finalMissingChannels.push(i);
      }
    }
    
    if (finalMissingChannels.length > 0) {
      console.warn(`Channels still missing after ensuring existence: ${finalMissingChannels.join(', ')}`);
    } else {
      console.log('All 10 channels now exist in HTML');
    }

    // Process each channel group
    for (const groupKey in channelConfig) {
      if (!groupKey.startsWith(configType === "core-system" ? "core-" : "serv-")) continue;

      const group = channelConfig[groupKey];
      
      if (group.enabled) {
        // Process enabled channels in this group
        group.channels.forEach((channel, idx) => {
          // Calculate channel number based on group key and index
          let channelNum;
          if (groupKey.includes("genesis")) {
            channelNum = 7 + idx;
          } else {
            const range = groupKey.split("-").slice(-2).shift();
            channelNum = parseInt(range) + idx;
          }

          // Update channels 1-10 that correspond to the switches tab (1-6 for standard channels, 7-10 for Genesis)
          if (channelNum >= 1 && channelNum <= 10) {
            console.log(`Processing channel ${channelNum} in group ${groupKey}, enabled: ${channel.enabled}, type: ${channel.type}`);
            
            if (channel.enabled) {
              // Get the correct signal ID based on channel type
              const signalId = getSignalIdForChannelType(channelNum, channel.type || 'toggle');
              
              if (!signalId) {
                console.warn(`Could not determine signal ID for channel ${channelNum}, type ${channel.type}`);
                return;
              }

              console.log(`Channel ${channelNum}: type=${channel.type}, signalId=${signalId}`);

              // Determine icon paths
              let whiteIcon, blackIcon;
              if (channel.activeIcon && channel.inactiveIcon) {
                whiteIcon = `images/icons/${channel.inactiveIcon}`;
                blackIcon = `images/icons/${channel.activeIcon}`;
              } else if (channel.iconBase) {
                whiteIcon = `images/icons/${channel.iconBase}-white.png`;
                blackIcon = `images/icons/${channel.iconBase}-black.png`;
              } else if (channel.icon) {
                const iconBase = channel.icon.replace(/-black\.png$|-white\.png$/g, "");
                whiteIcon = `images/icons/${iconBase}-white.png`;
                blackIcon = `images/icons/${iconBase}-black.png`;
              }

              // Generate the new HTML content for this channel
              const newChannelContent = generateChannelHtmlContent(
                channel, 
                channelNum, 
                signalId, 
                whiteIcon, 
                blackIcon,
                configType
              );

              console.log(`Generated content for channel ${channelNum}:`, typeof newChannelContent === 'object' ? `Container: ${newChannelContent.container.substring(0, 100)}...` : newChannelContent.substring(0, 100) + '...');

              // Use the new ID-based replacement approach
              const containerPattern = `id="channel-${channelNum}-container"`;
              const labelPattern = `id="channel-${channelNum}-label"`;
              const controlPattern = `id="channel-${channelNum}-control"`;
              
              console.log(`Looking for channel ${channelNum} IDs`);
              
              // Check if the IDs exist
              const hasContainer = htmlContent.includes(containerPattern);
              const hasLabel = htmlContent.includes(labelPattern);
              const hasControl = htmlContent.includes(controlPattern);
              console.log(`Found container: ${hasContainer}, label: ${hasLabel}, control: ${hasControl}`);
              
              // Add debugging to see the exact search patterns
              console.log(`Searching for patterns:`);
              console.log(`  Container: ${containerPattern}`);
              console.log(`  Label: ${labelPattern}`);
              console.log(`  Control: ${controlPattern}`);
              
              // Also log a snippet of the HTML around where this channel should be
              const searchIndex = htmlContent.indexOf(`channel-${channelNum}`);
              if (searchIndex !== -1) {
                const snippet = htmlContent.substring(Math.max(0, searchIndex - 100), searchIndex + 300);
                console.log(`HTML snippet around channel ${channelNum}:`, snippet);
              } else {
                console.log(`No channel-${channelNum} found in HTML at all`);
              }
              
              if (hasContainer && hasLabel && hasControl && newChannelContent.container) {
                // For type changes (e.g., button to dimmer), replace the entire container
                // Use a more precise regex that matches the exact container structure
                const escapedChannelNum = channelNum.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const containerRegex = new RegExp(
                  `(<div[^>]*class="switch-control-item"[^>]*id="channel-${escapedChannelNum}-container"[^>]*>[\\s\\S]*?)<span[^>]*class="switch-label"[^>]*id="channel-${escapedChannelNum}-label"[^>]*>.*?</span>\\s*</div>`,
                  's'
                );
                
                const beforeReplace = htmlContent.length;
                htmlContent = htmlContent.replace(containerRegex, newChannelContent.container);
                const afterReplace = htmlContent.length;
                
                if (beforeReplace !== afterReplace) {
                  console.log(`✓ Successfully replaced entire container for Channel ${channelNum} (${channel.type})`);
                } else {
                  console.warn(`✗ Failed to replace container for Channel ${channelNum}`);
                  // Add debugging to see what we're trying to match
                  console.log(`Regex pattern: ${containerRegex.toString()}`);
                  console.log(`Looking for container in HTML: ${htmlContent.includes(containerPattern)}`);
                }
              } else if (hasLabel && hasControl) {
                // For same-type changes, just update label and control
                
                // Update the label text
                const labelRegex = new RegExp(
                  `(<[^>]*id="channel-${channelNum}-label"[^>]*>)[^<]*(</[^>]*>)`,
                  'g'
                );
                htmlContent = htmlContent.replace(
                  labelRegex,
                  `$1${newChannelContent.label}$2`
                );
                
                // Replace the control content
                const controlRegex = new RegExp(
                  `(<div[^>]*id="channel-${channelNum}-control"[^>]*>)[\\s\\S]*?(</div>)`,
                  'g'
                );
                
                const beforeControlReplace = htmlContent.length;
                htmlContent = htmlContent.replace(controlRegex, `$1${newChannelContent.control}$2`);
                const afterControlReplace = htmlContent.length;
                
                if (beforeControlReplace !== afterControlReplace) {
                  console.log(`✓ Successfully updated Channel ${channelNum} label and control (${channel.type})`);
                } else {
                  console.warn(`✗ Failed to update Channel ${channelNum} control content`);
                }
              } else {
                console.warn(`✗ Channel ${channelNum} required IDs not found (container: ${hasContainer}, label: ${hasLabel}, control: ${hasControl})`);
                
                // If the channel doesn't exist, try to create it as a fallback
                if (!hasContainer && newChannelContent.container) {
                  console.log(`Attempting to create missing channel ${channelNum}...`);
                  
                  // Try to find the switches section and append the new channel
                  const switchesGridPatterns = [
                    /<div[^>]*class="lighting-control-grid switches"[^>]*>([\s\S]*?)<\/div>/,
                    /<div[^>]*class="[^"]*lighting-control-grid[^"]*switches[^"]*"[^>]*>([\s\S]*?)<\/div>/,
                    /<div[^>]*id="switches-grid"[^>]*>([\s\S]*?)<\/div>/
                  ];
                  
                  let switchesMatch = null;
                  for (const pattern of switchesGridPatterns) {
                    switchesMatch = htmlContent.match(pattern);
                    if (switchesMatch) {
                      console.log(`Found switches section for fallback using pattern: ${pattern.toString().substring(0, 50)}...`);
                      break;
                    }
                  }
                  
                  if (switchesMatch) {
                    const switchesContent = switchesMatch[1];
                    const newSwitchesContent = switchesContent + '\n' + newChannelContent.container;
                    htmlContent = htmlContent.replace(switchesMatch[0], `<div class="lighting-control-grid switches">${newSwitchesContent}</div>`);
                    console.log(`✓ Created missing Channel ${channelNum} in switches section`);
                  } else {
                    console.warn(`Could not find switches section to add Channel ${channelNum}`);
                  }
                }
              }
              
            } else {
              // Hide disabled channel by adding display:none style to the container
              const containerPattern = `id="channel-${channelNum}-container"`;
              
              if (htmlContent.includes(containerPattern)) {
                const containerRegex = new RegExp(
                  `(<div[^>]*id="channel-${channelNum}-container"[^>]*)([^>]*>)`,
                  'g'
                );
                
                htmlContent = htmlContent.replace(
                  containerRegex,
                  (match, start, end) => {
                    if (start.includes('style="') && !start.includes('display: none')) {
                      return match.replace(/style="([^"]*)"/, 'style="$1; display: none"');
                    } else if (!start.includes('style="')) {
                      return `${start} style="display: none"${end}`;
                    }
                    return match; // Already hidden
                  }
                );
                console.log(`✓ Hidden disabled Channel ${channelNum}`);
              } else {
                console.warn(`✗ Could not find Channel ${channelNum} container to hide`);
              }
            }
          }
        });
      } else {
        // If group is disabled, hide all channels in this group
        // This would need to be implemented based on which channels belong to which group
      }
    }

    // Write the updated HTML back to the file
    await writeFile(indexPath, htmlContent, "utf8");
    console.log("Existing channel elements updated successfully");
  } catch (error) {
    console.error("Error updating existing channel elements:", error);
    throw error;
  }
}

/**
 * Generates HTML elements for configured channels to be inserted into the UI
 * @param {string} extractionPath - Path to the extracted ZIP contents
 * @param {Object} channelConfig - Configuration for all channels
 * @param {string} configType - Type of configuration (core-system or serv-plus)
 */
async function generateChannelHtmlElements(
  extractionPath,
  channelConfig,
  configType,
  isCoreLightStructure = null
) {
  try {
    console.log(
      `Generating HTML elements from ${configType} channel configuration...`
    );

    // Use configType-based structure detection instead of file existence
    if (isCoreLightStructure === null) {
      // This fallback should not be needed if configType is properly passed
      isCoreLightStructure = false; // Default to standard core
    }

    // Define container elements by location - updated for core-light structure
    const containers = {
      main: ".logo-container.switches", // This matches the index1.html structure
      home: ".logo-container.switches", // Alternative container for home page elements
      lighting: {
        interior: ".lighting-control-grid.two-column.interior",
        exterior: ".lighting-control-grid.two-column.exterior",
      },
      plumbing: ".plumbing-switches-container",
      power: ".control-group", // Updated for power tab structure
      hvac: ".hvac-control-grid", // For HVAC controls
      switching: ".control-group", // For switching tab
    };

    // Initialize HTML element collections by location
    const elements = {
      main: [],
      lighting: {
        interior: [],
        exterior: [],
      },
      plumbing: [],
      power: [],
    };

    // Get the main HTML file path
    let indexPath;
    // Both core-light and standard core have files in web/ directory
    indexPath = path.join(extractionPath, "web", "index1.html");

    // Process each channel group
    for (const groupKey in channelConfig) {
      if (
        !groupKey.startsWith(configType === "core-system" ? "core-" : "serv-")
      )
        continue;

      const group = channelConfig[groupKey];

      if (group.enabled) {
        // Process enabled channels in this group
        group.channels.forEach((channel, idx) => {
          if (!channel.enabled) return;

          // Calculate channel number based on group key and index
          let channelNum;
          if (groupKey.includes("genesis")) {
            channelNum = 7 + idx;
          } else {
            const range = groupKey.split("-").slice(-2).shift();
            channelNum = parseInt(range) + idx;
          }

          // Calculate the signal ID based on channel type
          let signalId;
          switch (channel.type) {
            case "dimmable":
              signalId = channelNum * 4 - 2; // Dimmable signal
              break;
            case "momentary":
              signalId = channelNum * 4; // Momentary signal
              break;
            case "toggle":
            default:
              signalId = channelNum * 4 - 1; // Toggle signal
              break;
          }

          let iconWhitePath, iconBlackPath;

          if (channel.activeIcon && channel.inactiveIcon) {
            // Use the new explicit icon paths
            iconWhitePath = `/icons/${channel.activeIcon}`;
            iconBlackPath = `/icons/${channel.inactiveIcon}`;
          } else if (channel.iconBase) {
            // Use the iconBase to construct paths
            const iconDir = "/icons/";
            iconWhitePath = `${iconDir}${channel.iconBase}-white.png`;
            iconBlackPath = `${iconDir}${channel.iconBase}-black.png`;
          } else if (channel.icon) {
            // Legacy format - try to derive from single icon path
            const iconBase = channel.icon.replace(
              /-black\.png$|-white\.png$/g,
              ""
            );
            const iconDir = "/icons/";
            iconWhitePath = `${iconDir}${iconBase}-white.png`;
            iconBlackPath = `${iconDir}${iconBase}-black.png`;
          }

          // Generate HTML based on channel type
          const channelHTML = generateButtonHTML(
            channel,
            signalId,
            iconWhitePath,
            iconBlackPath,
            channelNum
          );

          // Add to appropriate container based on tag
          const tag = channel.tag || "main";
          if (tag === "lighting" && channel.lightingType) {
            elements.lighting[channel.lightingType].push(channelHTML);
          } else if (elements[tag]) {
            elements[tag].push(channelHTML);
          }
        });
      }
    }

    // Read the index.html file - using imported readFile directly
    let htmlContent = await readFile(indexPath, "utf8");

    // Replace content in each container
    for (const [location, html] of Object.entries(elements)) {
      if (location === "lighting") {
        // Handle interior and exterior lighting separately
        for (const [type, typeHtml] of Object.entries(html)) {
          if (typeHtml.length > 0) {
            const containerSelector = containers.lighting[type];
            htmlContent = replaceContainerContent(
              htmlContent,
              containerSelector,
              typeHtml.join("\n")
            );
          }
        }
      } else if (html.length > 0) {
        // Replace content for other containers
        const containerSelector = containers[location];
        htmlContent = replaceContainerContent(
          htmlContent,
          containerSelector,
          html.join("\n")
        );
      }
    }

    // Write the updated HTML back to the file - using imported writeFile directly
    await writeFile(indexPath, htmlContent, "utf8");
    console.log("HTML elements generated and inserted successfully");
  } catch (error) {
    console.error("Error generating channel HTML elements:", error);
    throw error;
  }
}

/**
 * Generates HTML for a button based on its configuration
 * @param {Object} channel - Channel configuration
 * @param {number} signalId - Signal ID for the button
 * @param {string} iconWhitePath - Path to white icon (active state)
 * @param {string} iconBlackPath - Path to black icon (inactive state)
 * @param {number} channelNum - Channel number
 * @returns {string} HTML for the button
 */
function generateButtonHTML(
  channel,
  signalId,
  iconWhitePath,
  iconBlackPath,
  channelNum
) {
  const name = channel.name || `Channel ${channelNum}`;

  // Determine icon paths - prefer explicit active/inactive paths if available
  const activeIconPath = channel.activeIcon
    ? `images/icons/${channel.activeIcon}`
    : iconBlackPath;
  const inactiveIconPath = channel.inactiveIcon
    ? `images/icons/${channel.inactiveIcon}`
    : iconWhitePath;
  const hasIcons = activeIconPath && inactiveIconPath;

  switch (channel.type) {
    case "dimmable":
      // Generate control that matches core-light dimmer style
      return `<div class="control-value-container">
        <button class="control-btn" data-id="${signalId - 1}" data-signal-id="${signalId - 1}">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z" fill="#e5e0e6" />
          </svg>
        </button>
        <span class="control-value signal-value" data-id="${signalId}" id="dimmer-${signalId}">${name}</span>
        <button class="control-btn" data-id="${signalId + 1}" data-signal-id="${signalId + 1}">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M7 14l5-5 5 5z" fill="#e5e0e6" />
          </svg>
        </button>
      </div>`;

    case "momentary":
      // Generate pill button that matches core-light style
      if (hasIcons) {
        return `<button class="pill-btn momentary-btn" data-id="${signalId}" data-channel-id="${channelNum}" data-signal-id="${signalId}">
          <div class="pill-btn-content">
            <img src="${inactiveIconPath}" class="btn-icon inactive" alt="${name}">
            <img src="${activeIconPath}" class="btn-icon active" alt="${name} Active" style="display: none;">
            <span class="pill-btn-text">${name}</span>
          </div>
        </button>`;
      } else {
        return `<button class="pill-btn momentary-btn" data-id="${signalId}" data-channel-id="${channelNum}" data-signal-id="${signalId}">
          <div class="pill-btn-content">
            <span class="pill-btn-text">${name}</span>
          </div>
        </button>`;
      }

    case "toggle":
    default:
      // Generate pill button that matches core-light style
      if (hasIcons) {
        return `<button class="pill-btn toggle-btn" data-id="${signalId}" data-channel-id="${channelNum}" data-signal-id="${signalId}">
          <div class="pill-btn-content">
            <img src="${inactiveIconPath}" class="btn-icon inactive" alt="${name}">
            <img src="${activeIconPath}" class="btn-icon active" alt="${name} Active" style="display: none;">
            <span class="pill-btn-text">${name}</span>
          </div>
        </button>`;
      } else {
        return `<button class="pill-btn toggle-btn" data-id="${signalId}" data-channel-id="${channelNum}" data-signal-id="${signalId}">
          <div class="pill-btn-content">
            <span class="pill-btn-text">${name}</span>
          </div>
        </button>`;
      }
  }
}

/**
 * Replace content within a container in HTML
 * @param {string} html - Full HTML content
 * @param {string} containerSelector - CSS selector for the container
 * @param {string} newContent - New content to insert
 * @returns {string} Updated HTML content
 */
function replaceContainerContent(html, containerSelector, newContent) {
  // Parse the container selector
  const selectorParts = containerSelector.split(".");
  const tagName = selectorParts[0] || "div";
  const classes = selectorParts.slice(1).join(" ");

  // Create regex patterns to find the container
  const openingTagPattern = new RegExp(
    `<${tagName}[^>]*class=["']([^"']*\\s*${classes.replace(
      /\./g,
      "\\s*"
    )}\\s*[^"']*)["'][^>]*>`,
    "i"
  );
  const closingTagPattern = new RegExp(`<\\/${tagName}>`, "i");

  // Find the container in the HTML
  const openingMatch = html.match(openingTagPattern);
  if (!openingMatch) return html;

  // Find the matching closing tag
  const startIndex = openingMatch.index + openingMatch[0].length;
  let depth = 1;
  let endIndex = startIndex;

  while (depth > 0 && endIndex < html.length) {
    const subHtml = html.substring(endIndex);
    const openTag = subHtml.match(new RegExp(`<${tagName}[^>]*>`, "i"));
    const closeTag = subHtml.match(closingTagPattern);

    if (!closeTag) break;

    const openTagPos = openTag ? openTag.index : Infinity;
    const closeTagPos = closeTag.index;

    if (openTagPos < closeTagPos) {
      depth++;
      endIndex += openTagPos + openTag[0].length;
    } else {
      depth--;
      endIndex += closeTagPos;
      if (depth === 0) {
        break;
      } else {
        endIndex += closeTag[0].length;
      }
    }
  }

  // Replace the content between the opening and closing tags
  return (
    html.substring(0, startIndex) +
    "\n" +
    newContent +
    "\n" +
    html.substring(endIndex)
  );
}

/**
 * Process icons from the configuration and ensure white/black variants exist
 * @param {Object} channelConfig - Channel configuration
 * @param {string} extractionPath - Path to the extracted ZIP
 */
async function processIcons(channelConfig, extractionPath, configType) {
  try {
    console.log("Processing icon resources...");

    // Determine structure type from user's explicit choice
    const isCoreLightStructure = (configType === "serv-plus");
    
    // Create icons directory if it doesn't exist
    let iconsDir;
    // Both core-light and standard core have files in web/ directory
    iconsDir = path.join(extractionPath, "web", "icons");
    
    await mkdir(iconsDir, { recursive: true });

    // Set of already processed icons to avoid duplicates
    const processedIcons = new Set();

    // Function to ensure an icon and its variants exist
    async function processIconForChannel(channel) {
      if (!channel.enabled) return;

      // Get the icon base name - check different possible sources
      let iconBase;

      if (channel.iconBase) {
        // Use iconBase if available (from new client code)
        iconBase = channel.iconBase;
      } else if (channel.icon) {
        // For backward compatibility, extract from icon if it's a string
        iconBase =
          typeof channel.icon === "string"
            ? channel.icon.replace(/-black\.png$|-white\.png$/g, "")
            : null;
      } else if (channel.inactiveIcon) {
        // Extract from inactive icon if present
        iconBase = channel.inactiveIcon.replace(/-black\.png$/g, "");
      } else {
        // No icon information
        return;
      }

      // Skip if no iconBase or already processed
      if (!iconBase || processedIcons.has(iconBase)) return;
      processedIcons.add(iconBase);

      // Copy the icon files from our icons directory
      const sourceIconsDir = path.join(
        process.cwd(),
        "public",
        "icons"
      );

      // Source paths for white and black variants
      const whiteIconSource = path.join(
        sourceIconsDir,
        `${iconBase}-white.png`
      );
      const blackIconSource = path.join(
        sourceIconsDir,
        `${iconBase}-black.png`
      );

      // Destination paths
      const whiteIconDest = path.join(iconsDir, `${iconBase}-white.png`);
      const blackIconDest = path.join(iconsDir, `${iconBase}-black.png`);

      // Copy icons if they exist
      try {
        if (await fileExists(whiteIconSource)) {
          await copyFile(whiteIconSource, whiteIconDest);
        } else {
          console.warn(`Missing white icon: ${whiteIconSource}`);
        }

        if (await fileExists(blackIconSource)) {
          await copyFile(blackIconSource, blackIconDest);
        } else {
          console.warn(`Missing black icon: ${blackIconSource}`);
        }
      } catch (err) {
        console.warn(`Error copying icon ${iconBase}:`, err);
      }
    }

    // Process all channels in all groups
    for (const groupKey in channelConfig) {
      const group = channelConfig[groupKey];
      if (group.enabled) {
        for (const channel of group.channels) {
          await processIconForChannel(channel);
        }
      }
    }

    console.log(`Processed ${processedIcons.size} icon resources`);
  } catch (error) {
    console.error("Error processing icons:", error);
  }
}

// Optimized HTML file processing
async function processHtmlFile(
  htmlFilePath,
  extractionPath,
  newButtonLabels,
  newTankLabels,
  newVentilationLabels,
  newInteriorLightLabels,
  newAuxLightLabels,
  buttonIcons,
  uploadedIcons,
  configType
) {
  // Determine structure type from user's explicit choice
  const isCoreLightStructure = (configType === "serv-plus");
  
  if (!(await fileExists(htmlFilePath))) {
    console.warn(`HTML file ${htmlFilePath} not found.`);
    return;
  }

  // The known icon filenames in the original ZIP
  const iconFilenames = [
    "977d7183-ea0d-40cf-9931-018f8339a3e6-0.png",
    "d6dceac6-8714-49a4-bfd0-018f8339a808-0.png",
    "e22ae6b7-6416-42a0-a4af-018f8339ac03-0.png",
    "638824c1-b079-4512-b6fb-018f8339b014-0.png",
    "a59c86de-f8d8-4b3f-8fb9-01920b682050-0.png",
    "62f80e40-0e66-492d-94af-01920b682458-0.png",
    "7c0552b3-d346-4a3c-bd5f-01920b682882-0.png",
    "6971b610-3684-4073-820c-01920b682c82-0.png",
    "8c5b4e3a-107b-43a5-92e4-01920b683239-0.png",
    "fe0eb8f2-bcad-4826-8662-01920b6837c3-0.png",
  ];

  let htmlContent = await readFile(htmlFilePath, "utf8");

  // Inject the @font-face if missing
  if (!htmlContent.includes("@font-face")) {
    htmlContent = htmlContent.replace(
      "</head>",
      `<style>
        @font-face {
          font-family: 'Cy-ExtraBold';
          src: url('fonts/Cy-Extrabold.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      </style>
      </head>`
    );
  }

  // Replace 'Inter-Bold' references with the new font
  htmlContent = htmlContent.replace(
    /font-family:Inter-Bold/g,
    "font-family: 'Cy-ExtraBold'; letter-spacing: 0.2em; text-transform: uppercase;"
  );

  // Number of buttons depends on config type
  const buttonCount = configType === "serv-plus" ? 10 : 6;

  // Copy or decode icons
  for (let i = 0; i < buttonCount; i++) {
    const buttonIcon = buttonIcons[i];
    const uploadedIcon = uploadedIcons[i];
    const iconFilename = iconFilenames[i];

    if (buttonIcon || uploadedIcon) {
      let newIconPath;

      if (buttonIcon) {
        newIconPath = await copyIconToImagesFolder(
          extractionPath,
          buttonIcon,
          iconFilename,
          configType
        );
      } else if (uploadedIcon) {
        const iconName = `custom_button${i + 1}_icon_${Date.now()}.png`;
        newIconPath = await copyIconToImagesFolder(
          extractionPath,
          uploadedIcon,
          iconName,
          configType
        );
      }

      // Replace reference in HTML
      const regex = new RegExp(
        `images/${iconFilename.replace(/\./g, "\\.")}`,
        "g"
      );
      htmlContent = htmlContent.replace(regex, newIconPath);
    }
  }

  // Create label mappings for replacement
  const labelMappings = [];

  // Button Labels - configType dependent
  for (let i = 0; i < buttonCount; i++) {
    if (newButtonLabels[i]) {
      labelMappings.push({
        regex: new RegExp(`Button ${i + 1}`, "gi"),
        newLabel: newButtonLabels[i],
      });
      // Special case for "Button ten"
      if (i + 1 === 10) {
        labelMappings.push({
          regex: new RegExp("Button ten", "gi"),
          newLabel: newButtonLabels[i],
        });
      }
    }
  }

  // Tank Labels - configType dependent
  const tankCount = configType === "serv-plus" ? 4 : 2;
  for (let i = 0; i < tankCount; i++) {
    if (newTankLabels[i]) {
      labelMappings.push({
        regex: new RegExp(`Tank ${i + 1}`, "g"),
        newLabel: newTankLabels[i],
      });
    }
  }

  // Ventilation Labels - only for SERV Plus
  if (configType === "serv-plus") {
    for (let i = 0; i < 2; i++) {
      if (newVentilationLabels[i]) {
        labelMappings.push({
          regex: new RegExp(`Ventilation ${i + 1}`, "g"),
          newLabel: newVentilationLabels[i],
        });
      }
    }
  }

  // Interior Light Labels - only for SERV Plus
  if (configType === "serv-plus") {
    for (let i = 0; i < 4; i++) {
      if (newInteriorLightLabels[i]) {
        labelMappings.push({
          regex: new RegExp(`Interior Light ${i + 1}`, "g"),
          newLabel: newInteriorLightLabels[i],
        });
      }
    }
  }

  // Aux Light Labels - only for SERV Plus
  if (configType === "serv-plus") {
    for (let i = 0; i < 2; i++) {
      if (newAuxLightLabels[i]) {
        labelMappings.push({
          regex: new RegExp(`Aux Light ${i + 1}`, "g"),
          newLabel: newAuxLightLabels[i],
        });
      }
    }
  }

  // Apply all label replacements
  labelMappings.forEach(({ regex, newLabel }) => {
    htmlContent = htmlContent.replace(regex, newLabel);
  });

  // Write back modified HTML
  await writeFile(htmlFilePath, htmlContent);
}

// Modify the cleanupTempFiles function to preserve the completed ZIP file
async function cleanupTempFiles(extractionPath, zipPath, files) {
  try {
    console.log(`Cleaning up temporary files...`);

    // Delete the original uploaded zip
    if (zipPath && (await fileExists(zipPath))) {
      await unlink(zipPath).catch(() => {});
    }

    // Delete extraction directory
    if (extractionPath && (await fileExists(extractionPath))) {
      await rm(extractionPath, { recursive: true, force: true }).catch(
        () => {}
      );
    }
    
    // DO NOT delete files from the completed directory here
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

async function processZipFile(files, body, jobId) {
  const zipPath = files.zipfile.filepath;
  const extractionPath = path.join(process.cwd(), `extracted_${jobId}`);
  const completedDir = path.join(process.cwd(), "completed");

  // Ensure completed directory exists
  if (!existsSync(completedDir)) {
    await mkdir(completedDir, { recursive: true });
  }

  try {
    // Get configuration type
    const configType = body.configType || "serv-plus";
    console.log(`Processing ${configType} configuration`);

    // Extract the ZIP file first
    console.log(`Job ${jobId}: Extracting ZIP...`);
    const zip = new AdmZip(zipPath);
    await mkdir(extractionPath, { recursive: true });
    zip.extractAllTo(extractionPath, true);

    // Debug: List the extracted contents
    const extractedContents = await readdir(extractionPath);
    console.log(`Extracted contents:`, extractedContents);
    
    // Determine structure type from user's explicit choice instead of auto-detection
    const isCoreLightStructure = (configType === "serv-plus");
    console.log(`Structure type: ${isCoreLightStructure ? 'core-light' : 'standard'} (from user selection: ${configType})`);

    // Debug: Check if the expected paths exist
    if (isCoreLightStructure) {
      const expectedPaths = [
        path.join(extractionPath, "web"),
        path.join(extractionPath, "web", "index1.html"),
        path.join(extractionPath, "web", "garmin"),
        path.join(extractionPath, "web", "garmin", "empirbus_config1.json")
      ];
      
      for (const expectedPath of expectedPaths) {
        const exists = await fileExists(expectedPath);
        console.log(`Path exists: ${expectedPath} -> ${exists}`);
      }
    }

    // Extract request data
    const newButtonLabels = Array(10)
      .fill(null)
      .map((_, i) => body[`buttonLabel${i + 1}`] || null);

    const newTankLabels = Array(4)
      .fill(null)
      .map((_, i) => body[`tankLabel${i + 1}`] || null);

    const newVentilationLabels = Array(2)
      .fill(null)
      .map((_, i) => body[`ventilationLabel${i + 1}`] || null);

    const newInteriorLightLabels = Array(4)
      .fill(null)
      .map((_, i) => body[`interiorLight${i + 1}`] || null);

    const newAuxLightLabels = Array(2)
      .fill(null)
      .map((_, i) => body[`auxLight${i + 1}`] || null);

    const buttonIcons = Array(10)
      .fill(null)
      .map((_, i) => body[`buttonIcon${i + 1}`] || null);

    const brandName = body.brandName || null;

    // Handle any uploaded files
    const uploadedIcons = Array(10).fill(null);

    // REMOVE THIS SECTION
    // let customBackgroundImage = null;
    // if (files.customBackgroundImage) {
    //   customBackgroundImage = files.customBackgroundImage.filepath;
    // }

    // Handle custom logo if present
    if (files.customLogo) {
      await replaceCustomLogo(extractionPath, files.customLogo.filepath, configType);
    }

    // Parse channel configuration if present
    let channelConfig = null;
    if (body.channelConfig) {
      try {
        channelConfig = JSON.parse(body.channelConfig);
        console.log(`Processing ${configType} channel configuration`);
        console.log('Raw channelConfig received:', JSON.stringify(channelConfig, null, 2));

        // Process channel configuration as before
        await processChannelConfiguration(
          extractionPath,
          channelConfig,
          configType
        );

        // Process icon resources first
        await processIcons(channelConfig, extractionPath, configType);

        // Then update existing HTML elements from channel configuration
        await updateExistingChannelElements(
          extractionPath,
          channelConfig,
          configType
        );
      } catch (error) {
        console.warn("Error parsing channel configuration:", error);
      }
    }

    // Define file paths based on config type and structure
    const htmlFilePaths = [];
    
    // For core-light, files are directly in web/ (not core-light/web/)
    // For standard core, files are also in web/
    htmlFilePaths.push(
      path.join(extractionPath, "web", "index.html"),
      path.join(extractionPath, "web", "index1.html"),
      path.join(extractionPath, "web", "index2.html")
    );

    // Define JSON file paths based on structure
    let jsonFilePaths = [];
    let settingsFilePath;
    
    // Both core-light and standard core have files in web/ directory
    jsonFilePaths = [
      path.join(extractionPath, "web", "garmin", "empirbus_config1.json"),
      path.join(extractionPath, "web", "garmin", "config1.json"),
      path.join(extractionPath, "web", "index-localization.json"),
      path.join(extractionPath, "web", "index-localization1.json"),
      path.join(extractionPath, "web", "index-localization2.json"),
      path.join(extractionPath, "web", "dataitems.json")
    ];
    settingsFilePath = path.join(extractionPath, "web", "wduSettings.json");

    // Ensure the 'web/fonts' directory exists
    const fontsDir = path.join(extractionPath, "web", "fonts");
    await mkdir(fontsDir, { recursive: true });

    // Copy the custom font
    const fontSourcePath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Cy-ExtraBold.ttf"
    );
    const fontDestPath = path.join(fontsDir, "Cy-ExtraBold.ttf");

    // Check if the font file exists
    if (await fileExists(fontSourcePath)) {
      await copyFile(fontSourcePath, fontDestPath);
    } else {
      console.warn("Custom font not found:", fontSourcePath);
    }


    // Process system configuration
    await processSystemConfiguration(extractionPath, body, configType);

    // Process element visibility based on system configuration
    await processElementVisibility(extractionPath, body, configType);

    // Add CSS rules for element visibility
    await addVisibilityCSS(extractionPath, configType);

    // Process custom color theme
    await processColorTheme(extractionPath, body, configType);

    // Update temperature settings
    if (await fileExists(settingsFilePath)) {
      await updateTemperatureSetting(settingsFilePath);
    }

    // Process channel configuration if applicable
    if (channelConfig) {
      await processChannelConfiguration(
        extractionPath,
        channelConfig,
        configType
      );
    }

    // Process HTML files
    for (const htmlFilePath of htmlFilePaths) {
      if (await fileExists(htmlFilePath)) {
        await processHtmlFile(
          htmlFilePath,
          extractionPath,
          newButtonLabels,
          newTankLabels,
          newVentilationLabels,
          newInteriorLightLabels,
          newAuxLightLabels,
          buttonIcons,
          uploadedIcons,
          configType
        );
      }
    }

    // Process JSON files for brand name
    if (brandName) {
      for (const jsonFilePath of jsonFilePaths) {
        if (await fileExists(jsonFilePath)) {
          await updateBrandName(jsonFilePath, brandName);
        }
      }
    }

    // Create new ZIP file
    console.log(`Job ${jobId}: Creating new ZIP...`);
    const newZip = new AdmZip();
    newZip.addLocalFolder(extractionPath);
    const newZipPath = path.join(completedDir, `${jobId}.zip`);
    newZip.writeZip(newZipPath);

    // Update job status
    jobStatus[jobId] = "completed";
    console.log(`Job ${jobId}: Processing completed successfully`);
  } catch (error) {
    jobStatus[jobId] = "error";
    console.error(`Job ${jobId} failed:`, error);
    throw error;
  } finally {
    // Cleanup temp files
    await cleanupTempFiles(extractionPath, zipPath, files);
  }
}

async function replaceCustomLogo(extractionPath, logoPath, configType) {
  try {
    console.log("Replacing custom logo...");

    // Determine structure type from user's explicit choice
    const isCoreLightStructure = (configType === "serv-plus");

    // Target locations where the logo might be used
    let possibleLogoLocations = [];
    
    // Both core-light and standard core have files in web/ directory
    possibleLogoLocations = [
      path.join(extractionPath, "web", "images", "Artek-Primary-White-w.png"),
      path.join(extractionPath, "web", "images", "icon-default.png"),
    ];

    for (const logoLocation of possibleLogoLocations) {
      if (await fileExists(logoLocation)) {
        await copyFile(logoPath, logoLocation);
        console.log(`Replaced logo at: ${logoLocation}`);
      }
    }
  } catch (error) {
    console.error("Error replacing custom logo:", error);
  }
}

// Update the cleanupOldJobs function
async function cleanupOldJobs() {
  try {
    const completedDir = path.join(process.cwd(), "completed");
    if (!existsSync(completedDir)) return;

    const files = await readdir(completedDir);
    const now = Date.now();
    // Change from 1 hour to 24 hours
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(completedDir, file);
      const stats = await stat(filePath);

      if (stats.mtimeMs < oneDayAgo) {
        await unlink(filePath).catch(() => {});
        console.log(`Deleted old job file: ${file}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning up old jobs:", error);
  }
}

// Set up cleanup job to run periodically
// For Next.js, this needs to be handled differently than setInterval
// We'll call it on each API request instead
let lastCleanup = 0;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

export async function POST(request) {
  try {
    // Basic auth check
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const credentials = atob(authHeader.substring(6));
    const [username, password] = credentials.split(":");

    if (username !== "GarminInstaller" || password !== "Powering2024!") {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // For debugging, trace headers
    console.log("Request Content-Type:", request.headers.get("content-type"));

    // Check if cleanup should run
    const now = Date.now();
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      lastCleanup = now;
      cleanupOldJobs().catch(console.error);
    }

    // Parse form data differently for App Router
    const formData = await request.formData();

    // Check if the required file exists
    const zipFile = formData.get("zipfile");
    if (!zipFile || !(zipFile instanceof File)) {
      return NextResponse.json(
        { error: "No ZIP file provided" },
        { status: 400 }
      );
    }

    // Create a unique job ID
    const jobId = uuidv4();

    // Set job status to processing
    jobStatus[jobId] = "processing";

    // Get file content as Buffer
    const fileBuffer = await zipFile.arrayBuffer();

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Save file to disk
    const zipPath = path.join(uploadDir, `${jobId}.zip`);
    await writeFile(zipPath, Buffer.from(fileBuffer));

    // Convert formData to a format compatible with our existing functions
    const files = {
      zipfile: { filepath: zipPath },
    };

    // Extract other file uploads if any
    if (formData.has("customBackgroundImage")) {
      const bgImage = formData.get("customBackgroundImage");
      if (bgImage instanceof File) {
        const bgBuffer = await bgImage.arrayBuffer();
        const bgPath = path.join(
          uploadDir,
          `${jobId}_bg${path.extname(bgImage.name)}`
        );
        await writeFile(bgPath, Buffer.from(bgBuffer));
        files.customBackgroundImage = { filepath: bgPath };
      }
    }

    if (formData.has("customLogo")) {
      const logo = formData.get("customLogo");
      if (logo instanceof File) {
        const logoBuffer = await logo.arrayBuffer();
        const logoPath = path.join(
          uploadDir,
          `${jobId}_logo${path.extname(logo.name)}`
        );
        await writeFile(logoPath, Buffer.from(logoBuffer));
        files.customLogo = { filepath: logoPath };
      }
    }

    // Convert form data to a regular object for processing
    const body = {};
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) {
        body[key] = value;
      }
    }

    // Process in background
    processZipFile(files, body, jobId).catch((error) => {
      console.error(`Error in job ${jobId}:`, error);
      jobStatus[jobId] = "error";
    });

    return NextResponse.json({
      status: "processing",
      jobId: jobId,
      message:
        "Your file is being processed. Check status at /api/status/" + jobId,
    });
  } catch (error) {
    console.error("Error processing upload:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
