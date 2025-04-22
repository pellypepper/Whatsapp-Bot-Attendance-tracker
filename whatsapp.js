function doPost(e) {
    try {
      
      
    
      var Body = "";
      var From = "";
      
      // Check if the request is JSON format
      if (e.postData && e.postData.type === "application/json") {
        var jsonData = JSON.parse(e.postData.contents);
        Body = jsonData.Body || "";
        From = jsonData.From || "";
       
      }
      // Check if the request is form-urlencoded format
      else if (e.postData && e.postData.type === "application/x-www-form-urlencoded") {
        var formData = e.postData.contents;
        var params = formData.split('&');
        for (var i = 0; i < params.length; i++) {
          var param = params[i].split('=');
          if (param[0] === "Body") {
            Body = decodeURIComponent(param[1].replace(/\+/g, ' '));
          } else if (param[0] === "From") {
            From = decodeURIComponent(param[1].replace(/\+/g, ' '));
          }
        }

      }
      // Check if parameters were passed directly
      else if (e.parameter) {
        Body = e.parameter.Body || "";
        From = e.parameter.From || "";
     
      }
      
     // Check sheet exist or create 
    ensureSheetsExist();
      
      // Process the incoming message
      var responseMessage = processUserMessage(Body, From);
   
      
      // Send the response via Twilio
      if (From) {
        sendWhatsAppResponse(From, responseMessage);
      }
      
     
   
      
  
      // Return TwiML response
      var twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response><Message>' +
                            responseMessage + '</Message></Response>';
      
      return ContentService.createTextOutput(twimlResponse)
                          .setMimeType(ContentService.MimeType.XML);
    } catch (error) {
      console.error("Error in doPost: " + error);
      return ContentService.createTextOutput("Error: " + error.toString())
                          .setMimeType(ContentService.MimeType.TEXT);
    }
  }
  function processUserMessage(message, from) {
    try {
   
  
      const originalMessage = message || "";
      const cleanMessage = originalMessage.trim().toLowerCase();
  
      // Get the current user state
      var userState = getUserState(from);
   
  
      if (!userState) {
      
        updateUserState(from, { lastInteraction: new Date(), awaitingMenuSelection: true, data: null, currentAction: null });
        userState = getUserState(from); // Re-fetch the newly created state
      
      }
  
      // For Postman testing, if message is "reset", reset the user state
      if (cleanMessage === "reset") {
        updateUserState(from, { lastInteraction: new Date(), awaitingMenuSelection: true, data: null, currentAction: null });
        return getWelcomeMessage();
      }
  
      // Handle the case where we're awaiting a menu selection
      if (userState.awaitingMenuSelection === true) {
      
        return handleMenuSelection(cleanMessage, from, userState);
      }
  
      // Handle case where user has an active action
      if (userState.currentAction) {
   
        return handleActionInput(originalMessage.trim(), from, userState);
      }
  
      // Handle standard commands
      if (cleanMessage === "menu" || cleanMessage === "help" || cleanMessage === "") {

     
        updateUserState(from, { awaitingMenuSelection: true });
        return getWelcomeMessage();
      }
  
      // Default fallback - show the menu
     
      updateUserState(from, { awaitingMenuSelection: true });
      return getWelcomeMessage();
    } catch (error) {
  
      return "❌ An error occurred. Please try again.";
    }
  }
  
  function handleMenuSelection(message, from, userState) {
    message = message.trim().toLowerCase();
   
  
    let updatedState = {
      awaitingMenuSelection: false,
      currentAction: null
    };
  
    switch (message) {
      case "1":
        updatedState.currentAction = "check_in";
        Logger.log(`Setting state: currentAction = "check_in" for user: ${from}`);
        updateUserState(from, updatedState);
        return "📝 *Check-In*\n\nPlease enter your name to check in, or just send '1' to check in with your phone number.";
  
      case "2":
        updatedState.currentAction = "check_out";
        Logger.log(`Setting state: currentAction = "check_out" for user: ${from}`);
        updateUserState(from, updatedState);
        return "🔚 *Check-Out*\n\nPlease enter your name to check out, or just send '1' to check out with your phone number.";
  
      case "3":
        updatedState.currentAction = "record_note";
        Logger.log(`Setting state: currentAction = "record_note" for user: ${from}`);
        updateUserState(from, updatedState);
        return "📝 *Record Note*\n\nPlease enter the note you'd like to record.";
  
      case "4":
        Logger.log(`Fetching notes for user: ${from}`);
        var notes = getNotes(from); // Retrieve notes
        updateUserState(from, updatedState);
  
        if (notes && notes.length > 0) {
          const notesList = notes.map((note, index) => `${index + 1}. ${note.date}: ${note.note}`).join("\n");
          return `📋 *Your Notes:*\n\n${notesList}\n\nType *menu* to return to the main menu.`;
        } else {
          return "📋 *No Notes Found*\n\nYou haven't recorded any notes yet.\n\nType *menu* to return to the main menu.";
        }
  
      case "menu":
        Logger.log(`User requested the menu: '${message}'`);
        updatedState.awaitingMenuSelection = true;
        updateUserState(from, updatedState);
        return getWelcomeMessage();
  
      default:
        updateUserState(from, { awaitingMenuSelection: true });
        Logger.log(`Invalid selection: '${message}' for user: ${from}`);
        return `❓ I didn't understand that selection. Please choose a number between 1-4:\n\n${getMenuOptions()}`;
    }
  }
  
  function handleActionInput(message, from, userState) {
    const currentAction = userState.currentAction;
    const timestamp = new Date();
  
    Logger.log(`Handling action for: ${from} | Action: ${currentAction} | Message: ${message}`);
  
    const name = message === "1" ? extractNameFromPhoneNumber(from) : message;
  
    // Reset state
    updateUserState(from, { currentAction: null });
  
    let result;
  
    switch (currentAction) {
      case "check_in":
        Logger.log(`Check-in: Name=${name}`);
        result = recordAttendance(name, from, timestamp, "check-in");
        return result.success
          ? `✅ *Check-In Successful!*\n\nHi ${name}, you've been checked in at ${formatTime(timestamp)}.\n\nType *menu* to see more options.`
          : `❌ *Check-In Failed*\n\nError: ${result.error}\n\nType *menu* to try again.`;
  
      case "check_out":
        Logger.log(`Check-out: Name=${name}`);
        result = recordAttendance(name, from, timestamp, "check-out");
        return result.success
          ? `✅ *Check-Out Successful!*\n\nHi ${name}, you've been checked out at ${formatTime(timestamp)}.\n\nType *menu* to see more options.`
          : `❌ *Check-Out Failed*\n\nError: ${result.error}\n\nType *menu* to try again.`;
  
      case "record_note":
        result = saveNote(from, message, timestamp);
        return result.success
          ? "✅ *Note Recorded!*\n\nYour note has been saved successfully.\n\nType *menu* to see more options."
          : `❌ *Failed to Record Note*\n\nError: ${result.error}\n\nType *menu* to try again.`;
  
      default:
        Logger.log("Unknown or expired action.");
        return getWelcomeMessage();
    }
  }
  
  function recordAttendance(name, phoneNumber, timestamp, type) {
    try {
      Logger.log(`Recording ${type} | Name: ${name} | Phone: ${phoneNumber} | Time: ${timestamp}}`);
  
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheetName = type === "check-in" ? 'whatsapp_checkins' : 'whatsapp_checkouts';
      let sheet = spreadsheet.getSheetByName(sheetName);
  
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        sheet.appendRow(['Timestamp', 'Date', 'Time', 'Name', 'Phone Number', 'Type']);
      }
  
      const dateFormatted = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const timeFormatted = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "HH:mm:ss");
      const cleanPhone = phoneNumber.replace('whatsapp:', '');
  
      sheet.appendRow([
        timestamp,
        dateFormatted,
        timeFormatted,
        name,
        cleanPhone,
        type,
      ]);
  
      Logger.log("Row appended successfully.");
      return { success: true };
    } catch (error) {
      Logger.log(`Error in recordAttendance: ${error.stack}`);
      return { success: false, error: error.toString() };
    }
  }
  
  
  // function locationCheck(message) {
  //   const coordRegex = /(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/;
  //   const match = message.match(coordRegex);
  //   if (match) {
  //     const [_, lat, lng] = match;
  //     return { latitude: lat.trim(), longitude: lng.trim() };
  //   }
  //   return null;
  // }
  
  
  function testHandleCheckInWithLocation() {
    const fakeUserState = { currentAction: "check_in" };
    const phone = "whatsapp:+441234567890";
    const latLng = "51.5074,-0.1278"; // London
  
    const result = handleActionInput(latLng, phone, fakeUserState);
    Logger.log("Test result for Check-In with Location:\n" + result);
  }
  
  function testHandleCheckOutWithName() {
    const fakeUserState = { currentAction: "check_out" };
    const phone = "whatsapp:+441234567890";
    const name = "John Doe";
  
    const result = handleActionInput(name, phone, fakeUserState);
    Logger.log("Test result for Check-Out with Name:\n" + result);
  }
  
  function testLocationParsing() {
    Logger.log("Should be valid:", locationCheck("40.7128,-74.0060"));
    Logger.log("Should be null:", locationCheck("hello world"));
  }
  
  
  
  
  function getWelcomeMessage() {
    var message = "👋 *Welcome to the Tobros Security Ltd!*\n\n";
    message += "I can help you check in/out and manage notes. Please select an option by sending the corresponding number:\n\n";
    message += getMenuOptions();
    
    return message;
  }
  
  function doGet(e) {
    return ContentService.createTextOutput("WhatsApp webhook is running. Please use POST requests to interact with the service.")
                        .setMimeType(ContentService.MimeType.TEXT);
  }
  
  // Add a test function to manually verify the system
  function testWhatsAppFlow() {
    // Simulate an incoming message
    var testMessage = {
      parameter: {
        Body: "menu",
        From: "whatsapp:+1234567890"
      }
    };
    
    // Process the test message
    var response = doPost(testMessage);
    Logger.log("Test response: " + response.getContent());
  }
  
  // Add an onOpen trigger to add menu items for testing
  function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('WhatsApp Assistant')
      .addItem('Test WhatsApp Flow', 'testWhatsAppFlow')
      .addItem('Ensure Sheets Exist', 'ensureSheetsExist')
      .addToUi();
  }
  
  /**
   * Returns formatted menu options
   */
  function getMenuOptions() {
    return "1️⃣ *Check In* - Record your arrival\n" +
           "2️⃣ *Check Out* - Record your departure\n" +
           "3️⃣ *Record Note* - Save a note\n" +
           "4️⃣ *Check Notes* - View your saved notes";
  }
  
  /**
   * Format time in a user-friendly way
   */
  function formatTime(date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "h:mm a 'on' MMMM d, yyyy");
  }
  
  /**
   * Get user's current state
   */
  function getUserState(phoneNumber) {
    try {
      if (!phoneNumber) {
        throw new Error("Phone number is missing.");
      }
  
      Logger.log("🔍 Fetching user state for: " + phoneNumber);
      
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = spreadsheet.getSheetByName('user_states');
  
      if (!sheet) {
        Logger.log("❌ 'user_states' sheet not found.");
        return null;
      }
  
      const cleanPhone = phoneNumber.replace('whatsapp:', '').replace('+', '');
      Logger.log("✅ Cleaned phone number: " + cleanPhone);
  
      const data = sheet.getDataRange().getValues();
      
      let mostRecentState = null;
      let mostRecentDate = null;
  
      for (let i = 1; i < data.length; i++) {
        const rowPhone = String(data[i][0]).trim();
        const rowDate = new Date(data[i][1]);
  
        if (rowPhone === cleanPhone) {
          if (!mostRecentDate || rowDate > mostRecentDate) {
            mostRecentDate = rowDate;
  
            mostRecentState = {
              lastInteraction: data[i][1],
              currentAction: data[i][2] === "" ? null : data[i][2],
              awaitingMenuSelection: String(data[i][3]).toLowerCase() === 'true',
              data: data[i][4] || "" // fallback if undefined
            };
  
            Logger.log("🕐 Found more recent state in row " + (i + 1));
          }
        }
      }
  
      if (mostRecentState) {
        Logger.log("✅ Found state: " + JSON.stringify(mostRecentState));
        return mostRecentState;
      } else {
        Logger.log("⚠️ No existing state found for user.");
        return null;
      }
  
    } catch (error) {
      Logger.log("🚨 Error in getUserState: " + error.stack);
      return null;
    }
  }
  
  
  
  /**
   * Update user state
   */
  
  
  function updateUserState(phoneNumber, stateUpdates) {
    try {
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = spreadsheet.getSheetByName('user_states');
      
      if (!sheet) {
        Logger.log("Sheet 'user_states' does not exist. Creating it...");
        sheet = spreadsheet.insertSheet('user_states');
        sheet.appendRow(['Phone Number', 'Last Interaction', 'Current Action', 'Awaiting Menu Selection', 'Data']);
      }
  
      var cleanPhone = phoneNumber.replace('whatsapp:', '').replace('+', '');
      Logger.log("Getting current state for: " + cleanPhone);
      var currentState = getUserState(phoneNumber);
      Logger.log("Current state: " + JSON.stringify(currentState));
  
      var newState = {
        lastInteraction: new Date(),
        currentAction: stateUpdates.currentAction !== undefined ? stateUpdates.currentAction : (currentState ? currentState.currentAction : null),
        awaitingMenuSelection: stateUpdates.awaitingMenuSelection !== undefined ? stateUpdates.awaitingMenuSelection : (currentState ? currentState.awaitingMenuSelection : false),
        data: stateUpdates.data !== undefined ? stateUpdates.data : (currentState ? currentState.data : null)
      };
      
      // Convert null to empty string for saving to spreadsheet if needed
      var currentActionValue = newState.currentAction === null ? "" : newState.currentAction;
      
      Logger.log("New state to save: " + JSON.stringify(newState));
      
      // ALWAYS create a new row for state updates to avoid confusion
      sheet.appendRow([
        cleanPhone,
        newState.lastInteraction,
        currentActionValue, // Use the converted value
        String(newState.awaitingMenuSelection), // Convert boolean to string
        newState.data
      ]);
      Logger.log("New state row added for: " + phoneNumber);
      
      // Clean up old states every time we update
      cleanupUserStates();
  
      return { success: true };
    } catch (error) {
      Logger.log("Error in updateUserState: " + error.message);
      return { success: false, error: error.message };
    }
  }
  
  
  function cleanupUserStates() {
    try {
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = spreadsheet.getSheetByName('user_states');
      
      if (!sheet) {
        Logger.log("Sheet 'user_states' does not exist.");
        return;
      }
      
      var data = sheet.getDataRange().getValues();
      var phoneMap = {};
      var rowsToDelete = [];
      
      // Identify most recent entry for each phone number
      for (var i = 1; i < data.length; i++) {
        var phone = String(data[i][0]).trim();
        var date = new Date(data[i][1]);
        
        if (!phoneMap[phone] || date > phoneMap[phone].date) {
          phoneMap[phone] = {
            row: i + 1,
            date: date
          };
        }
      }
      
      // Identify rows to delete (anything that's not the most recent for a phone)
      for (var i = 1; i < data.length; i++) {
        var phone = String(data[i][0]).trim();
        if (phoneMap[phone] && phoneMap[phone].row !== i + 1) {
          rowsToDelete.push(i + 1);
        }
      }
      
      // Delete rows in reverse order to avoid shifting issues
      rowsToDelete.sort(function(a, b) { return b - a; });
      for (var i = 0; i < rowsToDelete.length; i++) {
        sheet.deleteRow(rowsToDelete[i]);
      }
      
      Logger.log("Cleanup complete. Removed " + rowsToDelete.length + " duplicate entries.");
    } catch (error) {
      Logger.log("Error in cleanupUserStates: " + error.message);
    }
  }
  
  function testAppendRow() {
    try {
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = spreadsheet.getSheetByName('user_states') || spreadsheet.insertSheet('user_states');
      sheet.appendRow(['447542955386', new Date(), null, 'true', null]);
      Logger.log("Row appended successfully.");
      var updatedData = sheet.getDataRange().getValues();
      Logger.log("Updated sheet data: " + JSON.stringify(updatedData));
    } catch (error) {
      Logger.log("Error in testAppendRow: " + error.message);
    }
  }
  function saveNote(phoneNumber, noteText, timestamp) {
    try {
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      // FIXED: Use consistent sheet name between save and retrieve functions
      var sheet = spreadsheet.getSheetByName('user_notes');
      
      if (!sheet) {
        sheet = spreadsheet.insertSheet('user_notes');
        sheet.appendRow(['Timestamp', 'Date', 'Time', 'Phone Number', 'Note']);
      }
      
      // Clean phone number
      var cleanPhone = phoneNumber.replace('whatsapp:', '').replace('+', '');
      
      // Format date and time
      var dateFormatted = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd");
      var timeFormatted = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "HH:mm:ss");
      
      // Append the note to the sheet
      sheet.appendRow([timestamp, dateFormatted, timeFormatted, cleanPhone, noteText]);
      
      return { success: true };
    } catch (error) {
      Logger.log('Error in saveNote: ' + error.stack);
      return { success: false, error: error.toString() };
    }
  }
  /**
   * Get notes for a user
   */
  function getNotes(phoneNumber) {
    try {
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = spreadsheet.getSheetByName('user_notes');
      
      if (!sheet) {
        console.log('Sheet not found');
        return [];
      }
      
      // Clean phone number (remove 'whatsapp:' and '+')
      var cleanPhone = phoneNumber.replace('whatsapp:', '').replace('+', '');
      console.log('Looking for notes with phone number: ' + cleanPhone);
      
      // Get notes
      var data = sheet.getDataRange().getValues();
      var notes = [];
      
      // Log headers to verify column structure
      console.log('Headers: ' + data[0].join(', '));
      
      for (var i = 1; i < data.length; i++) {
        // Log the current row's phone number for debugging
        console.log('Row ' + i + ' phone: ' + data[i][3] + ' vs ' + cleanPhone);
        
        // Use trim() to remove any potential whitespace
        if (String(data[i][3]).trim() === cleanPhone.trim()) {
          notes.push({
            timestamp: data[i][0],
            date: Utilities.formatDate(new Date(data[i][0]), Session.getScriptTimeZone(), "MMM d, yyyy h:mm a"),
            note: data[i][4]
          });
          console.log('Note found: ' + data[i][4]);
        }
      }
      
      console.log('Total notes found: ' + notes.length);
      return notes;
    } catch (error) {
      console.error('Error in getNotes: ' + error.stack);
      return [];
    }
  }
  
  
  function extractNameFromPhoneNumber(phoneNumber) {
    // Remove the whatsapp: prefix if present
    phoneNumber = phoneNumber.replace('whatsapp:', '');
    return phoneNumber; // Using phone number as name if no name provided
  }
  function ensureSheetsExist() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Create user_states sheet if it doesn't exist
    if (!spreadsheet.getSheetByName('user_states')) {
      var statesSheet = spreadsheet.insertSheet('user_states');
      statesSheet.appendRow(['Phone Number', 'Last Interaction', 'Current Action', 'Awaiting Menu Selection', 'Data']);
      Logger.log("Created user_states sheet");
    }
    
    // Create user_notes sheet if it doesn't exist
    if (!spreadsheet.getSheetByName('user_notes')) {
      var notesSheet = spreadsheet.insertSheet('user_notes');
      notesSheet.appendRow(['Timestamp', 'Date', 'Time', 'Phone Number', 'Note']);
      Logger.log("Created user_notes sheet");
    }
    
    // Create check-in and check-out sheets if they don't exist
    if (!spreadsheet.getSheetByName('whatsapp_checkins')) {
      var checkinsSheet = spreadsheet.insertSheet('whatsapp_checkins');
      checkinsSheet.appendRow(['Timestamp', 'Date', 'Time', 'Name', 'Phone Number']);
      Logger.log("Created whatsapp_checkins sheet");
    }
    
    if (!spreadsheet.getSheetByName('whatsapp_checkouts')) {
      var checkoutsSheet = spreadsheet.insertSheet('whatsapp_checkouts');
      checkoutsSheet.appendRow(['Timestamp', 'Date', 'Time', 'Name', 'Phone Number']);
      Logger.log("Created whatsapp_checkouts sheet");
    }
  }
  
  
  // function recordAttendance(name, phoneNumber, timestamp, type) {
  //   try {
  //     Logger.log(`Recording ${type} | Name: ${name} | Phone: ${phoneNumber} | Time: ${timestamp}}`);
  
  //     const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  //     const sheetName = type === "check-in" ? 'whatsapp_checkins' : 'whatsapp_checkouts';
  //     let sheet = spreadsheet.getSheetByName(sheetName);
  
  //     if (!sheet) {
  //       sheet = spreadsheet.insertSheet(sheetName);
  //       sheet.appendRow(['Timestamp', 'Date', 'Time', 'Name', 'Phone Number', 'Type']);
  //     }
  
  //     const dateFormatted = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd");
  //     const timeFormatted = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "HH:mm:ss");
  //     const cleanPhone = phoneNumber.replace('whatsapp:', '');
  
  //     sheet.appendRow([
  //       timestamp,
  //       dateFormatted,
  //       timeFormatted,
  //       name,
  //       cleanPhone,
  //       type,
  //     ]);
  
  //     Logger.log("Row appended successfully.");
  //     return { success: true };
  //   } catch (error) {
  //     Logger.log(`Error in recordAttendance: ${error.stack}`);
  //     return { success: false, error: error.toString() };
  //   }
  // }
  
  
  
  function sendWhatsAppResponse(to, message) {
    var twilioSid = 'ACd21e0decb081c0aa5f95c883a37bbf6f';  // Replace with your actual SID
    var twilioAuthToken = '0cfe3349218fc5cd533d246929a2f165';  // Replace with your actual token
    var from = 'whatsapp:+14155238886';  // Your Twilio WhatsApp number
    
    // Make sure 'to' has whatsapp: prefix if it doesn't already
    if (!to.startsWith('whatsapp:')) {
      to = 'whatsapp:' + to;
    }
    
    var payload = {
      "To": to,
      "From": from,
      "Body": message
    };
    
    var options = {
      "method": "post",
      "contentType": "application/x-www-form-urlencoded",
      "payload": payload,
      "muteHttpExceptions": true,
      "headers": {
        "Authorization": "Basic " + Utilities.base64Encode(twilioSid + ":" + twilioAuthToken)
      }
    };
    
    try {
      var response = UrlFetchApp.fetch("https://api.twilio.com/2010-04-01/Accounts/" + twilioSid + "/Messages.json", options);
      var responseCode = response.getResponseCode();
      var responseText = response.getContentText();
      
      return {success: true, response: responseText};
    } catch (e) {
      return {success: false, error: e.toString()};
    }
  }