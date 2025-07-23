"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import Image from "next/image";
import IconDropdown from "./components/IconDropdown";

export default function Home() {
  const [zipFile, setZipFile] = useState(null);
  const [brandName, setBrandName] = useState("");
  const [configType, setConfigType] = useState("serv-plus");
  const [buttonLabels, setButtonLabels] = useState(Array(10).fill(""));
  const [tankLabels, setTankLabels] = useState(Array(4).fill(""));
  const [ventLabels, setVentLabels] = useState(Array(2).fill(""));
  const [buttonIcons, setButtonIcons] = useState(Array(10).fill(""));
  const [availableIcons, setAvailableIcons] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [hasPlumbing, setHasPlumbing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSecondAlternator, setHasSecondAlternator] = useState(false);
  const [hasOrionXS, setHasOrionXS] = useState(false);
  const [hasPrimarySolar, setHasPrimarySolar] = useState(false);
  const [hasAuxSolar, setHasAuxSolar] = useState(false);
  const [hasHeater, setHasHeater] = useState(false);
  const [hasElectricHeat, setHasElectricHeat] = useState(false);
  const [hasEngineHeat, setHasEngineHeat] = useState(false);
  const [hasFloorHeat, setHasFloorHeat] = useState(false);
  const [hasHeatFan, setHasHeatFan] = useState(false);
  const [hasAuxHeat, setHasAuxHeat] = useState(false);
  const [auxHeatName, setAuxHeatName] = useState("Auxiliary Heat");
  const [hasAirConditioner, setHasAirConditioner] = useState(false);
  const [acType, setAcType] = useState("cruise-n-comfort"); // or "recpro"
  const [hasHeatPump, setHasHeatPump] = useState(false);
  const [useCelsius, setUseCelsius] = useState(false);
  const [ventilationFanCount, setVentilationFanCount] = useState(1);
  const [hasHeatingSystem, setHasHeatingSystem] = useState(false);
  const [hasVentilation, setHasVentilation] = useState(false);
  const [tankCount, setTankCount] = useState(1);
  const [tankTypes, setTankTypes] = useState([
    "Fresh Water",
    "Grey Water",
    "Black Water",
    "LPG",
  ]);
  const [hasRgbLighting, setHasRgbLighting] = useState(false);
  const [rgbControllerCount, setRgbControllerCount] = useState(1);
  const [rgbZonesPerController, setRgbZonesPerController] = useState(1);
  const [hasSlides, setHasSlides] = useState(false);
  const [hasAwning, setHasAwning] = useState(false);
  const [slideSafetyType, setSlideSafetyType] = useState("keypad");
  const [awningSafetyType, setAwningSafetyType] = useState("keypad");
  
  // Color Theme Customization
  const [customColors, setCustomColors] = useState({
    primaryBackground: "#193646",    // Main background color (used for both primary and secondary)
    primaryText: "#e5e0e6",         // Main text color
    secondaryText: "#e0e0e0",       // Secondary text color
    accentColor: "#ffaa3b",         // Accent/highlight color
    borderColor: "#e5e0e6",         // Border color
    buttonBackground: "#193646",     // Button background
    buttonText: "#e0e0e0",          // Button text
    activeBackground: "#e5e0e6",     // Active state background
    activeText: "#193646",          // Active state text
  });
  const [useCustomColors, setUseCustomColors] = useState(false);
  
  // Predefined color themes
  const colorThemes = {
    default: {
      name: "Default Blue",
      primaryBackground: "#193646",
      primaryText: "#e5e0e6",
      secondaryText: "#e0e0e0",
      accentColor: "#ffaa3b",
      borderColor: "#e5e0e6",
      buttonBackground: "#193646",
      buttonText: "#e0e0e0",
      activeBackground: "#e5e0e6",
      activeText: "#193646",
    },
    darkGreen: {
      name: "Forest Green",
      primaryBackground: "#1e3a28",
      primaryText: "#e8f5e8",
      secondaryText: "#d4e6d4", 
      accentColor: "#4caf50",
      borderColor: "#e8f5e8",
      buttonBackground: "#1e3a28",
      buttonText: "#d4e6d4",
      activeBackground: "#e8f5e8",
      activeText: "#1e3a28",
    },
    darkRed: {
      name: "Deep Red",
      primaryBackground: "#3e1a1a",
      primaryText: "#f5e8e8",
      secondaryText: "#e6d4d4",
      accentColor: "#f44336",
      borderColor: "#f5e8e8", 
      buttonBackground: "#3e1a1a",
      buttonText: "#e6d4d4",
      activeBackground: "#f5e8e8",
      activeText: "#3e1a1a",
    },
    darkPurple: {
      name: "Royal Purple",
      primaryBackground: "#2d1b46",
      primaryText: "#f0e8f5",
      secondaryText: "#e0d4e6",
      accentColor: "#9c27b0",
      borderColor: "#f0e8f5",
      buttonBackground: "#2d1b46", 
      buttonText: "#e0d4e6",
      activeBackground: "#f0e8f5",
      activeText: "#2d1b46",
    },
    charcoal: {
      name: "Charcoal Gray",
      primaryBackground: "#2c2c2c",
      primaryText: "#f0f0f0",
      secondaryText: "#e0e0e0",
      accentColor: "#ff9800",
      borderColor: "#f0f0f0",
      buttonBackground: "#2c2c2c",
      buttonText: "#e0e0e0", 
      activeBackground: "#f0f0f0",
      activeText: "#2c2c2c",
    }
  };

  const [selectedTheme, setSelectedTheme] = useState('default');

  // Color theme helper functions
  const handleThemeChange = (themeName) => {
    setSelectedTheme(themeName);
    if (themeName !== 'custom') {
      setCustomColors(colorThemes[themeName]);
      setUseCustomColors(false);
    } else {
      setUseCustomColors(true);
    }
  };

  const handleColorChange = (colorProperty, value) => {
    setCustomColors(prev => ({
      ...prev,
      [colorProperty]: value
    }));
    setUseCustomColors(true);
    setSelectedTheme('custom');
  };

  const getCurrentColors = () => {
    return useCustomColors ? customColors : colorThemes[selectedTheme];
  };
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [pendingSafetyChange, setPendingSafetyChange] = useState(null);
  const [waiverAccepted, setWaiverAccepted] = useState({
    slides: false,
    awning: false,
  });
  const CHANNEL_TYPES = {
    TOGGLE: "toggle",
    MOMENTARY: "momentary",
    DIMMABLE: "dimmable",
  };

  const [channelGroups, setChannelGroups] = useState({
    "core-1-5": {
      enabled: false,
      channels: Array(5)
        .fill()
        .map(() => ({
          enabled: false,
          name: "",
          iconBase: "", // This will store just the base name (like "1")
          tag: "Home",
          type: CHANNEL_TYPES.TOGGLE,
          lightingType: "interior",
          ramping: false,
        })),
    },
    "core-9-13": {
      enabled: false,
      channels: Array(5)
        .fill()
        .map(() => ({
          enabled: false,
          name: "",
          iconBase: "", // This will store just the base name (like "1")
          tag: "Home",
          type: CHANNEL_TYPES.TOGGLE,
          lightingType: "interior",
          ramping: false,
        })),
    },
    "core-17-21": {
      enabled: false,
      channels: Array(5)
        .fill()
        .map(() => ({
          enabled: false,
          name: "",
          iconBase: "", // This will store just the base name (like "1")
          tag: "Home",
          type: CHANNEL_TYPES.TOGGLE,
          lightingType: "interior",
          ramping: false,
        })),
    },
    "core-25-29": {
      enabled: false,
      channels: Array(5)
        .fill()
        .map(() => ({
          enabled: false,
          name: "",
          iconBase: "", // This will store just the base name (like "1")
          tag: "Home",
          type: CHANNEL_TYPES.TOGGLE,
          lightingType: "interior",
          ramping: false,
        })),
    },
    // SERV Plus channel groups
    "serv-1-6": {
      enabled: false,
      channels: Array(6)
        .fill()
        .map(() => ({
          enabled: false,
          name: "",
          iconBase: "",
          type: CHANNEL_TYPES.TOGGLE,
          ramping: false,
        })),
    },
    "serv-genesis-7-10": {
      enabled: false,
      channels: Array(4)
        .fill()
        .map((_) => ({
          enabled: false,
          name: "",
          iconBase: "",
          type: CHANNEL_TYPES.TOGGLE,
          ramping: false,
        })),
    },
  });

  // New state for Core System channel configuration

  const formSteps = [
    { id: "config", title: "Configuration" },
    { id: "branding", title: "Branding & Appearance" },
    { id: "channels", title: "Channel Configuration" },
    { id: "power", title: "Power System" },
    { id: "climate", title: "Climate Control" },
    { id: "accessories", title: "Accessories" },
    { id: "colors", title: "Color Theme" },
    { id: "review", title: "Review & Submit" }, // New step
  ];

  const [hasGenesisBoard, setHasGenesisBoard] = useState(false);

  const handleChannelTypeChange = (groupKey, channelIndex, value) => {
    setChannelGroups((prev) => {
      const newGroups = JSON.parse(JSON.stringify(prev));
      newGroups[groupKey].channels[channelIndex].type = value;

      // If changing to MOMENTARY, disable ramping
      if (value === CHANNEL_TYPES.MOMENTARY) {
        newGroups[groupKey].channels[channelIndex].ramping = false;
      }

      // If changing to DIMMABLE, clear the icon since dimmers don't use icons
      if (value === CHANNEL_TYPES.DIMMABLE) {
        newGroups[groupKey].channels[channelIndex].iconBase = "";
        if (newGroups[groupKey].channels[channelIndex].icon) {
          newGroups[groupKey].channels[channelIndex].icon = "";
        }
        newGroups[groupKey].channels[channelIndex].ramping = false;
      }

      return newGroups;
    });
  };

  const handleRampingToggle = (groupKey, channelIndex) => {
    setChannelGroups((prev) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState[groupKey].channels[channelIndex].ramping =
        !newState[groupKey].channels[channelIndex].ramping;
      return newState;
    });
  };

  // Fetch available icons on component mount
  useEffect(() => {
    fetch("/api/icons")
      .then((response) => response.json())
      .then((data) => {
        setAvailableIcons(data);
      })
      .catch((error) => {
        console.error("Failed to load icons:", error);
      });
  }, []);

  const handleFileChange = (e) => {
    setZipFile(e.target.files[0]);
  };

  const handleGenesisToggle = (e) => {
    setHasGenesisBoard(e.target.checked);
  };

  const [completedSteps, setCompletedSteps] = useState([]);

  const countPlumbingTags = () => {
    let count = 0;
    Object.values(channelGroups).forEach((group) => {
      group.channels.forEach((channel) => {
        if (channel.tag === "plumbing" && channel.enabled) {
          count++;
        }
      });
    });
    return count;
  };

  const handleTankLabelChange = (index, value) => {
    const newLabels = [...tankLabels];
    newLabels[index] = value;
    setTankLabels(newLabels);
  };

  const handleLightingTypeChange = (groupKey, channelIndex, value) => {
    setChannelGroups((prev) => {
      const copy = structuredClone(prev);
      copy[groupKey].channels[channelIndex].lightingType = value;
      return copy;
    });
  };

  const handleVentLabelChange = (index, value) => {
    const newLabels = [...ventLabels];
    newLabels[index] = value;
    setVentLabels(newLabels);
  };

  const [rgbZoneLabels, setRgbZoneLabels] = useState(Array(8).fill(""));

  const handleRgbZoneLabelChange = (index, value) => {
    const newLabels = [...rgbZoneLabels];
    newLabels[index] = value;
    setRgbZoneLabels(newLabels);
  };

  const handleChannelToggle = (groupKey, channelIndex) => {
    console.log(`Toggling channel in group ${groupKey}, index ${channelIndex}`);

    setChannelGroups((prev) => {
      // Create deep copy to avoid state mutation issues
      const newState = JSON.parse(JSON.stringify(prev));

      // Toggle the channel's enabled state
      const currentEnabled = newState[groupKey].channels[channelIndex].enabled;
      newState[groupKey].channels[channelIndex].enabled = !currentEnabled;

      console.log(
        `Channel ${channelIndex} toggled from ${currentEnabled} to ${!currentEnabled}`
      );

      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!zipFile) {
      alert("Please select a ZIP file to upload");
      return;
    }

    setIsSubmitting(true);

    // Create the FormData object
    const formData = new FormData();
    formData.append("zipfile", zipFile);
    formData.append("brandName", brandName);
    formData.append("configType", configType);

    if (customLogo) {
      formData.append("customLogo", customLogo);
    }

    // Add filtered channel configuration
    let filteredChannelGroups = {};

    if (configType === "core-system") {
      // Include only Core System channel groups
      Object.entries(channelGroups)
        .filter(([key]) => key.startsWith("core-"))
        .forEach(([key, value]) => {
          filteredChannelGroups[key] = value;
        });
    } else if (configType === "serv-plus") {
      // Include SERV Plus channels
      Object.entries(channelGroups)
        .filter(
          ([key]) =>
            key.startsWith("serv-") &&
            (key !== "serv-genesis-7-10" || hasGenesisBoard)
        )
        .forEach(([key, value]) => {
          filteredChannelGroups[key] = value;
        });

      // Add Genesis board flag
      formData.append("hasGenesisBoard", hasGenesisBoard);
    }

    // Create a new processed version of filteredChannelGroups
    // with proper icon paths for the server
    const processedChannelGroups = {};

    // Process each group and its channels
    for (const [groupKey, group] of Object.entries(filteredChannelGroups)) {
      // Deep clone the group to avoid mutation
      processedChannelGroups[groupKey] = {
        ...group,
        channels: group.channels.map((channel) => {
          // Process each channel
          const processedChannel = { ...channel };

          // If channel has iconBase, add variants
          if (processedChannel.iconBase) {
            processedChannel.inactiveIcon = `${processedChannel.iconBase}-black.png`;
            processedChannel.activeIcon = `${processedChannel.iconBase}-white.png`;
          }

          return processedChannel;
        }),
      };
    }

    // Add processed channel groups to form data - use a different field name
    formData.append(
      "processedChannelConfig",
      JSON.stringify(processedChannelGroups)
    );

    // Add filtered channel groups to form data with type information included
    formData.append("channelConfig", JSON.stringify(filteredChannelGroups));

    // Rest of your code continues here...
    // Power System
    formData.append("hasSecondAlternator", hasSecondAlternator);
    formData.append("hasOrionXS", hasOrionXS);
    formData.append("hasPrimarySolar", hasPrimarySolar);
    formData.append("hasAuxSolar", hasAuxSolar);

    // Heating System
    formData.append("hasHeater", hasHeater);
    formData.append("hasElectricHeat", hasElectricHeat);
    formData.append("hasEngineHeat", hasEngineHeat);
    formData.append("hasFloorHeat", hasFloorHeat);
    formData.append("hasHeatFan", hasHeatFan);
    formData.append("hasAuxHeat", hasAuxHeat);
    formData.append("auxHeatName", auxHeatName);

    formData.append("slideSafetyType", slideSafetyType);
    formData.append("awningSafetyType", awningSafetyType);
    formData.append("slidesWaiverAccepted", waiverAccepted.slides);
    formData.append("awningWaiverAccepted", waiverAccepted.awning);

    // AC System
    formData.append("hasAirConditioner", hasAirConditioner);
    if (hasAirConditioner) {
      formData.append("acType", acType);
      formData.append("hasHeatPump", hasHeatPump);
    }
    formData.append("useCelsius", useCelsius);

    // Ventilation
    formData.append("ventilationFanCount", ventilationFanCount);
    formData.append("hasVentilation", hasVentilation);
    formData.append("hasHeatingSystem", hasHeatingSystem);

    // Plumbing
    formData.append("hasPlumbing", hasPlumbing);
    formData.append("tankCount", tankCount);
    formData.append("tankTypes", JSON.stringify(tankTypes));

    // RGB Lighting
    formData.append("hasRgbLighting", hasRgbLighting);
    if (hasRgbLighting) {
      formData.append("rgbControllerCount", rgbControllerCount);
      formData.append("rgbZonesPerController", rgbZonesPerController);
    }

    // Accessories
    formData.append("hasSlides", hasSlides);
    formData.append("hasAwning", hasAwning);

    // Color Theme Customization
    formData.append("useCustomColors", useCustomColors);
    formData.append("selectedTheme", selectedTheme);
    if (useCustomColors || selectedTheme !== 'default') {
      const colors = getCurrentColors();
      formData.append("colorTheme", JSON.stringify(colors));
    }

    // Add button labels
    buttonLabels.forEach((label, i) => {
      if (label) formData.append(`buttonLabel${i + 1}`, label);
    });

    // Add button icons
    buttonIcons.forEach((icon, i) => {
      if (icon) formData.append(`buttonIcon${i + 1}`, icon);
    });

    rgbZoneLabels.forEach((label, i) => {
      if (label) formData.append(`rgbZoneLabel${i + 1}`, label);
    });

    // Add tank labels
    tankLabels.forEach((label, i) => {
      if (label) formData.append(`tankLabel${i + 1}`, label);
    });

    // Add ventilation labels
    ventLabels.forEach((label, i) => {
      if (label) formData.append(`ventilationLabel${i + 1}`, label);
    });

    rgbZoneLabels.forEach((label, i) => {
      if (label) formData.append(`rgbZoneLabel${i + 1}`, label);
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa("GarminInstaller:Powering2024!"),
        },
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        // Check if the response is JSON
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        } else {
          // Handle non-JSON error responses
          const errorText = await response.text();
          throw new Error(
            `Upload failed: Server returned ${response.status} ${response.statusText}`
          );
        }
      }

      // Check if response is JSON before parsing
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        setJobId(data.jobId);
        setStatus("processing");
        startStatusCheck(data.jobId);
      } else {
        throw new Error("Unexpected response format from server");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(error.message || "Upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startStatusCheck = (id) => {
    // Track consecutive errors
    let errorCount = 0;
    const MAX_ERROR_COUNT = 3;

    const checkInterval = setInterval(async () => {
      try {
        console.log(`Checking status for job ${id}...`);

        // Make sure to use the correct URL format
        const response = await fetch(`/api/status/${id}`, {
          headers: {
            Authorization: "Basic " + btoa("GarminInstaller:Powering2024!"),
          },
        });

        // If we get a 404, the job might be completed and cleaned up
        if (response.status === 404) {
          errorCount++;
          console.log(
            `Status check 404 error (${errorCount}/${MAX_ERROR_COUNT})`
          );

          if (errorCount >= MAX_ERROR_COUNT) {
            // After multiple 404s, check if the job might still be available for download
            try {
              const checkDownloadResponse = await fetch(
                `/api/job-exists/${id}`,
                {
                  headers: {
                    Authorization:
                      "Basic " + btoa("GarminInstaller:Powering2024!"),
                  },
                }
              );

              if (checkDownloadResponse.ok) {
                console.log("Job exists and ready for download");
                setStatus("completed");
              } else {
                console.log("Job does not exist or cannot be downloaded");
                setStatus("error");
                alert(
                  "The job could not be found on the server. It may have been cleaned up or never existed."
                );
              }
            } catch (downloadCheckError) {
              console.error(
                "Error checking job existence:",
                downloadCheckError
              );
            }

            clearInterval(checkInterval);
          }
          return;
        }

        // Reset error count if we got a response
        errorCount = 0;

        // Check if the response is ok before trying to parse JSON
        if (!response.ok) {
          console.error(`Status check failed with status: ${response.status}`);

          // Try to get more information about the error
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            console.error("Error details:", errorData);
          } else {
            const errorText = await response.text();
            console.error(
              "Error response:",
              errorText.substring(0, 100) + "..."
            );
          }

          // Update UI to show error
          setStatus("error");
          clearInterval(checkInterval);
          return;
        }

        // If response is ok, try to parse JSON
        const data = await response.json();
        setStatus(data.status);

        if (data.status === "completed" || data.status === "error") {
          clearInterval(checkInterval);
        }
      } catch (error) {
        console.error("Status check failed:", error);

        errorCount++;
        if (errorCount >= MAX_ERROR_COUNT) {
          console.log("Multiple errors received, stopping status checks");
          setStatus("error");
          clearInterval(checkInterval);
        }
      }
    }, 2000);

    // Store the interval ID to clear it if component unmounts
    return checkInterval;
  };

  const downloadFile = () => {
    if (!jobId) {
      alert("No job ID available for download");
      return;
    }

    // Show loading state
    setIsSubmitting(true);

    console.log(`Attempting to download job ${jobId}`);

    // First check if the file exists
    fetch(`/api/job-exists/${jobId}`, {
      headers: {
        Authorization: "Basic " + btoa("GarminInstaller:Powering2024!"),
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("The file for this job is no longer available");
        }
        return response.json();
      })
      .then((data) => {
        if (!data.exists) {
          throw new Error("The file for this job does not exist");
        }

        // File exists, proceed with download
        const xhr = new XMLHttpRequest();
        xhr.open("GET", `/api/download/${jobId}`, true);
        xhr.setRequestHeader(
          "Authorization",
          "Basic " + btoa("GarminInstaller:Powering2024!")
        );
        xhr.responseType = "blob";

        xhr.onload = function () {
          setIsSubmitting(false);
          if (this.status === 200) {
            const blob = new Blob([this.response], { type: "application/zip" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = "UpdatedGraphicsConfig.zip";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
          } else {
            console.error(`Download failed with status: ${this.status}`);
            // Show more informative error message to the user
            if (this.status === 404) {
              alert(
                "The processed file is no longer available on the server. Please run the job again."
              );
            } else {
              alert(
                `Download failed with status code ${this.status}. Please try submitting a new job.`
              );
            }
          }
        };

        xhr.onerror = function () {
          setIsSubmitting(false);
          console.error("XHR error during download");
          alert(
            "Download failed due to a network error. Please check your connection and try again."
          );
        };

        xhr.ontimeout = function () {
          setIsSubmitting(false);
          console.error("Download request timed out");
          alert(
            "Download request timed out. The server may be busy or the file may be too large."
          );
        };

        xhr.timeout = 60000;
        xhr.send();
      })
      .catch((error) => {
        setIsSubmitting(false);
        console.error("Pre-download check failed:", error);
        alert(
          error.message ||
            "Unable to verify if the file exists. Please run the job again."
        );
      });
  };

  const handleChannelGroupToggle = (groupKey) => {
    setChannelGroups((prev) => {
      const groupEnabled = !prev[groupKey].enabled;
      const newGroup = { ...prev[groupKey], enabled: groupEnabled };

      // Remove this code that was auto-enabling all channels
      // newGroup.channels = newGroup.channels.map((channel) => ({
      //   ...channel,
      //   enabled: groupEnabled,
      // }));

      // If we're disabling the group, make sure all channels are disabled too
      if (!groupEnabled) {
        newGroup.channels = newGroup.channels.map((channel) => ({
          ...channel,
          enabled: false,
        }));
      }

      return { ...prev, [groupKey]: newGroup };
    });
  };

  const handleChannelNameChange = (groupKey, channelIndex, value) => {
    setChannelGroups((prev) => {
      const newGroup = { ...prev[groupKey] };
      newGroup.channels[channelIndex].name = value;
      return { ...prev, [groupKey]: newGroup };
    });
  };

  const handleChannelIconChange = (groupKey, channelIndex, value) => {
    setChannelGroups((prev) => {
      const newGroup = { ...prev[groupKey] };

      // Always strip -black/-white suffix for iconBase, regardless of config type
      const iconBase =
        typeof value === "string"
          ? value
              .replace(/-black\.png$|-white\.png$/g, "")
              .replace(/\.png$/, "")
          : "";

      newGroup.channels[channelIndex].iconBase = iconBase;

      // For SERV Plus, also store the full icon name for backward compatibility
      if (configType === "serv-plus") {
        newGroup.channels[channelIndex].icon = value;
      }

      return { ...prev, [groupKey]: newGroup };
    });
  };

  // Then modify your handleChannelTagChange function
  const handleChannelTagChange = (groupKey, channelIndex, tag) => {
    // Check if trying to assign a plumbing tag
    if (tag === "plumbing") {
      // If already at limit (2) and this is a new plumbing selection, show error
      if (countPlumbingTags() >= 2) {
        alert("Only two channels can be assigned the 'Plumbing' tag.");
        return; // Don't proceed with the change
      }
    }

    // If passed the check, proceed with the change
    setChannelGroups((prev) => {
      const updated = { ...prev };
      updated[groupKey].channels[channelIndex].tag = tag;
      return updated;
    });
  };

  // Add this function in your Home component before the return statement

  const handleConfigFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const config = JSON.parse(e.target.result);

        // Update button labels
        const newButtonLabels = [...buttonLabels];
        for (let i = 0; i < 10; i++) {
          newButtonLabels[i] = config[`buttonLabel${i + 1}`] || "";
        }
        setButtonLabels(newButtonLabels);

        // Update tank labels
        const newTankLabels = [...tankLabels];
        for (let i = 0; i < 4; i++) {
          newTankLabels[i] = config[`tankLabel${i + 1}`] || "";
        }
        setTankLabels(newTankLabels);

        // Update ventilation labels
        const newVentLabels = [...ventLabels];
        for (let i = 0; i < 2; i++) {
          newVentLabels[i] = config[`ventilationLabel${i + 1}`] || "";
        }
        setVentLabels(newVentLabels);

        // Update button icons
        const newButtonIcons = [...buttonIcons];
        for (let i = 0; i < 10; i++) {
          newButtonIcons[i] = config[`buttonIcon${i + 1}`] || "";
        }
        setButtonIcons(newButtonIcons);

        const newRgbZoneLabels = [...rgbZoneLabels];
        for (let i = 0; i < 8; i++) {
          newRgbZoneLabels[i] = config[`rgbZoneLabel${i + 1}`] || "";
        }
        setRgbZoneLabels(newRgbZoneLabels);

        // Update system configuration if available
        if (config.configType) {
          setConfigType(config.configType);
        }
        if (config.brandName) {
          setBrandName(config.brandName);
        }

        // Update power system settings
        if (config.hasSecondAlternator !== undefined)
          setHasSecondAlternator(Boolean(config.hasSecondAlternator));
        if (config.hasOrionXS !== undefined)
          setHasOrionXS(Boolean(config.hasOrionXS));
        if (config.hasPrimarySolar !== undefined)
          setHasPrimarySolar(Boolean(config.hasPrimarySolar));
        if (config.hasAuxSolar !== undefined)
          setHasAuxSolar(Boolean(config.hasAuxSolar));

        // Update heating system settings
        if (config.hasHeater !== undefined)
          setHasHeater(Boolean(config.hasHeater));
        if (config.hasElectricHeat !== undefined)
          setHasElectricHeat(Boolean(config.hasElectricHeat));
        if (config.hasEngineHeat !== undefined)
          setHasEngineHeat(Boolean(config.hasEngineHeat));
        if (config.hasFloorHeat !== undefined)
          setHasFloorHeat(Boolean(config.hasFloorHeat));
        if (config.hasHeatFan !== undefined)
          setHasHeatFan(Boolean(config.hasHeatFan));
        if (config.hasAuxHeat !== undefined)
          setHasAuxHeat(Boolean(config.hasAuxHeat));
        if (config.auxHeatName) setAuxHeatName(config.auxHeatName);

        // Update AC settings
        if (config.hasAirConditioner !== undefined)
          setHasAirConditioner(Boolean(config.hasAirConditioner));
        if (config.acType) setAcType(config.acType);
        if (config.hasHeatPump !== undefined)
          setHasHeatPump(Boolean(config.hasHeatPump));
        if (config.useCelsius !== undefined)
          setUseCelsius(Boolean(config.useCelsius));

        // Update ventilation settings
        if (config.ventilationFanCount)
          setVentilationFanCount(Number(config.ventilationFanCount));

        // Update plumbing settings
        if (config.tankCount) setTankCount(Number(config.tankCount));
        if (config.tankTypes && Array.isArray(config.tankTypes))
          setTankTypes([...config.tankTypes]);

        // Update RGB settings
        if (config.hasRgbLighting !== undefined)
          setHasRgbLighting(Boolean(config.hasRgbLighting));
        if (config.rgbControllerCount)
          setRgbControllerCount(Number(config.rgbControllerCount));
        if (config.rgbZonesPerController)
          setRgbZonesPerController(Number(config.rgbZonesPerController));

        // Update accessories settings
        if (config.hasSlides !== undefined)
          setHasSlides(Boolean(config.hasSlides));
        if (config.hasAwning !== undefined)
          setHasAwning(Boolean(config.hasAwning));
        if (config.slideSafetyType) setSlideSafetyType(config.slideSafetyType);
        if (config.awningSafetyType)
          setAwningSafetyType(config.awningSafetyType);
        if (config.waiverAccepted) setWaiverAccepted(config.waiverAccepted);

        // Update channel configuration if available
        if (config.channelGroups && typeof config.channelGroups === "object") {
          setChannelGroups((prevState) => ({
            ...prevState,
            ...config.channelGroups,
          }));
        }

        // Also handle Genesis board setting
        if (config.hasGenesisBoard !== undefined)
          setHasGenesisBoard(Boolean(config.hasGenesisBoard));

        alert("Configuration loaded successfully!");
      } catch (error) {
        console.error("Error loading configuration:", error);
        alert("Failed to load configuration: " + error.message);
      }
    };
    reader.readAsText(file);
  };

  const saveCurrentConfig = () => {
    // Build a comprehensive configuration object from current state
    const config = {
      // Basic configuration
      configType,
      brandName,
      hasGenesisBoard,

      // Channel configuration
      channelGroups,

      // Power System
      hasSecondAlternator,
      hasOrionXS,
      hasPrimarySolar,
      hasAuxSolar,

      // Heating System
      hasHeater,
      hasElectricHeat,
      hasEngineHeat,
      hasFloorHeat,
      hasHeatFan,
      hasAuxHeat,
      auxHeatName,
      hasHeatingSystem, // Add this line - it was missing

      // AC System
      hasAirConditioner,
      acType,
      hasHeatPump,
      useCelsius,

      // Ventilation
      hasVentilation, // Add this line - it was missing
      ventilationFanCount,

      // Plumbing
      hasPlumbing, // Add this line - it was missing
      tankCount,
      tankTypes,

      // RGB Lighting
      hasRgbLighting,
      rgbControllerCount,
      rgbZonesPerController,

      // Accessories
      hasSlides,
      hasAwning,
      slideSafetyType,
      awningSafetyType,
      waiverAccepted,
    };

    // Add button labels and icons
    buttonLabels.forEach((label, i) => {
      config[`buttonLabel${i + 1}`] = label;
    });

    buttonIcons.forEach((icon, i) => {
      config[`buttonIcon${i + 1}`] = icon;
    });

    // Add tank labels
    tankLabels.forEach((label, i) => {
      config[`tankLabel${i + 1}`] = label;
    });

    // Add ventilation labels
    ventLabels.forEach((label, i) => {
      config[`ventilationLabel${i + 1}`] = label;
    });

    // Create a datestamp for the filename
    const now = new Date();
    const datestamp = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timestamp = `${String(now.getHours()).padStart(2, "0")}${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    // Create readable filename with system type and date
    const systemType = configType === "serv-plus" ? "CoreLight" : "Core";
    const filename = `garmin-${systemType}-config_${datestamp}_${timestamp}.json`;

    // Create and download the configuration file
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    // Show confirmation to user
    alert("Configuration saved successfully!");
  };

  // Add this state declaration with your other state declarations
  const [customLogo, setCustomLogo] = useState(null);

  // Add this handler function
  const handleLogoChange = (e) => {
    setCustomLogo(e.target.files[0]);
  };

  // Add these functions before your return statement

  // Validate each step based on its requirements
  const validateStep = (stepIndex) => {
    switch (stepIndex) {
      case 0: // Configuration
        return !!zipFile; // Basic validation: ZIP file is required

      case 1: // Branding & Appearance
        return true; // Optional step, always valid

      case 2: // Channel Configuration
        // Example validation: At least one channel group is enabled
        return Object.values(channelGroups).some((group) => group.enabled);

      case 3: // Power System
        return true; // Optional step, always valid

      case 4: // Climate Control
        return true; // Optional step, always valid

      case 5: // Accessories
        return true; // Optional step, always valid

      case 6: // Color Theme  
        return true; // Optional step, always valid

      case 7: // Review & Submit
        return !!zipFile; // Need at least a ZIP file to submit

      default:
        return true;
    }
  };

  // Update your handleSubmit function to include the logo
  // Add this to your formData section in handleSubmit:
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ position: "relative", width: "150px", height: "50px" }}>
          <Image
            src="/images/artek-logo.png"
            alt="Artek Logo"
            fill
            sizes="200px"
            priority
            style={{ objectFit: "contain" }}
          />
        </div>
        <h1>Garmin Graphics Customization Tool</h1>
      </header>

      <div className={styles.formProgress}>
        <div className={styles.stepIndicators}>
          {formSteps.map((step, index) => (
            <div
              key={step.id}
              className={`${styles.stepIndicator} ${
                currentStep === index ? styles.activeStep : ""
              } 
        ${completedSteps.includes(index) ? styles.completedStep : ""}`}
              onClick={() => !isSubmitting && setCurrentStep(index)}
            >
              <div className={styles.stepNumber}>{index + 1}</div>
              <div className={styles.stepTitle}>{step.title}</div>
            </div>
          ))}
        </div>
      </div>
      {!jobId ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formProgress}>
            {/* Progress indicators here */}
          </div>

          <div className={styles.formSection}>
            {currentStep === 0 && (
              <>
                {/* Configuration Type, ZIP upload, and Configuration Management sections */}
                <div className={styles.section}>
                  <h2>Configuration Type</h2>
                  <div className={styles.configSelector}>
                    <div className={styles.configOption}>
                      <input
                        type="radio"
                        id="serv-plus"
                        name="configType"
                        value="serv-plus"
                        checked={configType === "serv-plus"}
                        onChange={(e) => setConfigType(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="serv-plus">CORE Light</label>
                    </div>
                    <div className={styles.configOption}>
                      <input
                        type="radio"
                        id="core-system"
                        name="configType"
                        value="core-system"
                        checked={configType === "core-system"}
                        onChange={(e) => setConfigType(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="core-system">CORE</label>
                    </div>
                  </div>
                </div>
                <div className={styles.section}>
                  <h2>Upload ZIP Configuration File</h2>
                  <div className={styles.fileInput}>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                      required
                    />
                    {zipFile && <p>Selected file: {zipFile.name}</p>}
                  </div>
                </div>
                {/* Configuration management */}
                <div className={styles.section}>
                  <h2>Configuration Management</h2>
                  <div className={styles.configManagement}>
                    <div className={styles.configAction}>
                      <h3>Load Configuration</h3>
                      <p>
                        Load settings from a previously saved configuration file
                      </p>
                      <input
                        type="file"
                        id="configFile"
                        accept=".json"
                        onChange={handleConfigFileChange}
                        disabled={isSubmitting}
                        className={styles.fileInput}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            {currentStep === 1 && (
              <>
                {/* Branding & Appearance section */}
                <div className={styles.section}>
                  <h2>Branding & Appearance</h2>
                  <p className={styles.sectionInfo}>
                    Customize the look and branding of your application
                  </p>

                  <div className={styles.brandingGrid}>
                    {/* Brand Name */}
                    <div className={styles.brandingItem}>
                      <h3>Brand Name</h3>
                      <p className={styles.fieldDescription}>
                        Enter the brand name to display
                      </p>
                      <input
                        type="text"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="Enter brand name"
                        disabled={isSubmitting}
                        className={styles.textInput}
                      />
                    </div>

                    {/* Custom Logo */}
                    <div className={styles.brandingItem}>
                      <h3>Custom Logo</h3>
                      <p className={styles.fieldDescription}>
                        Upload a logo to replace the default brand logo
                      </p>
                      <div className={styles.logoUpload}>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          onChange={handleLogoChange}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                {/* Channel Configuration section */}
                {(configType === "core-system" ||
                  configType === "serv-plus") && (
                  <div className={styles.section}>
                    <h2>Channel Configuration</h2>
                    <p className={styles.sectionInfo}>
                      Enable and configure channels with names, icons, and
                      location.
                    </p>

                    {/* Only show the plumbing disclaimer for core-system */}
                    {configType === "core-system" && (
                      <div className={styles.disclaimer}>
                        <strong>Note:</strong> A maximum of two channels can be
                        assigned to the Plumbing page.
                      </div>
                    )}

                    {configType === "serv-plus" && (
                      <div className={styles.genesisOption}>
                        <input
                          type="checkbox"
                          id="genesis-board"
                          checked={hasGenesisBoard}
                          onChange={handleGenesisToggle}
                          disabled={isSubmitting}
                        />
                        <label htmlFor="genesis-board">
                          Genesis Board Installed (Enables Channels 7-10)
                        </label>
                      </div>
                    )}

                    {/* Filter channel groups based on config type */}
                    {Object.entries(channelGroups)
                      .filter(([groupKey]) =>
                        configType === "core-system"
                          ? groupKey.startsWith("core-")
                          : groupKey.startsWith("serv-") &&
                            (groupKey !== "serv-genesis-7-10" ||
                              hasGenesisBoard)
                      )
                      .map(([groupKey, group]) => (
                        <div key={groupKey} className={styles.channelGroup}>
                          <div className={styles.channelGroupHeader}>
                            <input
                              type="checkbox"
                              id={`group-${groupKey}`}
                              checked={group.enabled}
                              onChange={() =>
                                handleChannelGroupToggle(groupKey)
                              }
                              disabled={isSubmitting}
                            />
                            <label htmlFor={`group-${groupKey}`}>
                              {/* Format the label based on group key */}
                              {groupKey.includes("genesis")
                                ? "Genesis Channels 7-10"
                                : `Channels ${groupKey
                                    .split("-")
                                    .slice(-2)
                                    .join("-")}`}
                            </label>
                          </div>

                          {group.enabled && (
                            <div className={styles.channelsContainer}>
                              {group.channels.map((channel, idx) => {
                                // Calculate proper channel number based on group key
                                let channelNum;
                                if (groupKey.includes("genesis")) {
                                  channelNum = 7 + idx; // Genesis starts at 7
                                } else {
                                  // Extract range from groupKey (e.g., "1-5" from "core-1-5")
                                  const range = groupKey
                                    .split("-")
                                    .slice(-2) // Get the last two segments (e.g., "1", "6")
                                    .shift(); // Take the first of these, which is the start number

                                  channelNum = parseInt(range) + idx;
                                }

                                return (
                                  <div
                                    key={`channel-${groupKey}-${idx}`}
                                    className={styles.channelConfig}
                                  >
                                    <div className={styles.channelHeader}>
                                      <h4>Channel {channelNum}</h4>
                                      <div className={styles.channelToggle}>
                                        <input
                                          type="checkbox"
                                          id={`channel-${groupKey}-${idx}-toggle`}
                                          checked={channel.enabled}
                                          onChange={() =>
                                            handleChannelToggle(groupKey, idx)
                                          }
                                          disabled={isSubmitting}
                                        />
                                        <label
                                          htmlFor={`channel-${groupKey}-${idx}-toggle`}
                                          className={
                                            channel.enabled
                                              ? styles.enabledLabel
                                              : styles.disabledLabel
                                          }
                                        >
                                          {channel.enabled
                                            ? "Enabled"
                                            : "Disabled"}
                                        </label>
                                      </div>
                                    </div>

                                    {channel.enabled && (
                                      <>
                                        <div className={styles.channelField}>
                                          <label>Name:</label>
                                          <input
                                            type="text"
                                            value={channel.name}
                                            onChange={(e) =>
                                              handleChannelNameChange(
                                                groupKey,
                                                idx,
                                                e.target.value
                                              )
                                            }
                                            placeholder={`Channel ${channelNum}`}
                                            disabled={isSubmitting}
                                            className={styles.textInput}
                                          />
                                        </div>

                                        <div className={styles.channelField}>
                                          <label>Icon:</label>
                                          <IconDropdown
                                            value={
                                              configType === "core-system"
                                                ? channel.iconBase
                                                : channel.icon
                                            }
                                            onChange={(value) =>
                                              handleChannelIconChange(
                                                groupKey,
                                                idx,
                                                value
                                              )
                                            }
                                            icons={availableIcons}
                                            disabled={isSubmitting || channel.type === CHANNEL_TYPES.DIMMABLE}
                                            placeholder={channel.type === CHANNEL_TYPES.DIMMABLE ? "Icons not available for dimmers" : "Default Icon"}
                                          />
                                        </div>

                                        {/* Channel Type Selector */}
                                        <div className={styles.channelField}>
                                          <label>Type:</label>
                                          <div className={styles.typeSelector}>
                                            {/* For Genesis channels 9 and 10, only show Toggle and Momentary options */}
                                            {groupKey === "serv-genesis-7-10" &&
                                            (idx === 2 || idx === 3) ? (
                                              // Limited options for Genesis channels 9 and 10
                                              <>
                                                <div
                                                  className={styles.typeOption}
                                                >
                                                  <input
                                                    type="radio"
                                                    id={`channel-${groupKey}-${idx}-type-toggle`}
                                                    name={`channel-${groupKey}-${idx}-type`}
                                                    checked={
                                                      channel.type ===
                                                      CHANNEL_TYPES.TOGGLE
                                                    }
                                                    onChange={() =>
                                                      handleChannelTypeChange(
                                                        groupKey,
                                                        idx,
                                                        CHANNEL_TYPES.TOGGLE
                                                      )
                                                    }
                                                    disabled={isSubmitting}
                                                  />
                                                  <label
                                                    htmlFor={`channel-${groupKey}-${idx}-type-toggle`}
                                                  >
                                                    Latching
                                                  </label>
                                                </div>
                                                <div
                                                  className={styles.typeOption}
                                                >
                                                  <input
                                                    type="radio"
                                                    id={`channel-${groupKey}-${idx}-type-momentary`}
                                                    name={`channel-${groupKey}-${idx}-type`}
                                                    checked={
                                                      channel.type ===
                                                      CHANNEL_TYPES.MOMENTARY
                                                    }
                                                    onChange={() =>
                                                      handleChannelTypeChange(
                                                        groupKey,
                                                        idx,
                                                        CHANNEL_TYPES.MOMENTARY
                                                      )
                                                    }
                                                    disabled={isSubmitting}
                                                  />
                                                  <label
                                                    htmlFor={`channel-${groupKey}-${idx}-type-momentary`}
                                                  >
                                                    Momentary
                                                  </label>
                                                </div>
                                              </>
                                            ) : (
                                              // All options for other channels
                                              <>
                                                <div
                                                  className={styles.typeOption}
                                                >
                                                  <input
                                                    type="radio"
                                                    id={`channel-${groupKey}-${idx}-type-toggle`}
                                                    name={`channel-${groupKey}-${idx}-type`}
                                                    checked={
                                                      channel.type ===
                                                      CHANNEL_TYPES.TOGGLE
                                                    }
                                                    onChange={() =>
                                                      handleChannelTypeChange(
                                                        groupKey,
                                                        idx,
                                                        CHANNEL_TYPES.TOGGLE
                                                      )
                                                    }
                                                    disabled={isSubmitting}
                                                  />
                                                  <label
                                                    htmlFor={`channel-${groupKey}-${idx}-type-toggle`}
                                                  >
                                                    Latching
                                                  </label>
                                                </div>
                                                <div
                                                  className={styles.typeOption}
                                                >
                                                  <input
                                                    type="radio"
                                                    id={`channel-${groupKey}-${idx}-type-momentary`}
                                                    name={`channel-${groupKey}-${idx}-type`}
                                                    checked={
                                                      channel.type ===
                                                      CHANNEL_TYPES.MOMENTARY
                                                    }
                                                    onChange={() =>
                                                      handleChannelTypeChange(
                                                        groupKey,
                                                        idx,
                                                        CHANNEL_TYPES.MOMENTARY
                                                      )
                                                    }
                                                    disabled={isSubmitting}
                                                  />
                                                  <label
                                                    htmlFor={`channel-${groupKey}-${idx}-type-momentary`}
                                                  >
                                                    Momentary
                                                  </label>
                                                </div>
                                                <div
                                                  className={styles.typeOption}
                                                >
                                                  <input
                                                    type="radio"
                                                    id={`channel-${groupKey}-${idx}-type-dimmable`}
                                                    name={`channel-${groupKey}-${idx}-type`}
                                                    checked={
                                                      channel.type ===
                                                      CHANNEL_TYPES.DIMMABLE
                                                    }
                                                    onChange={() =>
                                                      handleChannelTypeChange(
                                                        groupKey,
                                                        idx,
                                                        CHANNEL_TYPES.DIMMABLE
                                                      )
                                                    }
                                                    disabled={isSubmitting}
                                                  />
                                                  <label
                                                    htmlFor={`channel-${groupKey}-${idx}-type-dimmable`}
                                                  >
                                                    Dimmable
                                                  </label>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        {!groupKey.includes("genesis") && (
                                          <div className={styles.channelField}>
                                            <div
                                              className={styles.rampingOption}
                                            >
                                              <input
                                                type="checkbox"
                                                id={`channel-${groupKey}-${idx}-ramping`}
                                                checked={
                                                  channel.ramping || false
                                                }
                                                onChange={() =>
                                                  handleRampingToggle(
                                                    groupKey,
                                                    idx
                                                  )
                                                }
                                                disabled={
                                                  isSubmitting ||
                                                  channel.type ===
                                                    CHANNEL_TYPES.MOMENTARY
                                                }
                                              />
                                              <label
                                                htmlFor={`channel-${groupKey}-${idx}-ramping`}
                                                className={
                                                  channel.type ===
                                                  CHANNEL_TYPES.MOMENTARY
                                                    ? styles.disabledLabel
                                                    : ""
                                                }
                                              >
                                                Enable Ramping
                                                {channel.type ===
                                                  CHANNEL_TYPES.MOMENTARY && (
                                                  <span
                                                    className={
                                                      styles.inlineNote
                                                    }
                                                  >
                                                    {" "}
                                                    (Not available for Momentary
                                                    channels)
                                                  </span>
                                                )}
                                              </label>
                                              <span className={styles.tooltip}>
                                                Smooth transition between on/off
                                                states
                                              </span>
                                            </div>
                                          </div>
                                        )}

                                        {/* Only show tag selector for Core System, not for SERV Plus */}
                                        {configType === "core-system" && (
                                          // Inside your channel rendering loop
                                          <div className={styles.channelField}>
                                            <label>Channel Location:</label>
                                            <select
                                              value={channel.tag}
                                              onChange={(e) =>
                                                handleChannelTagChange(
                                                  groupKey,
                                                  idx,
                                                  e.target.value
                                                )
                                              }
                                              disabled={
                                                isSubmitting || !channel.enabled
                                              }
                                              className={styles.selectInput}
                                            >
                                              <option value="main">Home</option>
                                              <option value="lighting">
                                                Lighting
                                              </option>
                                              <option
                                                value="plumbing"
                                                disabled={
                                                  channel.tag !== "plumbing" &&
                                                  countPlumbingTags() >= 2
                                                }
                                              >
                                                Plumbing{" "}
                                                {channel.tag !== "plumbing" &&
                                                countPlumbingTags() >= 2
                                                  ? "(Limit Reached)"
                                                  : ""}
                                              </option>
                                              <option value="power">
                                                Switching
                                              </option>
                                            </select>
                                          </div>
                                        )}
                                        {/* Add conditional lighting type selector */}
                                        {channel.enabled &&
                                          channel.tag === "lighting" && (
                                            <div
                                              className={
                                                styles.conditionalOption
                                              }
                                            >
                                              <label>Lighting Type:</label>
                                              <div
                                                className={styles.typeSelector}
                                              >
                                                <div
                                                  className={styles.typeOption}
                                                >
                                                  <input
                                                    type="radio"
                                                    id={`channel-${groupKey}-${idx}-lighting-interior`}
                                                    name={`channel-${groupKey}-${idx}-lighting-type`}
                                                    checked={
                                                      channel.lightingType ===
                                                      "interior"
                                                    }
                                                    onChange={() =>
                                                      handleLightingTypeChange(
                                                        groupKey,
                                                        idx,
                                                        "interior"
                                                      )
                                                    }
                                                    disabled={isSubmitting}
                                                  />
                                                  <label
                                                    htmlFor={`channel-${groupKey}-${idx}-lighting-interior`}
                                                  >
                                                    Interior
                                                  </label>
                                                </div>
                                                <div
                                                  className={styles.typeOption}
                                                >
                                                  <input
                                                    type="radio"
                                                    id={`channel-${groupKey}-${idx}-lighting-exterior`}
                                                    name={`channel-${groupKey}-${idx}-lighting-type`}
                                                    checked={
                                                      channel.lightingType ===
                                                      "exterior"
                                                    }
                                                    onChange={() =>
                                                      handleLightingTypeChange(
                                                        groupKey,
                                                        idx,
                                                        "exterior"
                                                      )
                                                    }
                                                    disabled={isSubmitting}
                                                  />
                                                  <label
                                                    htmlFor={`channel-${groupKey}-${idx}-lighting-exterior`}
                                                  >
                                                    Exterior
                                                  </label>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

            {currentStep === 3 && (
              <>
                <div className={styles.section}>
                  <h2>Power System</h2>
                  <div className={styles.subsection}>
                    <h3>Components</h3>
                    <div className={styles.optionsGrid}>
                      <div className={styles.optionItem}>
                        <input
                          type="checkbox"
                          id="second-alternator"
                          checked={hasSecondAlternator}
                          onChange={(e) =>
                            setHasSecondAlternator(e.target.checked)
                          }
                          disabled={isSubmitting}
                        />
                        <label htmlFor="second-alternator">
                          Second Alternator
                        </label>
                      </div>

                      <div className={styles.optionItem}>
                        <input
                          type="checkbox"
                          id="orion-xs"
                          checked={hasOrionXS}
                          onChange={(e) => setHasOrionXS(e.target.checked)}
                          disabled={isSubmitting}
                        />
                        <label htmlFor="orion-xs">Orion XS</label>
                      </div>

                      <div className={styles.optionItem}>
                        <input
                          type="checkbox"
                          id="primary-solar"
                          checked={hasPrimarySolar}
                          onChange={(e) => setHasPrimarySolar(e.target.checked)}
                          disabled={isSubmitting}
                        />
                        <label htmlFor="primary-solar">Primary Solar</label>
                      </div>

                      <div className={styles.optionItem}>
                        <input
                          type="checkbox"
                          id="aux-solar"
                          checked={hasAuxSolar}
                          onChange={(e) => setHasAuxSolar(e.target.checked)}
                          disabled={isSubmitting}
                        />
                        <label htmlFor="aux-solar">Auxiliary Solar</label>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentStep === 4 && (
              <>
                <div className={styles.section}>
                  <h2>Climate Control</h2>
                  <div className={styles.subsection}>
                    <h3>Temperature Unit</h3>
                    <div className={styles.optionItem}>
                      <input
                        type="checkbox"
                        id="use-celsius"
                        checked={useCelsius}
                        onChange={(e) => setUseCelsius(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="use-celsius">
                        Display temperature in Celsius
                      </label>
                    </div>
                  </div>

                  {/* Heating System */}
                  <div className={styles.subsection}>
                    <h3>Heating System</h3>
                    <div className={styles.optionItem}>
                      <input
                        type="checkbox"
                        id="has-heating-system"
                        checked={hasHeatingSystem}
                        onChange={(e) => setHasHeatingSystem(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="has-heating-system">
                        Enable Heating System
                      </label>
                    </div>

                    {hasHeatingSystem && (
                      <div className={styles.featureGroup}>
                        <div className={styles.featureGroupTitle}>
                          Heating Components
                        </div>
                        <div className={styles.optionsGrid}>
                          <div className={styles.optionItem}>
                            <input
                              type="checkbox"
                              id="heater"
                              checked={hasHeater}
                              onChange={(e) => setHasHeater(e.target.checked)}
                              disabled={isSubmitting}
                            />
                            <label htmlFor="heater">Main Heater</label>
                          </div>

                          <div className={styles.optionItem}>
                            <input
                              type="checkbox"
                              id="electric-heat"
                              checked={hasElectricHeat}
                              onChange={(e) =>
                                setHasElectricHeat(e.target.checked)
                              }
                              disabled={isSubmitting}
                            />
                            <label htmlFor="electric-heat">Electric Heat</label>
                          </div>

                          <div className={styles.optionItem}>
                            <input
                              type="checkbox"
                              id="engine-heat"
                              checked={hasEngineHeat}
                              onChange={(e) =>
                                setHasEngineHeat(e.target.checked)
                              }
                              disabled={isSubmitting}
                            />
                            <label htmlFor="engine-heat">Engine Heat</label>
                          </div>

                          <div className={styles.optionItem}>
                            <input
                              type="checkbox"
                              id="floor-heat"
                              checked={hasFloorHeat}
                              onChange={(e) =>
                                setHasFloorHeat(e.target.checked)
                              }
                              disabled={isSubmitting}
                            />
                            <label htmlFor="floor-heat">Floor Heat</label>
                          </div>

                          <div className={styles.optionItem}>
                            <input
                              type="checkbox"
                              id="heat-fan"
                              checked={hasHeatFan}
                              onChange={(e) => setHasHeatFan(e.target.checked)}
                              disabled={isSubmitting}
                            />
                            <label htmlFor="heat-fan">Heat Fan</label>
                          </div>

                          <div className={styles.optionItem}>
                            <input
                              type="checkbox"
                              id="aux-heat"
                              checked={hasAuxHeat}
                              onChange={(e) => setHasAuxHeat(e.target.checked)}
                              disabled={isSubmitting}
                            />
                            <label htmlFor="aux-heat">Auxiliary Heat</label>
                          </div>

                          {hasAuxHeat && (
                            <div className={styles.subOption}>
                              <label htmlFor="aux-heat-name">
                                Custom Name:
                              </label>
                              <input
                                type="text"
                                id="aux-heat-name"
                                value={auxHeatName}
                                onChange={(e) => setAuxHeatName(e.target.value)}
                                placeholder="Auxiliary Heat"
                                disabled={isSubmitting}
                                className={styles.textInput}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Air Conditioning */}
                  <div className={styles.subsection}>
                    <h3>Air Conditioning</h3>
                    <div className={styles.optionItem}>
                      <input
                        type="checkbox"
                        id="air-conditioner"
                        checked={hasAirConditioner}
                        onChange={(e) => setHasAirConditioner(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="air-conditioner">
                        Enable Air Conditioner
                      </label>
                    </div>

                    {hasAirConditioner && (
                      <div className={styles.featureGroup}>
                        <div className={styles.acTypeSelector}>
                          <label>AC Type:</label>
                          <div className={styles.radioGroup}>
                            <div className={styles.radioOption}>
                              <input
                                type="radio"
                                id="cruise-n-comfort"
                                name="ac-type"
                                value="cruise-n-comfort"
                                checked={acType === "cruise-n-comfort"}
                                onChange={(e) => {
                                  setAcType(e.target.value);
                                  if (hasHeatPump) {
                                    setHasHeatPump(false);
                                  }
                                }}
                                disabled={isSubmitting}
                              />
                              <label htmlFor="cruise-n-comfort">
                                Cruise n Comfort
                              </label>
                            </div>
                            <div className={styles.radioOption}>
                              <input
                                type="radio"
                                id="recpro"
                                name="ac-type"
                                value="recpro"
                                checked={acType === "recpro"}
                                onChange={(e) => setAcType(e.target.value)}
                                disabled={isSubmitting}
                              />
                              <label htmlFor="recpro">Recpro</label>
                            </div>
                          </div>
                        </div>

                        {acType === "recpro" && (
                          <div className={styles.conditionalOption}>
                            <input
                              type="checkbox"
                              id="heat-pump"
                              checked={hasHeatPump}
                              onChange={(e) => setHasHeatPump(e.target.checked)}
                              disabled={isSubmitting}
                            />
                            <label htmlFor="heat-pump">Heat Pump</label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ventilation */}
                  <div className={styles.subsection}>
                    <h3>Ventilation</h3>
                    <div className={styles.optionItem}>
                      <input
                        type="checkbox"
                        id="has-ventilation"
                        checked={hasVentilation}
                        onChange={(e) => setHasVentilation(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="has-ventilation">
                        Enable Ventilation System
                      </label>
                    </div>

                    {hasVentilation && (
                      <div className={styles.featureGroup}>
                        <div className={styles.featureGroupTitle}>
                          Number of Fans:
                        </div>

                        <div className={styles.conditionalOption}>
                          <select
                            id="ventilation-fan-count"
                            value={ventilationFanCount}
                            onChange={(e) =>
                              setVentilationFanCount(parseInt(e.target.value))
                            }
                            disabled={isSubmitting}
                            className={styles.selectInput}
                          >
                            <option value={1}>1 Fan</option>
                            <option value={2}>2 Fans</option>
                          </select>
                        </div>

                        <div className={styles.ventLabels}>
                          <div className={styles.labelGrid}>
                            {ventLabels
                              .slice(0, ventilationFanCount)
                              .map((label, i) => (
                                <div
                                  key={`vent-${i}`}
                                  className={styles.labelInput}
                                >
                                  <label>Label for Ventilation {i + 1}:</label>
                                  <input
                                    type="text"
                                    value={label}
                                    onChange={(e) =>
                                      handleVentLabelChange(i, e.target.value)
                                    }
                                    placeholder={`Ventilation ${i + 1}`}
                                    disabled={isSubmitting}
                                    className={styles.textInput}
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {currentStep === 5 && (
              <>
                <div className={styles.section}>
                  <h2>Utilities</h2>

                  {/* Plumbing System */}
                  <div className={styles.subsection}>
                    <h3>Plumbing System</h3>
                    <div className={styles.optionItem}>
                      <input
                        type="checkbox"
                        id="has-plumbing"
                        checked={hasPlumbing}
                        onChange={(e) => setHasPlumbing(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="has-plumbing">
                        Enable Tank Monitoring
                      </label>
                    </div>

                    {hasPlumbing && (
                      <div className={styles.plumbingConfig}>
                        <div className={styles.configRow}>
                          <div className={styles.configField}>
                            <label htmlFor="tank-count">Number of Tanks:</label>
                            <select
                              id="tank-count"
                              value={tankCount}
                              onChange={(e) => {
                                const count = parseInt(e.target.value);
                                setTankCount(count);
                                // Adjust tank types array size if needed
                                if (count > tankTypes.length) {
                                  setTankTypes([
                                    ...tankTypes,
                                    ...Array(count - tankTypes.length).fill(
                                      "Fresh Water"
                                    ),
                                  ]);
                                  // Also adjust tank labels
                                  const newLabels = [...tankLabels];
                                  for (
                                    let i = tankLabels.length;
                                    i < count;
                                    i++
                                  ) {
                                    newLabels[i] = `Tank ${i + 1}`;
                                  }
                                  setTankLabels(newLabels);
                                }
                              }}
                              disabled={isSubmitting}
                              className={styles.selectInput}
                            >
                              {[1, 2, 3, 4].map((num) => (
                                <option key={num} value={num}>
                                  {num} {num === 1 ? "Tank" : "Tanks"}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className={styles.tankTypesGrid}>
                          {tankTypes.slice(0, tankCount).map((type, index) => (
                            <div
                              key={`tank-${index}`}
                              className={styles.tankTypeSelector}
                            >
                              <label htmlFor={`tank-${index}-type`}>
                                Tank {index + 1} Type:
                              </label>
                              <select
                                id={`tank-${index}-type`}
                                value={type}
                                onChange={(e) => {
                                  const newTypes = [...tankTypes];
                                  newTypes[index] = e.target.value;
                                  setTankTypes(newTypes);

                                  // Update corresponding label placeholder with type
                                  if (
                                    !tankLabels[index] ||
                                    tankLabels[index] === `Tank ${index + 1}`
                                  ) {
                                    const newLabels = [...tankLabels];
                                    newLabels[index] = e.target.value;
                                    setTankLabels(newLabels);
                                  }
                                }}
                                disabled={isSubmitting}
                                className={styles.selectInput}
                              >
                                <option value="Fresh Water">Fresh Water</option>
                                <option value="Grey Water">Grey Water</option>
                                <option value="Black Water">Black Water</option>
                                <option value="LPG">LPG</option>
                                <option value="Second Fresh Water">
                                  Second Fresh Water
                                </option>
                                <option value="Second Grey Water">
                                  Second Grey Water
                                </option>
                                <option value="Second Black Water">
                                  Second Black Water
                                </option>
                              </select>
                            </div>
                          ))}
                        </div>

                        <div className={styles.labelSection}>
                          <h4>Tank Display Labels</h4>
                          <p className={styles.fieldDescription}>
                            These labels will appear on the display screen
                          </p>
                          <div className={styles.labelGrid}>
                            {tankLabels
                              .slice(
                                0,
                                Math.min(
                                  tankCount,
                                  configType === "serv-plus" ? 4 : 4
                                )
                              )
                              .map((label, i) => (
                                <div
                                  key={`tank-label-${i}`}
                                  className={styles.labelInput}
                                >
                                  <label>Label for Tank {i + 1}:</label>
                                  <input
                                    type="text"
                                    value={label}
                                    onChange={(e) =>
                                      handleTankLabelChange(i, e.target.value)
                                    }
                                    placeholder={
                                      tankTypes[i] || `Tank ${i + 1}`
                                    }
                                    disabled={isSubmitting}
                                    className={styles.textInput}
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RGB Lighting */}
                  <div className={styles.subsection}>
                    <h3>RGB Lighting</h3>
                    <div className={styles.rgbConfig}>
                      <div className={styles.optionItem}>
                        <input
                          type="checkbox"
                          id="rgb-lighting"
                          checked={hasRgbLighting}
                          onChange={(e) => setHasRgbLighting(e.target.checked)}
                          disabled={isSubmitting}
                        />
                        <label htmlFor="rgb-lighting">
                          RGB Lighting System
                        </label>
                      </div>

                      {hasRgbLighting && (
                        <div className={styles.featureGroup}>
                          <div className={styles.rgbSetting}>
                            <label htmlFor="rgb-controller-count">
                              Number of Controllers:
                            </label>
                            <select
                              id="rgb-controller-count"
                              value={rgbControllerCount}
                              onChange={(e) => {
                                const newCount = parseInt(e.target.value);
                                setRgbControllerCount(newCount);
                                // If switching to 2 controllers and zones are greater than 2, reset to 2
                                if (
                                  newCount === 2 &&
                                  rgbZonesPerController > 2
                                ) {
                                  setRgbZonesPerController(2);
                                }
                              }}
                              disabled={isSubmitting}
                              className={styles.selectInput}
                            >
                              {[1, 2].map((num) => (
                                <option key={num} value={num}>
                                  {num}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className={styles.rgbSetting}>
                            <label htmlFor="rgb-zones-per-controller">
                              Zones per Controller:
                            </label>
                            <select
                              id="rgb-zones-per-controller"
                              value={rgbZonesPerController}
                              onChange={(e) =>
                                setRgbZonesPerController(
                                  parseInt(e.target.value)
                                )
                              }
                              disabled={isSubmitting}
                              className={styles.selectInput}
                            >
                              {/* Dynamically generate options based on controller count */}
                              {(rgbControllerCount === 1
                                ? [1, 2, 3, 4]
                                : [1, 2]
                              ).map((num) => (
                                <option key={num} value={num}>
                                  {num}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className={styles.conditionalOption}>
                            <p className={styles.featureGroupTitle}>
                              Total RGB Zones:{" "}
                              {rgbControllerCount * rgbZonesPerController}
                            </p>
                          </div>

                          {/* New section for RGB zone labels */}
                          <div className={styles.rgbZoneLabels}>
                            <h4>RGB Zone Labels</h4>
                            <p className={styles.fieldDescription}>
                              Customize the names of your RGB lighting zones
                            </p>
                            <div className={styles.labelGrid}>
                              {rgbZoneLabels
                                .slice(
                                  0,
                                  rgbControllerCount * rgbZonesPerController
                                )
                                .map((label, i) => (
                                  <div
                                    key={`rgb-zone-${i}`}
                                    className={styles.labelInput}
                                  >
                                    <label>Zone {i + 1} Name:</label>
                                    <input
                                      type="text"
                                      value={label}
                                      onChange={(e) =>
                                        handleRgbZoneLabelChange(
                                          i,
                                          e.target.value
                                        )
                                      }
                                      placeholder={`RGB Zone ${i + 1}`}
                                      disabled={isSubmitting}
                                      className={styles.textInput}
                                    />
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.subsection}>
                    <h3>External Components</h3>
                    <div className={styles.accessoriesConfig}>
                      {/* Slide Out with keypad option */}
                      <div className={styles.accessoryItem}>
                        <div className={styles.optionItem}>
                          <input
                            type="checkbox"
                            id="has-slides"
                            checked={hasSlides}
                            onChange={(e) => {
                              setHasSlides(e.target.checked);
                              // Reset safety type if disabling slides
                              if (!e.target.checked) {
                                setSlideSafetyType("keypad");
                                setWaiverAccepted((prev) => ({
                                  ...prev,
                                  slides: false,
                                }));
                              }
                            }}
                            disabled={isSubmitting}
                          />
                          <label htmlFor="has-slides">Lift Bed</label>
                        </div>

                        {hasSlides && (
                          <div className={styles.safetyOptions}>
                            <p className={styles.safetyTitle}>
                              Safety Mechanism:
                            </p>
                            <div className={styles.radioGroup}>
                              <div className={styles.radioOption}>
                                <input
                                  type="radio"
                                  id="slide-safety-keypad"
                                  name="slide-safety-type"
                                  value="keypad"
                                  checked={slideSafetyType === "keypad"}
                                  onChange={() => setSlideSafetyType("keypad")}
                                  disabled={isSubmitting}
                                />
                                <label htmlFor="slide-safety-keypad">
                                  Key Pad
                                </label>
                              </div>

                              <div className={styles.radioOption}>
                                <input
                                  type="radio"
                                  id="slide-safety-keylock"
                                  name="slide-safety-type"
                                  value="keylock"
                                  checked={slideSafetyType === "keylock"}
                                  onChange={() => setSlideSafetyType("keylock")}
                                  disabled={isSubmitting}
                                />
                                <label htmlFor="slide-safety-keylock">
                                  OEM Key Lock
                                </label>
                              </div>

                              <div className={styles.radioOption}>
                                <input
                                  type="radio"
                                  id="slide-safety-none"
                                  name="slide-safety-type"
                                  value="none"
                                  checked={slideSafetyType === "none"}
                                  onChange={() => {
                                    // Set pending change and show waiver modal
                                    setPendingSafetyChange({
                                      type: "slides",
                                      value: "none",
                                    });
                                    setShowWaiverModal(true);
                                  }}
                                  disabled={isSubmitting}
                                />
                                <label htmlFor="slide-safety-none">
                                  No Safety Mechanism
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Awning with keypad option */}
                      <div className={styles.accessoryItem}>
                        <div className={styles.optionItem}>
                          <input
                            type="checkbox"
                            id="has-awning"
                            checked={hasAwning}
                            onChange={(e) => {
                              setHasAwning(e.target.checked);
                              if (!e.target.checked) {
                                setAwningSafetyType("keypad");
                                setWaiverAccepted((prev) => ({
                                  ...prev,
                                  awning: false,
                                }));
                              }
                            }}
                            disabled={isSubmitting}
                          />
                          <label htmlFor="has-awning">Awning</label>
                        </div>

                        {hasAwning && (
                          <div className={styles.safetyOptions}>
                            <p className={styles.safetyTitle}>
                              Safety Mechanism:
                            </p>
                            <div className={styles.radioGroup}>
                              <div className={styles.radioOption}>
                                <input
                                  type="radio"
                                  id="awning-safety-keypad"
                                  name="awning-safety-type"
                                  value="keypad"
                                  checked={awningSafetyType === "keypad"}
                                  onChange={() => setAwningSafetyType("keypad")}
                                  disabled={isSubmitting}
                                />
                                <label htmlFor="awning-safety-keypad">
                                  Key Pad
                                </label>
                              </div>

                              <div className={styles.radioOption}>
                                <input
                                  type="radio"
                                  id="awning-safety-keylock"
                                  name="awning-safety-type"
                                  value="keylock"
                                  checked={awningSafetyType === "keylock"}
                                  onChange={() =>
                                    setAwningSafetyType("keylock")
                                  }
                                  disabled={isSubmitting}
                                />
                                <label htmlFor="awning-safety-keylock">
                                  OEM Key Lock
                                </label>
                              </div>

                              <div className={styles.radioOption}>
                                <input
                                  type="radio"
                                  id="awning-safety-none"
                                  name="awning-safety-type"
                                  value="none"
                                  checked={awningSafetyType === "none"}
                                  onChange={() => {
                                    // Set pending change and show waiver modal
                                    setPendingSafetyChange({
                                      type: "awning",
                                      value: "none",
                                    });
                                    setShowWaiverModal(true);
                                  }}
                                  disabled={isSubmitting}
                                />
                                <label htmlFor="awning-safety-none">
                                  No Safety Mechanism
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {showWaiverModal && (
                        <div className={styles.modalOverlay}>
                          <div className={styles.modal}>
                            <h2>Liability Waiver</h2>
                            <div className={styles.waiverText}>
                              <p>
                                WARNING: Operating a{" "}
                                {pendingSafetyChange?.type === "slides"
                                  ? "lift bed"
                                  : "awning"}{" "}
                                without a safety mechanism may lead to
                                unintended operation and could result in:
                              </p>
                              <ul>
                                <li>Property damage</li>
                                <li>Personal injury</li>
                                <li>
                                  Violation of manufacturer recommendations
                                </li>
                                <li>Voiding of warranty</li>
                              </ul>
                              <p>
                                By proceeding without a safety mechanism, you
                                acknowledge that you understand and accept all
                                risks and liabilities associated with this
                                configuration.
                              </p>
                              <p>
                                Artek recommends always using a safety mechanism
                                for{" "}
                                {pendingSafetyChange?.type === "slides"
                                  ? "lift beds"
                                  : "awnings"}
                                .
                              </p>
                            </div>
                            <div className={styles.waiverActions}>
                              <button
                                type="button"
                                className={styles.waiverCancel}
                                onClick={() => {
                                  // Reset to previous selection
                                  if (pendingSafetyChange?.type === "slides") {
                                    setSlideSafetyType("keypad");
                                  } else if (
                                    pendingSafetyChange?.type === "awning"
                                  ) {
                                    setAwningSafetyType("keypad");
                                  }
                                  setShowWaiverModal(false);
                                  setPendingSafetyChange(null);
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className={styles.waiverAccept}
                                onClick={() => {
                                  // Apply the change and record waiver acceptance
                                  if (pendingSafetyChange?.type === "slides") {
                                    setSlideSafetyType("none");
                                    setWaiverAccepted((prev) => ({
                                      ...prev,
                                      slides: true,
                                    }));
                                  } else if (
                                    pendingSafetyChange?.type === "awning"
                                  ) {
                                    setAwningSafetyType("none");
                                    setWaiverAccepted((prev) => ({
                                      ...prev,
                                      awning: true,
                                    }));
                                  }
                                  setShowWaiverModal(false);
                                  setPendingSafetyChange(null);
                                }}
                              >
                                I Accept the Risks
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentStep === 6 && (
              <>
                <div className={styles.section}>
                  <h2>Color Theme Customization</h2>
                  <p className={styles.sectionInfo}>
                    Choose a predefined color theme or customize your own colors for the interface.
                  </p>

                  {/* Predefined Themes */}
                  <div className={styles.subsection}>
                    <h3>Predefined Themes</h3>
                    <div className={styles.themeGrid}>
                      {Object.entries(colorThemes).map(([key, theme]) => (
                        <div
                          key={key}
                          className={`${styles.themeCard} ${selectedTheme === key ? styles.selectedTheme : ''}`}
                          onClick={() => handleThemeChange(key)}
                          style={{
                            backgroundColor: theme.primaryBackground,
                            borderColor: theme.borderColor,
                            color: theme.primaryText
                          }}
                        >
                          <div className={styles.themeName}>{theme.name}</div>
                          <div className={styles.colorPreview}>
                            <div className={styles.colorSwatch} style={{ backgroundColor: theme.primaryBackground }}></div>
                            <div className={styles.colorSwatch} style={{ backgroundColor: theme.accentColor }}></div>
                            <div className={styles.colorSwatch} style={{ backgroundColor: theme.activeBackground }}></div>
                          </div>
                        </div>
                      ))}
                      <div
                        className={`${styles.themeCard} ${selectedTheme === 'custom' ? styles.selectedTheme : ''}`}
                        onClick={() => handleThemeChange('custom')}
                        style={{
                          backgroundColor: '#f5f5f5',
                          borderColor: '#ddd',
                          color: '#333'
                        }}
                      >
                        <div className={styles.themeName}>Custom</div>
                        <div className={styles.colorPreview}>
                          <div className={styles.colorSwatch} style={{ background: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Color Controls */}
                  {(useCustomColors || selectedTheme === 'custom') && (
                    <div className={styles.subsection}>
                      <h3>Custom Colors</h3>
                      <div className={styles.colorCustomizer}>
                        {Object.entries(customColors).map(([key, value]) => {
                          if (key === 'name') return null;
                          return (
                            <div key={key} className={styles.colorControl}>
                              <label htmlFor={`color-${key}`} className={styles.colorLabel}>
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                              </label>
                              <div className={styles.colorInputGroup}>
                                <input
                                  type="color"
                                  id={`color-${key}`}
                                  value={value}
                                  onChange={(e) => handleColorChange(key, e.target.value)}
                                  className={styles.colorPicker}
                                  disabled={isSubmitting}
                                />
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => handleColorChange(key, e.target.value)}
                                  className={styles.colorTextInput}
                                  placeholder="#000000"
                                  disabled={isSubmitting}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Live Preview */}
                  <div className={styles.subsection}>
                    <h3>Preview</h3>
                    <div 
                      className={styles.colorPreview}
                      style={{
                        backgroundColor: getCurrentColors().primaryBackground,
                        border: `2px solid ${getCurrentColors().borderColor}`,
                        color: getCurrentColors().primaryText,
                        padding: '20px',
                        borderRadius: '8px'
                      }}
                    >
                      <div className={styles.previewHeader} style={{ color: getCurrentColors().primaryText }}>
                        Sample Interface
                      </div>
                      <div 
                        className={styles.previewButton}
                        style={{
                          backgroundColor: getCurrentColors().buttonBackground,
                          color: getCurrentColors().buttonText,
                          border: `1px solid ${getCurrentColors().borderColor}`,
                          padding: '8px 16px',
                          borderRadius: '4px',
                          margin: '10px 0'
                        }}
                      >
                        Sample Button
                      </div>
                      <div 
                        className={styles.previewButtonActive}
                        style={{
                          backgroundColor: getCurrentColors().activeBackground,
                          color: getCurrentColors().activeText,
                          border: `1px solid ${getCurrentColors().borderColor}`,
                          padding: '8px 16px',
                          borderRadius: '4px',
                          margin: '10px 0'
                        }}
                      >
                        Active Button
                      </div>
                      <div style={{ color: getCurrentColors().accentColor, fontWeight: 'bold', margin: '10px 0' }}>
                        Accent Color Text
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentStep === 7 && (
              <>
                <div className={styles.section}>
                  <h2>Review & Submit</h2>
                  <p className={styles.sectionInfo}>
                    Review your configuration settings and submit for
                    processing.
                  </p>

                  <div className={styles.reviewSection}>
                    <h3>Configuration Summary</h3>
                    <div className={styles.configSummary}>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>
                          System Type:
                        </span>
                        <span className={styles.summaryValue}>
                          {configType === "serv-plus"
                            ? "SERV Plus"
                            : "Core System"}
                        </span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Brand Name:</span>
                        <span className={styles.summaryValue}>
                          {brandName || "Default"}
                        </span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>ZIP File:</span>
                        <span className={styles.summaryValue}>
                          {zipFile ? zipFile.name : "No file selected"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.actionContainer}>
                    <div className={styles.configAction}>
                      <h3>Save Configuration</h3>
                      <p>
                        Save your current settings to a configuration file that
                        you can load later.
                      </p>
                      <button
                        type="button"
                        onClick={saveCurrentConfig}
                        disabled={isSubmitting}
                        className={styles.actionButton}
                      >
                        Save Configuration
                      </button>
                    </div>

                    <div className={styles.configAction}>
                      <h3>Process Configuration</h3>
                      <p>Upload your ZIP file and apply the current settings</p>
                      <button
                        type="submit"
                        disabled={isSubmitting || !zipFile}
                        className={styles.submitButton}
                      >
                        {isSubmitting ? "Processing..." : "Upload and Process"}
                      </button>
                      {!zipFile && (
                        <p className={styles.warningText}>
                          Please select a ZIP file before processing.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className={styles.formNavigationContainer}>
            {/* Only show completion checkbox if not on the final step */}
            {currentStep < formSteps.length - 1 && (
              <div className={styles.stepCompletionControl}>
                <input
                  type="checkbox"
                  id={`complete-step-${currentStep}`}
                  checked={completedSteps.includes(currentStep)}
                  onChange={() => {
                    if (validateStep(currentStep)) {
                      setCompletedSteps((prev) => {
                        if (!prev.includes(currentStep)) {
                          return [...prev, currentStep];
                        }
                        // If unchecking, remove from completed steps
                        return prev.filter((step) => step !== currentStep);
                      });
                    }
                  }}
                  disabled={isSubmitting || !validateStep(currentStep)}
                />
                <label htmlFor={`complete-step-${currentStep}`}>
                  Mark Step {currentStep + 1} as Complete
                </label>
              </div>
            )}

            <div className={styles.formNavigation}>
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={isSubmitting}
                  className={styles.navButton}
                >
                  Previous
                </button>
              )}

              {currentStep < formSteps.length - 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={isSubmitting}
                  className={styles.navButton}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
        <div className={styles.statusSection}>
          <h2>Job Status</h2>
          <div className={styles.statusCard}>
            <p>Job ID: {jobId}</p>
            <p>Status: {status}</p>
            <p>
              Configuration:{" "}
              {configType === "serv-plus" ? "SERV Plus" : "Core System"}
            </p>

            {status === "processing" && (
              <div className={styles.spinner}>
                <div className={styles.spinnerAnimation}></div>
                <p>Processing your file...</p>
              </div>
            )}

            {status === "completed" && (
              <button onClick={downloadFile} className={styles.downloadButton}>
                Download Modified ZIP
              </button>
            )}

            {status === "error" && (
              <div className={styles.errorDetails}>
                <p className={styles.error}>
                  An error occurred during processing.
                </p>
                <button
                  onClick={() => {
                    // Try checking status again
                    startStatusCheck(jobId);
                  }}
                  className={styles.retryButton}
                >
                  Retry Status Check
                </button>

                <button
                  onClick={downloadFile}
                  className={styles.downloadButton}
                >
                  Try Downloading Results Anyway
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setJobId(null);
                setStatus(null);
              }}
              className={styles.newJobButton}
            >
              Start New Job
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
