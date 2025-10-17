const extractLocalTimeSimple = (dateTimeString) => {
  try {
    const match = dateTimeString.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
    
    if (match) {
      const [_, date, time] = match;
      const simpleDateTime = `${date} ${time}`;
      
      console.log("🕐 Hora extraída (simple):", simpleDateTime);
      return simpleDateTime;
    }
    
    console.error("❌ No se pudo extraer hora del formato:", dateTimeString);
    return dateTimeString;
  } catch (error) {
    console.error("❌ Error extrayendo hora:", error);
    return dateTimeString;
  }
}

export default extractLocalTimeSimple;
