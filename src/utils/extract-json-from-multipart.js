const extractJsonFromMultipart = ( body, boundary ) => {
  try {
    const bodyStr = body.toString('utf8');
    const parts = bodyStr.split(`--${boundary}`);
    
    for (const part of parts) {
      if (part.includes('"event_log"') || part.includes('AccessControllerEvent')) {
        const jsonStart = part.indexOf('\r\n\r\n');
        if (jsonStart !== -1) {
          let jsonStr = part.substring(jsonStart + 4);
          jsonStr = jsonStr.replace(/\r\n--.*$/s, '').trim();
          
          try {
            return JSON.parse(jsonStr);
          } catch (e) {
            console.log("⚠️ Error parseando JSON extraído:", e.message);
          }
        }
      }
    }
  } catch (error) {
    console.log("❌ Error extrayendo JSON del multipart:", error.message);
  }
  return null;
}

export default extractJsonFromMultipart;
